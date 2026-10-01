"""Provider app UI crawl in a real browser (react-native-web export; NOT a physical device).

The provider app uses React Navigation without URL routes, so screens are reached the way a user
reaches them: by tapping. A UI state is identified by its signature (tappable labels + heading);
each state is re-entered by reloading the signed-in app and replaying the tap path from the dashboard.

Build/serve: cd provider-app && NABD_WEB_TEST=1 EXPO_PUBLIC_APP_ENV=development \
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8002/api/v1 EXPO_PUBLIC_API_URL=http://localhost:8002 \
   npx expo export --platform web --clear --output-dir /tmp/pv-web ; serve it with SPA fallback on :8082
Run:  PTYPE=doctor EMAIL=... PASSWORD=... python3 tools/live/rn_nav_crawl.py
The sign-in itself goes through the real Welcome -> Login screens.
The app's connectivity probe (HEAD https://1.1.1.1, defect R38) is answered 200 by the harness.
Per element: WRITE(status, tokens sent/stored) | NAVIGATE(new state) | UI_CHANGE | NO_EFFECT | JS_ERROR | TAP_FAILED
Writes docs/review/evidence/rn_nav_provider-app_<type>_<date>.json
"""
import datetime, hashlib, json, os, re, subprocess, time, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
WEB = os.environ.get('WEB', 'http://localhost:8082')
DB = os.environ.get('DB_NAME', 'nabd_form2')
PTYPE = os.environ['PTYPE']
MAX_STATES = int(os.environ.get('MAX_STATES', '45'))
MAX_DEPTH = int(os.environ.get('MAX_DEPTH', '4'))
MAX_TAPS = int(os.environ.get('MAX_TAPS', '22'))
DANGER = re.compile(r'حذف|تسجيل الخروج|خروج|logout|sign out|delete|إيقاف|حظر|block|إلغاء الحساب|تعطيل الحساب|EN$|English|العربية', re.I)
SUBMIT = re.compile(r'حفظ|إرسال|تأكيد|أضف|إضافة|اعتماد|قبول|رفض|بدء|إنهاء|تحديث|Save|Submit|Confirm|Add|Accept|Reject|Start|Finish|Update', re.I)

# Every control a user can tap: RN-web renders Pressable/Touchable as tabindex=0 divs, but buttons from the
# design system render as <button>/role=button (the first runs counted only tabindex=0 and missed those).
TAPPABLE = '[tabindex="0"]:visible, button:visible, [role="button"]:visible, [role="switch"]:visible, [role="checkbox"]:visible, [role="radio"]:visible, [role="tab"]:visible, a[href]:visible'

# Network-level guard for icon-only controls the label filter cannot see: these requests are answered locally
# (never reach the backend) and the element is reported BLOCKED_DESTRUCTIVE; the session is then restored
# from the localStorage snapshot taken just before the tap.
BLOCK = re.compile(r'/auth/logout$|/users/me$|/users/me/account$|/account/delete|/emergency|/sos|/ambulance/requests?$', re.I)


def install_guard(ctx, ev):
    def handler(route):
        req = route.request
        path = re.sub(r'^https?://[^/]+(/api/v1)?', '', req.url.split('?')[0])
        if req.method != 'GET' and BLOCK.search(path):
            ev['blocked'].append(f'{req.method} {path}')
            return route.fulfill(status=200, content_type='application/json', body='{}')
        return route.continue_()
    ctx.route('**/api/v1/**', handler)


SNAP_JS = "() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))"
RESTORE_JS = "(s) => { const o = JSON.parse(s); localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); }"


def mongo(js):
    return subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js], capture_output=True, text=True).stdout


