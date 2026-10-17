"""Journey (patient-web in a real browser, issue 1550 part 2): more pages a guest opens before signing in.
  /ar/emergency, /ar/insurance/network-providers, /ar/home-care/providers, /ar/diagnostics/search,
  /ar/diagnostics/lab-comparison and /ar/ai used to send a guest to the sign-in form. Now, signed out: the urgent-help
  number is a tel: button, the network tab lets the guest pick an insurer, the home care providers, the test list and
  the labs that run a test are listed from public reads, the assistant explains its modes, and the one action that needs
  an account opens the sign-in with the way back. No request of the visit answers 401. /ar/offline answers 200 with its
  page, and /ar/settings/connected-apps sends a guest to the sign-in and shows the page to a patient (the crawl had
  both as 404). Signed in, the personal part is there again. The data is seeded through the admin and provider APIs.
  Stack: backend :8002, patient-web :3100.
"""
import json
import os
import re
import urllib.parse
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
MESSAGES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../patient-web/messages/ar.json')
URGENT = '+966 800 555 0101'


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def seed(admin, tag):
    """Public data of every page, through the admin and provider APIs."""
    import j_lab
    from j_web_guest_services import approved
    anon = Client(None, 'anon')
    out = {}

    journey('seed: the urgent-help number (admin)')
    before = anon.get('/mental-health/urgent-help')
    out['urgent_before'] = (before.body or {}).get('phone') if isinstance(before.body, dict) else None
    r = admin.put('/admin/admin/mental-health/urgent-help', {'phone': URGENT})
    step('admin sets the urgent-help number', r.ok, r)
    r = anon.get('/mental-health/urgent-help')
    step('the number is on the public read', r.ok and (r.body or {}).get('phone') == URGENT, r)

    journey('seed: an insurer (admin insurance companies)')
    code = f'gn{tag}'
    r = admin.post('/insurance/companies', {'code': code, 'name_ar': f'تأمين الشبكة {tag}', 'name_en': f'Network Insure {tag}'})
    step('admin creates the insurer', r.ok, r)
    company = next((x for x in rows(admin.get('/insurance/companies/all')) if x.get('code') == code), {})
    if company and not company.get('is_active'):
        r = admin.patch(f"/insurance/companies/{company.get('id')}", {'is_active': True})
        step('admin activates it', r.ok, r)
    public = next((x for x in rows(anon.get('/insurance/companies')) if x.get('code') == code or x.get('id') == company.get('id')), {})
    step('the insurer is on the public list', bool(public), company.get('id'))
    out['insurer'], out['insurer_id'] = f'تأمين الشبكة {tag}', public.get('id') or company.get('id')

    journey('seed: a home care provider')
    hc = approved(admin, 'home_care')
    row = next((x for x in rows(anon.get('/providers?type=home_care')) if x.get('id') == hc), {})
    step('the home care provider is in the public list', bool(row), hc)
    out['home_care'] = row.get('name_ar') or row.get('name_en') or ''

    journey('seed: a published lab test and an approved lab')
    test_id = j_lab.admin_publishes_tests(admin, n=0)
    test = next((x for x in rows(anon.get('/labs/services')) if x.get('id') == test_id), {})
    step('the test is on the public list', bool(test), test_id)
    out['test_id'], out['test'] = test_id, test.get('name_ar') or test.get('name') or ''
    approved(admin, 'lab')
    labs = rows(anon.get(f'/labs/compatible-providers?testIds={test_id}'))
    out['labs'] = [str(x.get('name_ar') or x.get('name_en') or x.get('name') or '') for x in labs if isinstance(x, dict)]
    return out


