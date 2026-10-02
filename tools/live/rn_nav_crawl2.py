"""Provider app UI crawl v2 (react-native-web export in Chromium; NOT a physical device).

Replaces rn_nav_crawl.py, whose tap-path replay failed on slow screens (doctor 21/29, lab 29/42 states failed).
Changes:
  * Screen identity and re-entry use the app's navigation ref, exposed only in E2E builds
    (EXPO_PUBLIC_NABD_E2E=1, see provider-app/App.tsx). A screen is re-entered by navigating to its route name +
    params, not by replaying taps.
  * Every screen registered for the provider type (tools/audit/screen_inventory.py) is visited: first the ones
    found by tapping (real user paths), then the rest directly by name ("DIRECT"), so none is skipped silently.
  * Readiness is condition-based (wait_ready): no in-flight backend requests, no visible loading indicator,
    and stable content, with adaptive polling and a configurable timeout. Fixed sleeps are gone.
  * Failures are classified: CRAWLER (control not found / harness), APP_JS_ERROR, APP_HTTP_ERROR (>=400 reads),
    NETWORK (requests failed), SLOW (not ready within the budget: still loading), NEEDS_PARAMS (screen needs an
    id it can only get from a real record). Each failure keeps a screenshot, visible controls and pending requests.
  * Per screen it records time-to-ready (ms) for the performance audit.

Build: cd provider-app && NABD_WEB_TEST=1 EXPO_PUBLIC_NABD_E2E=1 EXPO_PUBLIC_APP_ENV=development \
         EXPO_PUBLIC_API_BASE_URL=http://localhost:8002/api/v1 EXPO_PUBLIC_API_URL=http://localhost:8002 \
         npx expo export --platform web --clear --output-dir /tmp/pv-web5     (serve with SPA fallback on :8082)
Run:   PTYPE=doctor EMAIL=... PASSWORD=... python3 tools/live/rn_nav_crawl2.py
Env:   READY_TIMEOUT_MS (default 15000), MAX_TAPS (25), TAP_BUDGET_S (240), SUFFIX, ONLY=route1,route2
Writes docs/review/evidence/rn_nav2_provider-app_<type>_<date>[_SUFFIX].json
"""
import datetime, hashlib, json, os, re, subprocess, time, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
WEB = os.environ.get('WEB', 'http://localhost:8082')
DB = os.environ.get('DB_NAME', 'nabd_form2')
PTYPE = os.environ['PTYPE']
READY_TIMEOUT_MS = int(os.environ.get('READY_TIMEOUT_MS', '15000'))
MAX_TAPS = int(os.environ.get('MAX_TAPS', '25'))
TAP_BUDGET_S = int(os.environ.get('TAP_BUDGET_S', '240'))
ONLY = [x for x in os.environ.get('ONLY', '').split(',') if x]
NAV_FILE = {'doctor': 'doctor/doctor/DoctorDashboardNavigator.tsx', 'hospital': 'facility/facility/FacilityDashboardNavigator.tsx',
            'facility': 'facility/facility/FacilityDashboardNavigator.tsx', 'lab': 'lab/LabDashboard.tsx',
            'home_care': 'nursing/NursingDashboard.tsx', 'nursing': 'nursing/NursingDashboard.tsx',
            'pharmacy': 'pharmacy/PharmacyDashboard.tsx', 'radiology': 'radiology/RadiologyDashboard.tsx',
            'ambulance': 'ambulance/AmbulanceDashboard.tsx'}
DANGER = re.compile(r'حذف|تسجيل الخروج|خروج|logout|sign out|delete|إيقاف|حظر|block|إلغاء الحساب|تعطيل الحساب|EN$|English|العربية', re.I)
SUBMIT = re.compile(r'حفظ|إرسال|تأكيد|أضف|إضافة|اعتماد|قبول|رفض|بدء|إنهاء|تحديث|Save|Submit|Confirm|Add|Accept|Reject|Start|Finish|Update', re.I)
TAPPABLE = '[tabindex="0"]:visible, button:visible, [role="button"]:visible, [role="switch"]:visible, [role="checkbox"]:visible, [role="radio"]:visible, [role="tab"]:visible, a[href]:visible'
LOADING = '[role="progressbar"]:visible, [aria-busy="true"]:visible'
BLOCK = re.compile(r'/auth/logout$|/users/me$|/users/me/account$|/account/delete|/emergency|/sos|/ambulance/requests?$', re.I)
SNAP_JS = "() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))"
RESTORE_JS = "(s) => { const o = JSON.parse(s); localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); }"

