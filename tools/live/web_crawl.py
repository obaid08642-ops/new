"""Website / admin page crawl (Next.js, Chromium, local stack). Every non-dynamic page from the inventory is opened
signed in, checked for render errors, then every distinct control is exercised.

  APP=website|admin python3 tools/live/web_crawl.py            (ONLY=/route1,/route2  START/END slice  SUFFIX)
Sign-in: website = seeded patient (/tmp/seed/patient.json) via /api/auth/login; admin = j_admin.login() session.
Per control: WRITE(status, tokens stored?) | NAVIGATE(to) | UI_CHANGE | NO_EFFECT(disabled?) | JS_ERROR | TAP_FAILED |
             BLOCKED_DESTRUCTIVE (request answered locally) | SKIPPED_DESTRUCTIVE (label).
Readiness is condition-based (no request in flight, no busy indicator, stable DOM), like rn_nav_crawl2.py.
Writes docs/review/evidence/<web|admin>_crawl_<date>[_SUFFIX].json with per-page time_to_ready_ms.
"""
import datetime, hashlib, json, os, re, subprocess, sys, time, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
APP = os.environ.get('APP', 'website')
BASE = 'http://127.0.0.1:3000' if APP == 'website' else 'http://127.0.0.1:3001'
INV_KEY = 'patient-web' if APP == 'website' else 'admin'
ONLY = [x for x in os.environ.get('ONLY', '').split(',') if x]
MAX_TAPS = int(os.environ.get('MAX_TAPS', '30'))
DB = os.environ.get('DB_NAME', 'nabd_form2')
DANGER = re.compile(r'حذف|تسجيل الخروج|خروج|logout|sign ?out|delete|remove|إيقاف|حظر|block|suspend|ban|تعليق|إلغاء الحساب|تعطيل|disable|reset|إعادة تعيين|purge|broadcast|بث|إرسال للجميع|refund|استرداد|approve all|reject|رفض|English|العربية|EN$', re.I)
CLICKABLE = 'main button:visible, main [role="button"]:visible, main a[href]:visible, main [role="tab"]:visible, main [role="switch"]:visible, main input[type="checkbox"]:visible, main summary:visible'
LOADING = '[aria-busy="true"]:visible, [role="progressbar"]:visible, .animate-spin:visible, [data-loading="true"]:visible'
BLOCK = re.compile(r'logout|/delete|/purge|/ban|/suspend|/refund|/broadcast|/bulk|/reset|account$|/emergency|/sos', re.I)


def mongo(js):
    return subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js], capture_output=True, text=True).stdout


def changed_since(ms):
    return mongo(f'''const t=new Date({ms}); const out=[]; for (const c of db.getCollectionNames()) {{
      if (/^(system\\.|mail_log|auditlogs|audit_logs|request_log|search_queries|product_views|system_events|sessions)/.test(c)) continue;
      const d=db.getCollection(c).find({{$or:[{{updatedAt:{{$gte:t}}}},{{createdAt:{{$gte:t}}}},{{updated_at:{{$gte:t}}}},{{created_at:{{$gte:t}}}}]}}).limit(20).toArray();
      if (d.length) out.push({{c,d}}); }} print(JSON.stringify(out));''')


