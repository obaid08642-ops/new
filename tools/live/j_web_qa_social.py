"""Journey (QA A-05, patient-web in a real browser): social sign-in on the login page.
  - the login page shows the four social buttons (Google, Apple, X, Snapchat) in the "other ways" group (owner, 2026-10-25: all four always show);
  - each button's data-configured flag matches what the server says in GET /auth/social/config;
  - a provider the server cannot finish is not sent to the provider: the page stays on the login screen.
Stack: backend :8002, patient-web (NABD_WEB_JOURNEYS_URL, default :3100). A missing browser or website is a FAIL, never a PASS."""
import os

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
BUTTONS = {'google': 'socialBrandGoogle', 'apple': 'socialBrandApple', 'x': 'socialBrandX', 'snapchat': 'socialBrandSnapchat'}


def main():
    from playwright.sync_api import sync_playwright
    from lib import summary

    cfg = Client(None, 'anon').get('/auth/social/config')
    step('the server social config answers', cfg.ok, cfg.status)
    config = cfg.body if isinstance(cfg.body, dict) else {}

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('account A-05 (web): social sign-in buttons follow the server config')
        page.goto(f'{WEB}/ar/login', wait_until='load', timeout=60000)
        group = page.locator('[aria-label]').filter(has=page.locator('button[class*=socialButton]')).first
        group.wait_for(timeout=30000)
        step('the four social buttons are on the login page', all(page.locator(f'button.{cls}').count() == 1 for cls in BUTTONS.values()), 'four')
        for provider, cls in BUTTONS.items():
            flag = page.locator(f'button.{cls}').first.get_attribute('data-configured')
            want = '1' if (config.get(provider) or {}).get('enabled') else '0'
            step(f'{provider}: the button flag matches the server config', flag == want, f'button={flag} server={want}')
        for provider, cls in BUTTONS.items():
            if (config.get(provider) or {}).get('enabled'):
                continue
            before = page.url
            page.locator(f'button.{cls}').first.click()
            page.wait_for_timeout(2000)
            step(f'{provider}: an unconfigured provider does not leave the login page', page.url == before and 'login' in page.url, page.url)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
