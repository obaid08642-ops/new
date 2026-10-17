"""Journey (patient-web in a real browser, signed in): a patient with no family group opens the family chat and sees the
"no group" state with two working actions, both in the page's language (issue 1550 walkthrough).
  The second action used to read a key that does not exist (FamilyWeb.chatBack): the page showed the raw key and the
  browser logged MISSING_MESSAGE.
  Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
BACK = {'ar': 'العودة للعائلة', 'en': 'Back to family'}
JOIN = {'ar': 'انضمام بكود', 'en': 'Join with a code'}


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='web-family-chat')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web family chat', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web family chat', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: m.type == 'error' and 'MISSING_MESSAGE' in m.text and errors.append(m.text[:160]))
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')
        for loc in ('ar', 'en'):
            journey(f'web family chat ({loc}): a patient with no family group')
            errors.clear()
            page.goto(f'{WEB}/{loc}/family/chat', wait_until='load', timeout=60000)
            # the no-group state (LinkEmptyState): two buttons that navigate with the router
            page.get_by_role('button', name=JOIN[loc]).first.wait_for(timeout=30000)
            body = page.inner_text('main')
            step(f'/{loc}/family/chat shows no raw message key', 'FamilyWeb.' not in body, body[:300])
            step(f'/{loc}/family/chat logs no missing message', not errors, errors)
            back = page.get_by_role('button', name=BACK[loc])
            step(f'"{BACK[loc]}" is a button back to the family page', back.count() > 0, body[:300])
            if back.count() > 0:
                back.first.click()
                page.wait_for_url(f'**/{loc}/family', timeout=30000)
                step('it opens the family page', page.url.rstrip('/').endswith(f'/{loc}/family'), page.url)
    except Exception as e:
        step('web family chat flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
