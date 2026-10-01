"""Mobile app UI crawl in a real browser (react-native-web export of the native app; NOT a physical device).

Build (audit-only shim keeps the session in localStorage, see metro.config.js NABD_WEB_TEST):
  cd patient-app && NABD_WEB_TEST=1 EXPO_PUBLIC_APP_ENV=development EXPO_PUBLIC_API_BASE_URL=http://localhost:8002/api/v1 \
     EXPO_PUBLIC_API_URL=http://localhost:8002 npx expo export --platform web --clear --output-dir /tmp/pa-web
  serve /tmp/pa-web on :8081 with SPA fallback (backend CORS allows localhost:8081)
Run:
  APP=patient-app WEB=http://localhost:8081 STATE=/tmp/pa_state.json python3 tools/live/rn_web_crawl.py
For every route under <app>/app (static routes; dynamic [param] routes are reported NOT_TESTED_DYNAMIC):
  - render: JS errors, data calls answering >= 400 (401 excluded only when signed out)
  - every visible input filled with a unique token
  - every distinct tappable element (tabindex=0) tapped (destructive labels skipped), result per element:
      WRITE(status, stored y/n) | NAVIGATE(to) | UI_CHANGE | NO_EFFECT | JS_ERROR
Writes docs/review/evidence/rn_web_<app>_<date>.json
  START/END bound the route range (shards run in parallel with SUFFIX per shard).
  ONLY=route1,route2 (paths relative to <app>/app, without .tsx) re-tests just those routes, and SUFFIX=<name>
  writes rn_web_<app>_<date>_<name>.json (used to verify fixes without overwriting the full run).
"""
import datetime, hashlib, json, os, re, subprocess, sys, time, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
APP = os.environ.get('APP', 'patient-app')
WEB = os.environ.get('WEB', 'http://localhost:8081')
DB = os.environ.get('DB_NAME', 'nabd_form2')
DANGER = re.compile(r'حذف|إلغاء الحساب|تسجيل الخروج|خروج|logout|sign out|delete|SOS|طوارئ|إسعاف|استغاثة|إيقاف|حظر|block', re.I)
SUBMIT = re.compile(r'حفظ|إرسال|تأكيد|احجز|أضف|إضافة|متابعة|التالي|ادفع|اطلب|Save|Submit|Confirm|Book|Add|Continue|Next|Pay|Order|Send', re.I)

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
      if (/^(system\\.|mail_log|auditlogs|request_log|search_queries|product_views|system_events)/.test(c)) continue;
      const d=db.getCollection(c).find({{$or:[{{updatedAt:{{$gte:t}}}},{{createdAt:{{$gte:t}}}},{{updated_at:{{$gte:t}}}},{{created_at:{{$gte:t}}}}]}}).limit(20).toArray();
      if (d.length) out.push({{c,d}}); }} print(JSON.stringify(out));''')


def routes():
    base = os.path.join(ROOT, APP, 'app')
    out = []
    for dp, _, fs in os.walk(base):
        if '__tests__' in dp:
            continue
        for f in fs:
            if not f.endswith('.tsx') or f.startswith('_') or f.startswith('+'):
                continue
            rel = os.path.relpath(os.path.join(dp, f), base)[:-4]
            url = '/' + re.sub(r'\([^)]*\)/?', '', rel)
            url = re.sub(r'/index$', '', url) or '/'
            out.append((rel, url))
    return sorted(out)


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None,
                           args=['--host-resolver-rules=MAP localhost 127.0.0.1', '--disable-dev-shm-usage'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='ar-SA', storage_state=os.environ.get('STATE') or None)
    page = ctx.new_page()
    page.set_default_timeout(5000)
    ev = {'js': [], 'resp': [], 'writes': [], 'blocked': []}
    install_guard(ctx, ev)
    page.on('pageerror', lambda e: ev['js'].append(str(e)[:160]))
    page.on('dialog', lambda d: d.accept())

    def on_resp(r):
        if ':8002/' not in r.url:
            return
        rec = (r.status, r.request.method, re.sub(r'^https?://[^/]+/api/v1', '', r.url.split('?')[0]))
        ev['resp'].append(rec)
        if r.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            ev['writes'].append({'status': r.status, 'method': r.request.method, 'url': rec[2], 'body': (r.request.post_data or '')[:1500]})
    page.on('response', on_resp)
    start = os.environ.get('START', '')
    only = {x.strip() for x in os.environ.get('ONLY', '').split(',') if x.strip()}
    report = []
    for rel, url in routes():
        if rel < start or (os.environ.get('END') and rel >= os.environ['END']) or (only and rel not in only):
            continue
        if '[' in rel:
            report.append({'route': rel, 'status': 'NOT_TESTED_DYNAMIC'}); continue
        t_route = time.time()
        ev['js'].clear(); ev['resp'].clear()
        try:
            page.goto(WEB + url, wait_until='load', timeout=45000); page.wait_for_timeout(3500)
        except Exception as e:
            report.append({'route': rel, 'status': 'OPEN_FAILED', 'error': str(e)[:120]}); continue
        landed = page.url.replace(WEB, '')
        render = {'js': list(ev['js']), 'bad_reads': sorted({f'{s} {m} {u}' for s, m, u in ev['resp'] if s >= 400 and m == 'GET'})}
        tag = 'R' + uuid.uuid4().hex[:5].upper()

        def fill():
            n = 0
            for el in page.locator('input:visible, textarea:visible').all()[:25]:
                try:
                    if not el.is_editable():
                        continue
                    n += 1
                    kind = (el.get_attribute('type') or 'text').lower()
                    mode = (el.get_attribute('inputmode') or '').lower()
                    v = (f'{tag.lower()}{n}@ui.nabd.test' if kind == 'email' else
                         str(40 + n) if kind == 'number' or mode in ('numeric', 'decimal') else
                         f'+9665{n:08d}' if kind == 'tel' or mode == 'tel' else f'{tag}{n:02d}')
                    if kind == 'password':
                        continue
                    el.fill(v)
                except Exception:
                    continue
            return n
        n_inputs = fill()
        labels = []
        for idx, el in enumerate(page.locator(TAPPABLE).all()[:60]):
            try:
                t = (el.inner_text(timeout=300) or el.get_attribute('aria-label') or '').strip().split('\n')[0][:40]
            except Exception:
                continue
            t = t or f'(icon #{idx})'   # icon-only control: no text, identified by its position
            if t not in [x for x, _ in labels]:
                labels.append((t, idx))
        elements = []
        for t, idx in labels[:45]:
            if time.time() - t_route > 150:
                elements.append({'label': '(time budget reached)', 'result': 'NOT_TESTED'}); break
            if DANGER.search(t):
                elements.append({'label': t, 'result': 'SKIPPED_DESTRUCTIVE'}); continue
            try:
                if page.url.replace(WEB, '') != landed:
                    page.goto(WEB + url, wait_until='load', timeout=45000); page.wait_for_timeout(2000)
                    if SUBMIT.search(t):
                        fill()
                cands = page.locator(TAPPABLE)
                target = cands.nth(idx) if idx < cands.count() else None
                if t.startswith('(icon #'):
                    pass   # positional: no text to re-find it by
                elif target is None or (target.inner_text(timeout=300) or '').strip().split('\n')[0][:40] != t:
                    target = page.locator(TAPPABLE, has_text=t).first
                before = hashlib.md5(page.inner_text('body').encode()).hexdigest()
                ev['writes'].clear(); ev['js'].clear(); ev['blocked'].clear(); t0 = int(time.time() * 1000) - 50
                snap = page.evaluate(SNAP_JS)
                target.scroll_into_view_if_needed(timeout=1500)
                target.click(timeout=2500, force=True)
                page.wait_for_timeout(1500)
                after_url = page.url.replace(WEB, '')
                if ev['blocked']:
                    res = {'result': 'BLOCKED_DESTRUCTIVE', 'request': ev['blocked'][0]}
                    page.evaluate(RESTORE_JS, snap)
                    elements.append({'label': t, **res}); continue
                if ev['writes']:
                    stored = changed_since(t0)
                    w = ev['writes'][-1]
                    toks = re.findall(rf'{tag}\d\d', ' '.join(x['body'] for x in ev['writes']))
                    res = {'result': 'WRITE', 'status': w['status'], 'method': w['method'], 'url': w['url'],
                           'tokens_sent': len(toks), 'tokens_stored': sum(1 for x in set(toks) if x in stored)}
                elif ev['js']:
                    res = {'result': 'JS_ERROR', 'error': ev['js'][0]}
                elif after_url != landed:
                    res = {'result': 'NAVIGATE', 'to': after_url}
                elif hashlib.md5(page.inner_text('body').encode()).hexdigest() != before:
                    res = {'result': 'UI_CHANGE'}
                else:
                    res = {'result': 'NO_EFFECT'}
                elements.append({'label': t, **res})
            except Exception as e:
                elements.append({'label': t, 'result': 'TAP_FAILED', 'error': str(e)[:80]})
        rec = {'route': rel, 'url': url, 'landed': landed, 'status': 'TESTED', 'render': render, 'inputs_filled': n_inputs, 'elements': elements}
        report.append(rec)
        c = {}
        for e in elements:
            c[e['result']] = c.get(e['result'], 0) + 1
        print(f"{rel[:42]:42s} -> {landed[:22]:22s} js {len(render['js'])} bad_reads {len(render['bad_reads'])} inputs {n_inputs:2d} {c}", flush=True)
        suffix = f"_{os.environ['SUFFIX']}" if os.environ.get('SUFFIX') else ''
        outp = os.path.join(ROOT, 'docs/review/evidence', f'rn_web_{APP}_{datetime.date.today().isoformat()}{suffix}.json')
        json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    b.close(); pw.stop()


if __name__ == '__main__':
    main()