def main():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    data = seed(admin, tag)
    acct = j_accounts.app_signup(label='guestsvc2')
    with open(MESSAGES, encoding='utf-8') as f:
        ar = json.load(f)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web guest services 2', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    unauthorized = []
    page.on('response', lambda res: unauthorized.append(f'{res.status} {res.url}') if res.status == 401 else None)

    def visit(path):
        response = page.goto(f'{WEB}{path}', wait_until='load', timeout=60000)
        try:
            page.wait_for_load_state('networkidle', timeout=8000)
        except Exception:
            pass
        text = page.locator('main').first.inner_text() if page.locator('main').count() else page.inner_text('body')
        return text, (response.status if response else None)

    def guest_action(path, next_path):
        link = page.locator('section[data-guest-action] a').first
        href = link.get_attribute('href') if link.count() else None
        want = f'/ar/login?next={urllib.parse.quote(next_path, safe="")}'
        step(f'{path}: the action button opens the sign-in with the way back', href == want, f'href={href} want={want}')
        if href:
            link.click()
            page.wait_for_url('**/ar/login**', timeout=30000)
            q = urllib.parse.parse_qs(urllib.parse.urlparse(page.url).query)
            step(f'{path}: the sign-in page keeps the return URL', q.get('next') == [next_path] and page.locator('input[type="password"]').count() > 0, page.url)

    try:
        journey('issue 1550 part 2: a guest sees each page before signing in')
        text, _ = visit('/ar/emergency')
        dial = ('+' if URGENT.startswith('+') else '') + re.sub(r'\D', '', URGENT)
        step('/ar/emergency: a guest gets the page, not the sign-in form', '/ar/login' not in page.url, page.url)
        step('/ar/emergency: the urgent-help number is a tel: button', page.locator(f'a[href="tel:{dial}"]').count() == 1, text[:200])
        guest_action('/ar/emergency', '/ar/emergency')

        text, _ = visit('/ar/insurance/network-providers')
        step('/ar/insurance/network-providers: lands on the network tab of the guest page', '/ar/login' not in page.url and 'tab=network' in page.url and ar['GuestServices']['insurance']['networkTitle'] in text, f'url={page.url}')
        select = page.locator('select[name="company"]')
        step('the network tab lets the guest pick the seeded insurer', select.count() == 1 and select.locator(f'option[value="{data["insurer_id"]}"]').count() == 1, data['insurer_id'])
        if select.count():
            select.select_option(data['insurer_id'])
            page.locator('form[role="search"] button[type="submit"]').first.click()
            page.wait_for_url(f'**company={data["insurer_id"]}**', timeout=30000)
            body = page.inner_text('main')
            # The public network read filters providers on their insurance contracts; none is seeded here (see the PR's
            # Needs review), so the honest empty state is what a guest gets, with no sign-in and no 401.
            step('the chosen insurer\'s network is read publicly (list or the honest empty state)', '/ar/login' not in page.url and (ar['InsuranceWeb']['networkEmpty'] in body or page.locator('ul li').count() > 0), body[:200])

        text, _ = visit('/ar/home-care/providers')
        step('/ar/home-care/providers: the guest sees the seeded provider', '/ar/login' not in page.url and bool(data['home_care']) and data['home_care'] in text, f'url={page.url} text={text[:200]}')
        guest_action('/ar/home-care/providers', '/ar/home-care')

        text, _ = visit(f'/ar/diagnostics/search?q={urllib.parse.quote(data["test"])}')
        step('/ar/diagnostics/search: the guest sees the seeded test', '/ar/login' not in page.url and bool(data['test']) and data['test'] in text, f'url={page.url} text={text[:200]}')

        text, _ = visit(f'/ar/diagnostics/lab-comparison?testIds={data["test_id"]}')
        labs_shown = any(name and name in text for name in data['labs']) if data['labs'] else ar['DiagWeb']['compareNoLabsTitle'] in text
        step('/ar/diagnostics/lab-comparison: the labs the public read gives (or the honest empty state)', '/ar/login' not in page.url and labs_shown, f'labs={data["labs"][:3]} text={text[:200]}')

        text, _ = visit('/ar/ai?mode=prescription')
        step('/ar/ai: a guest sees the assistant landing', '/ar/login' not in page.url and ar['AssistantWeb']['heroTitle']['prescription'] in text, f'url={page.url}')
        step('/ar/ai: the three modes are links', page.locator('a[href="/ar/ai?mode=symptoms"]').count() >= 1 and page.locator('a[href="/ar/ai?mode=report"]').count() >= 1, page.url)
        guest_action('/ar/ai', '/ar/ai?mode=prescription')

        text, status = visit('/ar/offline')
        step('/ar/offline: answers 200 with the offline page', status == 200 and ar['Offline']['title'] in text, f'{status} {text[:120]}')
        _, status = visit('/ar/settings/connected-apps')
        step('/ar/settings/connected-apps: a guest is sent to the sign-in with the way back, not a 404', status != 404 and '/ar/login' in page.url and 'connected-apps' in urllib.parse.unquote(page.url), f'{status} {page.url}')
        step('no request of the guest visit answered 401', not unauthorized, unauthorized[:5])

        journey('issue 1550 part 2: signed in, the personal part is there')
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status}')
        visit('/ar/emergency')
        step('/ar/emergency signed in: the share-location button, no guest card', page.locator('section[data-guest-action]').count() == 0 and page.get_by_role('button', name=ar['Emergency']['share']).count() == 1, page.url)
        visit('/ar/ai?mode=symptoms')
        step('/ar/ai signed in: the question box, no guest card', page.locator('section[data-guest-action]').count() == 0 and page.locator('textarea').count() >= 1, page.url)
        visit('/ar/home-care/providers')
        step('/ar/home-care/providers signed in: no guest card', page.locator('section[data-guest-action]').count() == 0 and '/ar/login' not in page.url, page.url)
        text, status = visit('/ar/settings/connected-apps')
        step('/ar/settings/connected-apps signed in: the page answers 200', status == 200 and ar['SettingsWeb']['connectedAppsTitle'] in page.inner_text('body'), f'{status} {page.url}')
    except Exception as e:
        step('web guest services 2 flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()
        if data.get('urgent_before'):
            admin.put('/admin/admin/mental-health/urgent-help', {'phone': data['urgent_before']})


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
