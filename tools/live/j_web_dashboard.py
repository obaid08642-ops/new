"""Journey (patient-web in a real browser, signed in): every row of the dashboard's "all services" list opens a real page,
and none of them is the doctor chat list that decision 24 removed (issues 1047, 1048, 1092).
  A chat with a doctor is reached from its booking (/appointments/<id>/chat); /chat itself goes to the appointments.
  Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='web-dashboard')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web dashboard', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web dashboard', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')

        journey('web dashboard: no chat list (decision 24)')
        page.goto(f'{WEB}/ar/dashboard', wait_until='load', timeout=60000)
        page.wait_for_selector('h1, h2', timeout=30000)
        hrefs = sorted({h for h in page.eval_on_selector_all('a[href^="/ar/"]', 'els => els.map(e => e.getAttribute("href"))') if h})
        step('the dashboard has links to the patient pages', len(hrefs) > 5, hrefs)
        step('no dashboard row opens the removed chat list (/ar/chat)', '/ar/chat' not in hrefs, [h for h in hrefs if h.startswith('/ar/chat')])
        page.goto(f'{WEB}/ar/chat', wait_until='load', timeout=60000)
        try:
            page.wait_for_url('**/ar/appointments', timeout=15000)
        except Exception:
            pass
        step('/ar/chat goes to the appointments (a chat opens from its booking)', page.url.rstrip('/').endswith('/ar/appointments'), page.url)

        journey('web dashboard: every link opens a real page')
        dead = []
        for href in hrefs:
            resp = ctx.request.get(f'{WEB}{href}', max_redirects=5)
            if resp.status >= 400:
                dead.append(f'{href} -> {resp.status}')
        step('no dashboard link answers 4xx or 5xx', not dead, dead)
    except Exception as e:
        step('web dashboard flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