def routes():
    # URLS=<file>: JSON list of [route_pattern, concrete_url] for dynamic routes, harvested from real links
    if os.environ.get('URLS'):
        return [tuple(x) for x in json.load(open(os.environ['URLS']))]
    inv = json.load(open(os.path.join(ROOT, 'docs/review/inventory/screens.json')))
    rs = [p['route'] for p in inv[INV_KEY]['pages'] if not p['dynamic']]
    if APP == 'website':
        rs = [r.replace('/[locale]', '/ar') for r in rs if r.startswith('/[locale]')]
    s, e = int(os.environ.get('START', '0')), int(os.environ.get('END', '100000'))
    return [r for r in rs[s:e] if not ONLY or r in ONLY]


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, locale='ar-SA')
    page = ctx.new_page(); page.set_default_timeout(5000)
    ev = {'js': [], 'resp': [], 'writes': [], 'blocked': [], 'inflight': {}, 'failed': []}

    if APP == 'website':
        p = json.load(open('/tmp/seed/patient.json'))
        r = page.request.post(BASE + '/api/auth/login', data={'identifier': p['email'], 'password': p['password']})
        signed_in = r.status == 200
    else:
        import j_admin
        w, _ = j_admin.login()
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': '127.0.0.1', 'path': '/'} for c in w.jar])
        signed_in = any(c.name == 'admin_access' for c in w.jar)

    def guard(route):
        req = route.request
        if req.method != 'GET' and BLOCK.search(req.url.split('?')[0]):
            ev['blocked'].append(f'{req.method} {req.url[:90]}')
            return route.fulfill(status=200, content_type='application/json', body='{}')
        return route.continue_()
    ctx.route('**/api/**', guard)
    page.on('pageerror', lambda e: ev['js'].append(str(e)[:200]))
    page.on('dialog', lambda d: d.dismiss())          # never confirm a browser confirm() on its own
    # Track every same-site fetch/xhr, not only /api/: Next.js client navigation loads the next page with
    # `?_rsc=` fetches; ignoring them judged a link "ready" before it navigated (558 false NO_EFFECTs).
    page.on('request', lambda r: ev['inflight'].__setitem__(id(r), r.url) if (r.resource_type in ('fetch', 'xhr', 'document') and BASE in r.url and 'heartbeat' not in r.url) else None)
    page.on('requestfinished', lambda r: ev['inflight'].pop(id(r), None))
    page.on('requestfailed', lambda r: ev['inflight'].pop(id(r), None) and ev['failed'].append(r.url[:100]))

    def on_resp(r):
        if '/api/' not in r.url:
            return
        u = r.url.split('?')[0].replace(BASE, '')
        ev['resp'].append((r.status, r.request.method, u))
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

    def wait_ready(timeout_ms=15000):
        t0 = time.time(); last = None; stable = 0; delay = 0.15
        while True:
            busy = len(ev['inflight'])
            try:
                loading = page.locator(LOADING).count()
            except Exception:
                loading = 0
            h = body_hash(); stable = stable + 1 if (h == last and h) else 0; last = h
            if busy == 0 and loading == 0 and stable >= 2:
                return True, int((time.time() - t0) * 1000), ''
            if (time.time() - t0) * 1000 >= timeout_ms:
                return False, int((time.time() - t0) * 1000), f'{busy} in flight, {loading} loading, stable={stable}'
            time.sleep(delay); delay = min(delay * 1.5, 0.6)

    def controls():
        out, seen = [], set()
        for idx, el in enumerate(page.locator(CLICKABLE).all()[:120]):
            try:
                t = ((el.inner_text(timeout=300) or el.get_attribute('aria-label') or el.get_attribute('title') or el.get_attribute('href') or '').strip().split('\n')[0])[:50]
            except Exception:
                continue
            key = t or f'(icon #{idx})'
            if key in seen:
                continue
            seen.add(key); out.append((key, idx))
        return out

    tag = 'W' + uuid.uuid4().hex[:5].upper()

    def fill():
        n = 0
        for el in page.locator('main input:visible, main textarea:visible').all()[:30]:
            try:
                if not el.is_editable():
                    continue
                kind = (el.get_attribute('type') or 'text').lower()
                if kind in ('password', 'checkbox', 'radio', 'file', 'hidden', 'search'):
                    continue
                n += 1
                v = (f'{tag.lower()}{n}@ui.nabd.test' if kind == 'email' else str(10 + n) if kind == 'number' else
                     '2027-01-15' if kind == 'date' else f'+9665{n:08d}' if kind == 'tel' else f'https://ex.nabd.test/{tag}{n}' if kind == 'url' else f'{tag}{n:02d}')
                el.fill(v)
            except Exception:
                continue
        return n

    report = {'app': APP, 'signed_in': signed_in, 'pages': []}
    outp = os.path.join(ROOT, 'docs/review/evidence', f"{'web' if APP == 'website' else 'admin'}_crawl_{datetime.date.today().isoformat()}{('_' + os.environ['SUFFIX']) if os.environ.get('SUFFIX') else ''}.json")
    inv_routes = routes()
    for item in inv_routes:
        pattern, route = (item if isinstance(item, tuple) else (None, item))
        url = BASE + route
        ev['js'].clear(); ev['resp'].clear(); ev['failed'].clear(); ev['writes'].clear(); ev['blocked'].clear()
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=45000)
        except Exception as e:
            report['pages'].append({'route': pattern or (route.replace('/ar', '/[locale]', 1) if APP == 'website' else route), 'url': route, 'status': 'LOAD_FAILED', 'error': str(e)[:120]}); continue
        ready, ms, why = wait_ready()
        landed = page.url.replace(BASE, '')
        render = {'js': list(ev['js']), 'bad_reads': sorted({f'{s} {m} {u}' for s, m, u in ev['resp'] if s >= 400 and m == 'GET'})}
        entry = {'route': pattern or (route.replace('/ar', '/[locale]', 1) if APP == 'website' else route), 'url': route, 'landed': landed,
                 'time_to_ready_ms': ms, 'ready': ready, 'not_ready_reason': why, 'render': render}
        n_inputs = fill()
        els, t0s = [], time.time()
        base_hash = body_hash()
        for label, idx in controls()[:MAX_TAPS]:
            if time.time() - t0s > 180:
                els.append({'label': '(time budget reached)', 'result': 'NOT_TESTED'}); break
            if DANGER.search(label):
                els.append({'label': label, 'result': 'SKIPPED_DESTRUCTIVE'}); continue
            try:
                if page.url.replace(BASE, '') != landed or body_hash() != base_hash:
                    page.goto(url, wait_until='domcontentloaded', timeout=45000); wait_ready(); fill(); base_hash = body_hash()
                el = None
                for l2, i2 in controls():
                    if l2 == label:
                        el = page.locator(CLICKABLE).nth(i2); break
                if el is None:
                    els.append({'label': label, 'result': 'CRAWLER_TARGET_MISSING'}); continue
                try:
                    disabled = el.is_disabled(timeout=1500) or el.get_attribute('aria-disabled', timeout=1500) == 'true'
                except Exception:
                    disabled = False
                if disabled:
                    # A disabled control is a state, not a failure: pagination at page 1, submit before the form is
                    # valid, an action waiting for a file. Recorded so a never-enabled control can be reviewed.
                    els.append({'label': label, 'result': 'DISABLED'}); continue
                ev['writes'].clear(); ev['js'].clear(); ev['blocked'].clear()
                t0 = int(time.time() * 1000) - 50; tc = time.time()
                before = body_hash()
                el.click(timeout=3000)
                # give a navigation or re-render up to 3 s to start before judging (event-driven, exits early)
                for _ in range(30):
                    if page.url.replace(BASE, '') != landed or body_hash() != before or ev['writes'] or ev['js']:
                        break
                    time.sleep(0.1)
                ready2, _, why2 = wait_ready(8000)
                rms = int((time.time() - tc) * 1000)
                if ev['blocked']:
                    res = {'result': 'BLOCKED_DESTRUCTIVE', 'request': ev['blocked'][0]}
                elif ev['writes']:
                    w = ev['writes'][-1]
                    toks = re.findall(rf'{tag}\d\d', ' '.join(x['body'] for x in ev['writes']))
                    stored = changed_since(t0) if toks else ''
                    res = {'result': 'WRITE', 'status': w['status'], 'method': w['method'], 'url': w['url'],
                           'tokens_sent': len(set(toks)), 'tokens_stored': sum(1 for x in set(toks) if x in stored)}
                elif ev['js']:
                    res = {'result': 'JS_ERROR', 'error': ev['js'][0]}
                elif page.url.replace(BASE, '') != landed:
                    res = {'result': 'NAVIGATE', 'to': page.url.replace(BASE, '')[:80]}
                elif body_hash() != before:
                    res = {'result': 'UI_CHANGE'}
                else:
                    res = {'result': 'NO_EFFECT', 'disabled': disabled}
                res['response_ms'] = rms
                if not ready2:
                    res['slow'] = why2
                els.append({'label': label, **res})
            except Exception as e:
                els.append({'label': label, 'result': 'TAP_FAILED', 'error': str(e)[:80]})
        cnt = {}
        for e in els:
            cnt[e['result']] = cnt.get(e['result'], 0) + 1
        entry.update({'status': 'TESTED', 'inputs_filled': n_inputs, 'elements': els, 'summary': cnt})
        report['pages'].append(entry)
        print(f"{route[:46]:46s} {ms:6d}ms js {len(render['js'])} bad {len(render['bad_reads'])} {cnt}", flush=True)
        json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    b.close(); pw.stop()


if __name__ == '__main__':
    main()
