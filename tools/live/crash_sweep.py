"""Render-crash sweep: open every static page of the website or the admin and record client-side crashes.

  APP=website|admin python3 tools/live/crash_sweep.py      -> docs/review/evidence/crash_sweep_<app>_<date>.json

Next.js catches render errors itself, so no 'pageerror' fires; the page shows "Application error: a client-side
exception has occurred" and logs the TypeError to the console. web_crawl.py (before 2026-10-02 evening) missed
these; this sweep checks every page for the error text, console TypeErrors/ReferenceErrors and pageerrors.
Signed in as the seeded patient (website) or the admin (j_admin.login, reusing LIVE_ADMIN_SESSION when set).
"""
import datetime, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
APP = os.environ.get('APP', 'website')
BASE = {'website': 'http://127.0.0.1:3000', 'admin': 'http://127.0.0.1:3001'}[APP]
CRASH_TEXT = ('Application error', 'client-side exception', 'Unhandled Runtime Error', 'Internal Server Error')
# rendered (not raw HTML: next-intl ships the 404 text in every page) not-found / unavailable states
NOT_FOUND = re.compile(r'^\s*404\b|الصفحة غير متاحة|غير متاح حالياً|تعذر تحميل|This page could not be found')


def routes():
    inv = json.load(open(os.path.join(ROOT, 'docs/review/inventory/screens.json')))
    key = 'patient-web' if APP == 'website' else 'admin'
    rs = [p['route'] for p in inv[key]['pages'] if not p['dynamic']]
    if APP == 'website':
        rs = [r.replace('/[locale]', '/ar') for r in rs if r.startswith('/[locale]')]
    return rs


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, locale='ar-SA')
    page = ctx.new_page()
    if APP == 'website':
        p = json.load(open('/tmp/seed/patient.json'))
        page.request.post(BASE + '/api/auth/login', data={'identifier': p['email'], 'password': p['password']})
    else:
        import j_admin
        w, _ = j_admin.login()
        ctx.add_cookies([{'name': c.name, 'value': c.value, 'domain': '127.0.0.1', 'path': '/'} for c in w.jar])
    errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:200]))
    page.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' and any(k in m.text for k in ('TypeError', 'ReferenceError', 'client-side exception')) else None)
    out = []
    for r in routes():
        errs.clear()
        status = None
        try:
            resp = page.goto(BASE + r, wait_until='load', timeout=45000)   # not networkidle: pages that poll never go idle
            status = resp.status if resp else None
            page.wait_for_timeout(2500)
            body = page.inner_text('body', timeout=5000)
            main = page.inner_text('main', timeout=3000) if page.locator('main').count() else body
        except Exception as e:
            body = main = ''
            errs.append('load: ' + str(e)[:150])
        crash = [t for t in CRASH_TEXT if t in body]
        nf = NOT_FOUND.search(main[:600])
        row = {'route': r, 'status': status, 'landed': page.url.replace(BASE, ''), 'crash_text': crash, 'errors': list(dict.fromkeys(errs))[:5],
               'not_found': nf.group(0).strip() if nf else '', 'head': main[:160].replace('\n', ' | ')}
        out.append(row)
        flag = 'CRASH' if (crash or errs or (status or 0) >= 500) else ('NOTFOUND' if row['not_found'] else 'ok')
        print(f'{flag:5s} {r[:50]:50s} {status} {crash or ""} {row["errors"][:1]}', flush=True)
    path = os.path.join(ROOT, 'docs/review/evidence', f'crash_sweep_{APP}_{datetime.date.today().isoformat()}.json')
    json.dump({'app': APP, 'pages': out, 'not_found': [x['route'] for x in out if x['not_found']], 'crashed': [x['route'] for x in out if x['crash_text'] or x['errors'] or (x['status'] or 0) >= 500]},
              open(path, 'w'), ensure_ascii=False, indent=1)
    print('crashed:', sum(1 for x in out if x['crash_text'] or x['errors'] or (x['status'] or 0) >= 500), 'of', len(out))
    b.close(); pw.stop()


if __name__ == '__main__':
    main()