# --- navigation helpers evaluated in the page (window.__NABD_NAV__ is the app's navigation container ref) ---
NAV_CURRENT = """() => { const n = window.__NABD_NAV__; if (!n || !n.isReady()) return null;
  const r = n.getCurrentRoute(); return r ? { name: r.name, params: r.params || null } : null; }"""
NAV_KNOWN = """() => { const n = window.__NABD_NAV__; if (!n || !n.isReady()) return [];
  const out = new Set(); const walk = (s) => { if (!s) return; (s.routeNames || []).forEach(x => out.add(x));
  (s.routes || []).forEach(r => walk(r.state)); }; walk(n.getRootState()); return [...out]; }"""
NAV_GO = """([target, params]) => { const n = window.__NABD_NAV__; if (!n || !n.isReady()) return 'not_ready';
  const find = (s) => { if (!s) return null; if ((s.routeNames || []).includes(target)) return [target];
    for (const r of (s.routes || [])) { const p = find(r.state); if (p) return [r.name, ...p]; } return null; };
  const path = find(n.getRootState()); if (!path) return 'unknown_route';
  let arg = params || undefined;
  for (let i = path.length - 1; i > 0; i--) arg = { screen: path[i], params: arg, initial: false };
  n.navigate(path[0], arg); return 'ok'; }"""


def mongo(js):
    return subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js], capture_output=True, text=True).stdout


def changed_since(ms):
    return mongo(f'''const t=new Date({ms}); const out=[]; for (const c of db.getCollectionNames()) {{
      if (/^(system\\.|mail_log|auditlogs|audit_logs|request_log|search_queries|product_views|system_events|sessions|provider_presence)/.test(c)) continue;
      const d=db.getCollection(c).find({{$or:[{{updatedAt:{{$gte:t}}}},{{createdAt:{{$gte:t}}}},{{updated_at:{{$gte:t}}}},{{created_at:{{$gte:t}}}}]}}).limit(20).toArray();
      if (d.length) out.push({{c,d}}); }} print(JSON.stringify(out));''')