def changed_since(ms):
    return mongo(f'''const t=new Date({ms}); const out=[]; for (const c of db.getCollectionNames()) {{
      if (/^(system\\.|mail_log|auditlogs|audit_logs|request_log|search_queries|product_views|system_events|sessions|provider_presence)/.test(c)) continue;
      const d=db.getCollection(c).find({{$or:[{{updatedAt:{{$gte:t}}}},{{createdAt:{{$gte:t}}}},{{updated_at:{{$gte:t}}}},{{created_at:{{$gte:t}}}}]}}).limit(20).toArray();
      if (d.length) out.push({{c,d}}); }} print(JSON.stringify(out));''')


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None,
                           args=['--host-resolver-rules=MAP localhost 127.0.0.1', '--disable-dev-shm-usage'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar-SA')
    ctx.route('https://1.1.1.1/**', lambda r: r.fulfill(status=200, body=''))
    page = ctx.new_page()
    page.set_default_timeout(5000)
    ev = {'js': [], 'resp': [], 'writes': [], 'blocked': []}
    install_guard(ctx, ev)
    page.on('pageerror', lambda e: ev['js'].append(str(e)[:160]))
    page.on('dialog', lambda d: d.accept())

    def on_resp(r):
        if ':8002/' not in r.url:
            return
        u = re.sub(r'^https?://[^/]+/api/v1', '', r.url.split('?')[0])
        ev['resp'].append((r.status, r.request.method, u))
        if r.request.method in ('POST', 'PUT', 'PATCH', 'DELETE') and 'heartbeat' not in u:
            ev['writes'].append({'status': r.status, 'method': r.request.method, 'url': u, 'body': (r.request.post_data or '')[:1500]})
    page.on('response', on_resp)

    def tappables():
        out = []
        for idx, el in enumerate(page.locator(TAPPABLE).all()[:80]):
            try:
                t = ((el.inner_text(timeout=300) or el.get_attribute('aria-label') or '').strip().split('\n')[0])[:40]
            except Exception:
                continue
            out.append((t or f'(icon #{idx})', idx))   # icon-only control: identified by position
        return out

    def signature():
        labels = sorted({t for t, _ in tappables() if t and not t.startswith('(icon #') and not re.fullmatch(r'[\d\s.,٠-٩]+', t)})
        head = re.sub(r'\d+', '#', (page.inner_text('body') or '')[:40])
        return hashlib.md5((head + '|' + '|'.join(labels)).encode()).hexdigest()[:10]

    def tap(label, idx):
        cands = page.locator(TAPPABLE)
        target = cands.nth(idx) if idx < cands.count() else None
        try:
            ok = target is not None and (label.startswith('(icon #') or ((target.inner_text(timeout=300) or '').strip().split('\n')[0])[:40] == label)
        except Exception:
            ok = False
        if not ok:
            target = page.locator(TAPPABLE, has_text=label).first if label else None
        if target is None:
            raise RuntimeError('element gone')
        target.scroll_into_view_if_needed(timeout=1500)
        target.click(timeout=2500, force=True)

    # sign in through the real Welcome -> Login screens
    page.goto(WEB + '/', wait_until='load', timeout=45000); page.wait_for_timeout(7000)
    page.locator(TAPPABLE, has_text='سجّل الدخول').last.click(force=True); page.wait_for_timeout(2000)
    ins = page.locator('input:visible').all()
    ins[0].fill(os.environ['EMAIL']); ins[-1].fill(os.environ['PASSWORD'])
    page.locator(TAPPABLE, has_text='تسجيل الدخول').last.click(force=True); page.wait_for_timeout(8000)
    login_ok = any(m == 'POST' and u.endswith('/provider/auth/login') and s < 300 for s, m, u in ev['resp'])
    state_file = f'/tmp/pv_state_{PTYPE}.json'
    ctx.storage_state(path=state_file)

    def enter(path):
        page.goto(WEB + '/', wait_until='load', timeout=45000); page.wait_for_timeout(5000)
        for label, idx in path:
            tap(label, idx); page.wait_for_timeout(1800)

    home = signature()
    queue = [([], home)]
    seen = {home}
    report = {'provider_type': PTYPE, 'login_via_ui': login_ok, 'states': []}
    outp = os.path.join(ROOT, 'docs/review/evidence', f'rn_nav_provider-app_{PTYPE}_{datetime.date.today().isoformat()}.json')
    while queue and len(report['states']) < MAX_STATES:
        path, sig = queue.pop(0)
        try:
            ev['js'].clear(); ev['resp'].clear()
            enter(path)
        except Exception as e:
            report['states'].append({'path': [p[0] for p in path], 'status': 'REPLAY_FAILED', 'error': str(e)[:100]}); continue
        heading = (page.inner_text('body') or '')[:60].replace('\n', ' | ')
        render = {'js': list(ev['js']), 'bad_reads': sorted({f'{s} {m} {u}' for s, m, u in ev['resp'] if s >= 400 and m == 'GET'})}
        tag = 'V' + uuid.uuid4().hex[:5].upper()

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
                    v = (f'{tag.lower()}{n}@ui.nabd.test' if kind == 'email' else
                         str(40 + n) if kind == 'number' or mode in ('numeric', 'decimal') else
                         f'+9665{n:08d}' if kind == 'tel' or mode == 'tel' else f'{tag}{n:02d}')
                    el.fill(v)
                except Exception:
                    continue
            return n
        n_inputs = fill()
        cur_sig = signature()
        labels, seen_l = [], set()
        for t, idx in tappables():
            if t not in seen_l:
                seen_l.add(t); labels.append((t, idx))
        elements = []
        t_state = time.time()
        for t, idx in labels[:MAX_TAPS]:
            if time.time() - t_state > 240:
                elements.append({'label': '(time budget reached)', 'result': 'NOT_TESTED'}); break
            if DANGER.search(t):
                elements.append({'label': t, 'result': 'SKIPPED_DESTRUCTIVE'}); continue
            try:
                if signature() != cur_sig:
                    enter(path)
                    if SUBMIT.search(t):
                        fill()
                before = hashlib.md5(page.inner_text('body').encode()).hexdigest()
                ev['writes'].clear(); ev['js'].clear(); ev['blocked'].clear(); t0 = int(time.time() * 1000) - 50
                snap = page.evaluate(SNAP_JS)
                tap(t, idx)
                page.wait_for_timeout(1800)
                if ev['blocked']:
                    res = {'result': 'BLOCKED_DESTRUCTIVE', 'request': ev['blocked'][0]}
                    page.evaluate(RESTORE_JS, snap)
                    elements.append({'label': t, **res}); continue
                if ev['writes']:
                    stored = changed_since(t0)
                    w = ev['writes'][-1]
                    toks = re.findall(rf'{tag}\d\d', ' '.join(x['body'] for x in ev['writes']))
                    res = {'result': 'WRITE', 'status': w['status'], 'method': w['method'], 'url': w['url'],
                           'tokens_sent': len(set(toks)), 'tokens_stored': sum(1 for x in set(toks) if x in stored)}
                elif ev['js']:
                    res = {'result': 'JS_ERROR', 'error': ev['js'][0]}
                else:
                    new_sig = signature()
                    if new_sig != cur_sig and hashlib.md5(page.inner_text('body').encode()).hexdigest() != before:
                        res = {'result': 'NAVIGATE', 'to': (page.inner_text('body') or '')[:40].replace('\n', ' | ')}
                        if new_sig not in seen and len(path) < MAX_DEPTH:
                            seen.add(new_sig); queue.append((path + [(t, idx)], new_sig))
                    elif hashlib.md5(page.inner_text('body').encode()).hexdigest() != before:
                        res = {'result': 'UI_CHANGE'}
                    else:
                        res = {'result': 'NO_EFFECT'}
                elements.append({'label': t, **res})
            except Exception as e:
                elements.append({'label': t, 'result': 'TAP_FAILED', 'error': str(e)[:80]})
        report['states'].append({'path': [p[0] for p in path], 'heading': heading, 'status': 'TESTED', 'render': render,
                                 'inputs_filled': n_inputs, 'elements': elements})
        c = {}
        for e in elements:
            c[e['result']] = c.get(e['result'], 0) + 1
        print(f"{' > '.join(p[0][:14] for p in path)[:60]:60s} js {len(render['js'])} bad {len(render['bad_reads'])} in {n_inputs:2d} {c}", flush=True)
        json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    report['unvisited_states'] = len(queue)
    json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    b.close(); pw.stop()


if __name__ == '__main__':
    main()
