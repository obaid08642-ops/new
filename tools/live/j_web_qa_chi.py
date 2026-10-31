"""Journey (QA I-04, patient-web in a real browser): the CHI link on the add-policy form.
  - the server's config names the CHI inquiry page (GET /config links.chi_inquiry), https on chi.gov.sa only;
  - the patient signs in on the website and opens /ar/insurance/add-policy;
  - the form shows one anchor to CHI, with the same address as the config, opening in a new tab (target _blank, noopener);
  - after a reload the anchor is still there.
The link is not followed: chi.gov.sa is outside the test stack. The API side (save without insurer refused, nothing stored
without a company) is in tools/live/j_qa_chi.py.
A missing browser or website is a FAIL, never a PASS."""
import os

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts
    from playwright.sync_api import sync_playwright
    from lib import summary
    from urllib.parse import urlparse

    cfg = Client(None, 'anon').get('/config')
    chi = (cfg.body or {}).get('links', {}).get('chi_inquiry') if isinstance(cfg.body, dict) else None
    step('the server config names the CHI inquiry page (https, chi.gov.sa)', bool(chi) and urlparse(chi).scheme == 'https' and urlparse(chi).hostname.endswith('chi.gov.sa'), chi)

    acct = j_accounts.app_signup(label='web-chi')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('insurance I-04 (web): the CHI link on the add-policy form')
        r = web_login(ctx, WEB, acct['email'], acct['password'], path='/api/auth/login')
        step('the patient signs in on the website', r.status == 200, r.status)
        page.goto(f'{WEB}/ar/insurance/add-policy', wait_until='load', timeout=60000)
        link = page.locator('a[href*="chi.gov.sa"]')
        link.first.wait_for(timeout=60000)
        step('the form shows one CHI link', link.count() == 1, link.count())
        href = link.first.get_attribute('href') or ''
        step('the link goes to the same address as the server config', bool(chi) and href.rstrip('/') == chi.rstrip('/'), href)
        step('the link opens in a new tab (target=_blank, noopener)', link.first.get_attribute('target') == '_blank' and 'noopener' in (link.first.get_attribute('rel') or ''), link.first.get_attribute('rel'))
        page.reload(wait_until='load')
        link.first.wait_for(timeout=60000)
        step('after reload the CHI link is still there', link.count() == 1, link.count())
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