def registered_screens():
    inv = json.load(open(os.path.join(ROOT, 'docs/review/inventory/screens.json'))) if os.path.exists(os.path.join(ROOT, 'docs/review/inventory/screens.json')) else None
    if inv is None:
        subprocess.run(['python3', 'tools/audit/screen_inventory.py', '/tmp/inv'], cwd=ROOT, capture_output=True)
        inv = json.load(open('/tmp/inv/screens.json'))
    nav = NAV_FILE[PTYPE]
    return [s['name'] for s in inv['provider-app']['registered_screens'] if s['navigator_file'].endswith(nav)]


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None,
                           args=['--host-resolver-rules=MAP localhost 127.0.0.1', '--disable-dev-shm-usage'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar-SA')
    ctx.route('https://1.1.1.1/**', lambda r: r.fulfill(status=200, body=''))
    page = ctx.new_page()
    page.set_default_timeout(5000)
    ev = {'js': [], 'resp': [], 'writes': [], 'blocked': [], 'inflight': {}, 'failed': []}

    def guard(route):
        req = route.request
        path = re.sub(r'^https?://[^/]+(/api/v1)?', '', req.url.split('?')[0])
        if req.method != 'GET' and BLOCK.search(path):
            ev['blocked'].append(f'{req.method} {path}')
            return route.fulfill(status=200, content_type='application/json', body='{}')
        return route.continue_()
    ctx.route('**/api/v1/**', guard)
    page.on('pageerror', lambda e: ev['js'].append(str(e)[:200]))
    page.on('dialog', lambda d: d.accept())
    page.on('request', lambda r: ev['inflight'].__setitem__(id(r), r.url) if ':8002/' in r.url else None)
    page.on('requestfinished', lambda r: ev['inflight'].pop(id(r), None))

    def on_failed(r):
        if ev['inflight'].pop(id(r), None):
            ev['failed'].append(f'{r.method} {r.url[:100]} {r.failure}')
    page.on('requestfailed', on_failed)

    def on_resp(r):
        if ':8002/' not in r.url:
            return
        u = re.sub(r'^https?://[^/]+/api/v1', '', r.url.split('?')[0])
        ev['resp'].append((r.status, r.request.method, u, int(time.time() * 1000)))
        if r.request.method in ('POST', 'PUT', 'PATCH', 'DELETE') and 'heartbeat' not in u:
            ev['writes'].append({'status': r.status, 'method': r.request.method, 'url': u, 'body': (r.request.post_data or '')[:1500]})
    page.on('response', on_resp)
    # A request counts as settled once its response arrives: fire-and-forget beacons (the website's presence
    # heartbeat never reads its body) never emit 'requestfinished' in Playwright, which kept pages "busy" for the
    # whole timeout (measured: heartbeat answers in ~50 ms in-page).
    page.on('response', lambda r: ev['inflight'].pop(id(r.request), None))


    def body_hash():
        try:
            return hashlib.md5((page.inner_text('body', timeout=2000) or '').encode()).hexdigest()
        except Exception:
            return ''

    def wait_ready(timeout_ms=READY_TIMEOUT_MS):
        """Ready = no backend request in flight, no visible loading indicator, and the text unchanged over
        two consecutive polls. Polls at 150 ms, backing off to 600 ms. Returns (ready, waited_ms, why_not)."""
        t0 = time.time(); last = None; stable = 0; delay = 0.15
        while True:
            busy = len(ev['inflight'])
            try:
                loading = page.locator(LOADING).count()
            except Exception:
                loading = 0
            h = body_hash()
            stable = stable + 1 if (h == last and h) else 0
            last = h
            if busy == 0 and loading == 0 and stable >= 2:
                return True, int((time.time() - t0) * 1000), ''
            waited = int((time.time() - t0) * 1000)
            if waited >= timeout_ms:
                why = [f'{busy} request(s) in flight: ' + ', '.join(list(ev['inflight'].values())[:3])] if busy else []
                why += [f'{loading} loading indicator(s) visible'] if loading else []
                why += ['content still changing'] if stable < 2 else []
                return False, waited, '; '.join(why)
            time.sleep(delay); delay = min(delay * 1.5, 0.6)

    def current():
        try:
            return page.evaluate(NAV_CURRENT)
        except Exception:
            return None

    def tappables():
        out = []
        for idx, el in enumerate(page.locator(TAPPABLE).all()[:90]):
            try:
                t = ((el.inner_text(timeout=300) or el.get_attribute('aria-label') or el.get_attribute('data-testid') or '').strip().split('\n')[0])[:40]
            except Exception:
                continue
            out.append((t or f'(icon #{idx})', idx))
        return out

    def click(label, idx, wait_s=6):
        deadline = time.time() + wait_s
        while True:
            target = None
            if label.startswith('(icon #'):
                cands = page.locator(TAPPABLE)
                if idx < cands.count():
                    target = cands.nth(idx)
            else:
                for t2, i2 in tappables():
                    if t2 == label:
                        target = page.locator(TAPPABLE).nth(i2); break
            if target is not None or time.time() >= deadline:
                break
            time.sleep(0.3)
        if target is None:
            raise LookupError(f'control not found: {label}')
        try:
            target.scroll_into_view_if_needed(timeout=1500)
        except Exception:
            pass
        try:
            target.click(timeout=2500, force=True)
        except Exception:
            target.dispatch_event('click')

    def classify_failure(kind_hint, err=''):
        if ev['js']:
            return 'APP_JS_ERROR'
        if ev['failed']:
            return 'NETWORK'
        bad = [r for r in ev['resp'] if r[0] >= 400 and r[1] == 'GET']
        if bad and kind_hint != 'CRAWLER':
            return 'APP_HTTP_ERROR'
        return kind_hint

    def diag(tag):
        shot = f'/tmp/nav2_{PTYPE}_{tag}.png'
        try:
            page.screenshot(path=shot)
        except Exception:
            shot = None
        return {'screenshot': shot, 'controls_now': [t for t, _ in tappables()][:25], 'route_now': current(),
                'pending': list(ev['inflight'].values())[:5], 'failed_requests': ev['failed'][:5], 'js': ev['js'][:3],
                'bad_reads': sorted({f'{s} {m} {u}' for s, m, u, _ in ev['resp'] if s >= 400})[:6]}

    # ---- sign in through the real Welcome -> Login screens ----
    t_boot = time.time()
    page.goto(WEB + '/', wait_until='load', timeout=60000)
    ok, boot_ms, _ = wait_ready(30000)
    page.locator(TAPPABLE, has_text='سجّل الدخول').last.click(force=True); wait_ready()
    ins = page.locator('input:visible').all()
    ins[0].fill(os.environ['EMAIL']); ins[-1].fill(os.environ['PASSWORD'])
    t_login = time.time()
    page.locator(TAPPABLE, has_text='تسجيل الدخول').last.click(force=True)
    for _ in range(80):
        if current() and current()['name'] not in ('Login', 'Welcome'):
            break
        time.sleep(0.25)
    ok_home, home_ms, home_why = wait_ready(30000)
    login_ok = any(m == 'POST' and u.endswith('/provider/auth/login') and s < 300 for s, m, u, _ in ev['resp'])
    report = {'provider_type': PTYPE, 'login_via_ui': login_ok, 'build': 'rn-web E2E export (not native)',
              'perf': {'app_boot_to_ready_ms': boot_ms, 'login_to_dashboard_ready_ms': int((time.time() - t_login) * 1000),
                       'dashboard_ready': ok_home, 'dashboard_not_ready_reason': home_why},
              'screens': [], 'registered': registered_screens()}
    outp = os.path.join(ROOT, 'docs/review/evidence', f"rn_nav2_provider-app_{PTYPE}_{datetime.date.today().isoformat()}{('_' + os.environ['SUFFIX']) if os.environ.get('SUFFIX') else ''}.json")

    def recover():
        """The app crashed (white screen) or lost its navigator: reload the signed-in app and wait until the
        navigation ref is ready on a signed-in route again."""
        page.goto(WEB + '/', wait_until='load', timeout=60000)
        for _ in range(120):
            c = current()
            if c and c['name'] not in ('Login', 'Welcome'):
                break
            time.sleep(0.25)
        wait_ready(30000)
        report['reloads'] = report.get('reloads', 0) + 1

    def go(name, params, ui_path=(), fresh=False):
        """Open a route (+ in-screen path). fresh=True reloads the app first: re-navigating to an already
        mounted route keeps its internal state (filters, open sheets), which made replays miss controls."""
        ev['js'].clear(); ev['resp'].clear(); ev['failed'].clear()
        if fresh or not current():
            recover()
            ev['js'].clear(); ev['resp'].clear(); ev['failed'].clear()
        r = page.evaluate(NAV_GO, [name, params])
        if r == 'not_ready':
            recover(); r = page.evaluate(NAV_GO, [name, params])
        if r != 'ok':
            return False, r, 0
        for _ in range(40):
            c = current()
            if c and c['name'] == name:
                break
            time.sleep(0.1)
        ready, ms, why = wait_ready()
        for lbl, idx in ui_path:           # in-screen state (tab/section) reached by taps inside the screen
            click(lbl, idx, wait_s=8)
            ready, ms2, why = wait_ready()
            ms += ms2
        return ready, why, ms

    def ui_sig(name):
        labels = sorted({t for t, _ in tappables() if t and not t.startswith('(icon #') and not re.fullmatch(r'[\d\s.,٠-٩:]+', t)})
        return name + '|' + hashlib.md5('|'.join(labels).encode()).hexdigest()[:10]

    discovered = {}          # route name -> params seen when reached by a real tap
    queue = []               # route names to test, in discovery order
    home = current()
    if home:
        discovered[home['name']] = home.get('params'); queue.append((home['name'], ()))
    tested = set(); seen_sigs = set()
    MAX_UI_DEPTH = int(os.environ.get('MAX_UI_DEPTH', '2'))
    # In-screen states per route are capped: list rows (one per medicine/order) open the same sheet, so exploring
    # every row repeats the same controls. Routes themselves are never capped.
    MAX_SUBSTATES = int(os.environ.get('MAX_SUBSTATES', '8'))
    substates = {}
    tag_run = 'V' + uuid.uuid4().hex[:5].upper()

    def fill():
        n = 0
        for el in page.locator('input:visible, textarea:visible').all()[:25]:
            try:
                if not el.is_editable():
                    continue
                kind = (el.get_attribute('type') or 'text').lower()
                if kind == 'password':
                    continue
                n += 1
                mode = (el.get_attribute('inputmode') or '').lower()
                v = (f'{tag_run.lower()}{n}@ui.nabd.test' if kind == 'email' else str(40 + n) if kind == 'number' or mode in ('numeric', 'decimal')
                     else f'+9665{n:08d}' if kind == 'tel' or mode == 'tel' else f'{tag_run}{n:02d}')
                el.fill(v)
            except Exception:
                continue
        return n

    def test_screen(name, how, ui_path=()):
        params = discovered.get(name)
        try:
            ready, why, ms = go(name, params, ui_path, fresh=bool(ui_path))
        except LookupError as e:
            return {'route': name, 'ui_path': [l for l, _ in ui_path], 'reached_by': how, 'status': 'CRAWLER_TARGET_MISSING', 'reason': str(e)[:80], **diag(f'{name}_ui')}
        cur = current()
        if cur is None:          # the app crashed while opening the screen
            crash = {'route': name, 'ui_path': [l for l, _ in ui_path], 'reached_by': how, 'params': params,
                     'status': 'NEEDS_PARAMS' if (how == 'DIRECT' and not params) else 'APP_JS_ERROR', **diag(f'{name}_crash')}
            recover(); return crash
        sig = ui_sig(name)
        if ui_path and sig in seen_sigs:
            return None
        seen_sigs.add(sig)
        entry = {'route': name, 'ui_path': [l for l, _ in ui_path], 'reached_by': how, 'params': params, 'time_to_ready_ms': ms}
        if why in ('unknown_route', 'not_ready'):
            entry.update({'status': 'NOT_REACHABLE', 'reason': f'navigator not mounted for this route ({why})'}); return entry
        if not cur or cur['name'] != name:
            entry.update({'status': 'NOT_REACHABLE', 'reason': f"navigation ended on {cur and cur['name']}", **diag(f'{name}_nav')}); return entry
        if not ready:
            kind = classify_failure('SLOW')
            entry.update({'status': kind, 'reason': why, **diag(f'{name}_ready')})
            if kind == 'SLOW':
                return entry
        js0, bad0 = list(ev['js']), sorted({f'{s} {m} {u}' for s, m, u, _ in ev['resp'] if s >= 400 and m == 'GET'})
        entry['render'] = {'js': js0, 'bad_reads': bad0, 'heading': (page.inner_text('body') or '')[:60].replace('\n', ' | ')}
        if how == 'DIRECT' and not params and (bad0 or js0) and re.search(r'detail|order|booking|mission|report|review|edit|chat|handover|complete|visit|checkin|checklist|progress', name, re.I):
            entry['needs_params'] = True
        n_inputs = fill()
        labels, seen_l = [], set()
        for t, idx in tappables():
            if t not in seen_l:
                seen_l.add(t); labels.append((t, idx))
        elements = []; t_state = time.time()
        for t, idx in labels[:MAX_TAPS]:
            if time.time() - t_state > TAP_BUDGET_S:
                elements.append({'label': '(time budget reached)', 'result': 'NOT_TESTED'}); break
            if DANGER.search(t):
                elements.append({'label': t, 'result': 'SKIPPED_DESTRUCTIVE'}); continue
            try:
                c = current()
                if not c or c['name'] != name or ui_sig(name) != sig:
                    go(name, params, ui_path, fresh=True)
                    if SUBMIT.search(t):
                        fill()
                before = body_hash()
                try:
                    _el = page.locator(TAPPABLE).nth(idx)
                    disabled = _el.get_attribute('aria-disabled') == 'true' or _el.get_attribute('disabled') is not None
                except Exception:
                    disabled = None
                ev['writes'].clear(); ev['js'].clear(); ev['blocked'].clear(); ev['failed'].clear()
                t0 = int(time.time() * 1000) - 50
                snap = page.evaluate(SNAP_JS)
                tc = time.time()
                click(t, idx)
                ready2, ms2, why2 = wait_ready(8000)
                resp_ms = int((time.time() - tc) * 1000)
                if ev['blocked']:
                    page.evaluate(RESTORE_JS, snap)
                    elements.append({'label': t, 'result': 'BLOCKED_DESTRUCTIVE', 'request': ev['blocked'][0]}); continue
                after = current()
                if ev['writes']:
                    stored = changed_since(t0)
                    w = ev['writes'][-1]
                    toks = re.findall(rf'{tag_run}\d\d', ' '.join(x['body'] for x in ev['writes']))
                    res = {'result': 'WRITE', 'status': w['status'], 'method': w['method'], 'url': w['url'],
                           'tokens_sent': len(set(toks)), 'tokens_stored': sum(1 for x in set(toks) if x in stored)}
                elif ev['js']:
                    res = {'result': 'JS_ERROR', 'error': ev['js'][0]}
                elif after and after['name'] != name:
                    res = {'result': 'NAVIGATE', 'to': after['name']}
                    if after['name'] not in discovered:
                        discovered[after['name']] = after.get('params'); queue.append((after['name'], ()))
                elif body_hash() != before:
                    res = {'result': 'UI_CHANGE'}
                    if len(ui_path) < MAX_UI_DEPTH and ui_sig(name) not in seen_sigs and substates.get(name, 0) < MAX_SUBSTATES:
                        substates[name] = substates.get(name, 0) + 1
                        queue.append((name, tuple(ui_path) + ((t, idx),)))
                else:
                    res = {'result': 'NO_EFFECT', 'disabled': disabled}
                res['response_ms'] = resp_ms
                if not ready2:
                    res['slow'] = why2
                elements.append({'label': t, **res})
            except LookupError as e:
                elements.append({'label': t, 'result': 'CRAWLER_TARGET_MISSING', 'error': str(e)[:80]})
            except Exception as e:
                elements.append({'label': t, 'result': 'TAP_FAILED', 'error': str(e)[:80]})
        cnt = {}
        for e in elements:
            cnt[e['result']] = cnt.get(e['result'], 0) + 1
        entry.update({'status': entry.get('status', 'TESTED'), 'inputs_filled': n_inputs, 'elements': elements, 'summary': cnt})
        return entry

    # 1) states reached by real taps (routes and in-screen tabs/sections), 2) every other registered route directly
    while True:
        todo = [q for q in queue if (q[0], q[1]) not in tested and (not ONLY or q[0] in ONLY)]
        how = 'TAP_PATH'
        if not todo:
            done_routes = {r for r, _ in tested}
            rest = [n for n in report['registered'] if n not in done_routes and (not ONLY or n in ONLY)]
            if not rest:
                break
            todo, how = [(rest[0], ())], 'DIRECT'
        name, ui_path = todo[0]
        tested.add((name, ui_path))
        e = test_screen(name, how, ui_path)
        if e is None:
            continue
        report['screens'].append(e)
        state = name + (' > ' + ' > '.join(l[:12] for l, _ in ui_path) if ui_path else '')
        print(f"{state[:44]:44s} {how:8s} {e['status']:14s} ready {e.get('time_to_ready_ms', 0):6d}ms {e.get('summary', '')} {e.get('reason', '')[:50]}", flush=True)
        json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    reg = set(report['registered'])
    report['coverage'] = {'registered': len(reg), 'tested_routes': len({s['route'] for s in report['screens'] if s['status'] == 'TESTED' and s['route'] in reg}),
                          'states_tested': sum(1 for s in report['screens'] if s['status'] == 'TESTED'),
                          'by_status': {k: sum(1 for s in report['screens'] if s['status'] == k) for k in sorted({s['status'] for s in report['screens']})},
                          'routes_tested': sorted({s['route'] for s in report['screens'] if s['status'] == 'TESTED'}),
                          'not_visited': sorted(reg - {r for r, _ in tested})}
    json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    print('coverage', json.dumps(report['coverage'], ensure_ascii=False))
    b.close(); pw.stop()


if __name__ == '__main__':
    main()
