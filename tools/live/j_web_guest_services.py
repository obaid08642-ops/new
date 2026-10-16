"""Journey (patient-web in a real browser, issue 1550 part 1): the service pages a guest opens before signing in.
  /ar/offers, /ar/insurance, /ar/home-care, /ar/maternity, /ar/mental-health and /ar/nutrition used to show only the
  sign-in form to a guest, and /ar/map stayed empty because its list came through the patient proxy (401 for a guest).
  Now, signed out: each page shows its public part from real public reads (an offer, an insurer with its plan, a home
  care service with its price and a provider, the doctors of the specialty), the one action that needs an account opens
  the sign-in with the way back, the map lists the facility, and no request of the visit answers 401. Signed in, the
  patient's own part is there again. The data is seeded through the admin and provider APIs.
  Stack: backend :8002, patient-web :3100.
"""
import json
import os
import urllib.parse
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
MESSAGES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../patient-web/messages/ar.json')


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def approved(admin, ptype, overrides=None, location=None):
    """A provider registers in the provider app (its own wizard payload), the admin approves it; returns its public id."""
    import j_onboarding
    p = j_onboarding.register_type(ptype, overrides or {})
    if location:
        r = Client(p['token'], ptype).post('/provider-onboarding/step2', {'location': location, 'city': 'الرياض'})
        step(f'the {ptype} saves its location', r.ok, r)
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    return Client(p['token'], ptype).get('/provider-onboarding/my-profile').get('id')


def seed(admin, tag):
    """Public data of every service, through the admin and provider APIs."""
    anon = Client(None, 'anon')
    out = {}

    journey('seed: an offer campaign (admin promotions)')
    r = admin.post('/promotions', {'title_ar': f'عرض فحص شامل {tag}', 'title_en': f'Full checkup {tag}', 'original_price': 300, 'discounted_price': 199, 'status': 'active'})
    step('admin publishes the offer', r.ok, r)
    out['offer'] = f'عرض فحص شامل {tag}'

    journey('seed: an insurer with a plan (admin insurance companies)')
    code = f'gs{tag}'
    r = admin.post('/insurance/companies', {'code': code, 'name_ar': f'تأمين الضيف {tag}', 'name_en': f'Guest Insure {tag}'})
    step('admin creates the insurer', r.ok, r)
    company = next((x for x in rows(admin.get('/insurance/companies/all')) if x.get('code') == code), {})
    cid = company.get('id')
    if company and not company.get('is_active'):
        r = admin.patch(f'/insurance/companies/{cid}', {'is_active': True})
        step('admin activates it', r.ok, r)
    r = admin.post(f'/insurance/companies/{cid}/networks', {'code': f'gold{tag}', 'name_ar': f'ذهبية {tag}', 'name_en': f'Gold {tag}', 'tier_level': 1})
    step('admin adds a plan tier', r.ok, r)
    out['insurer'], out['plan'] = f'تأمين الضيف {tag}', f'ذهبية {tag}'

    journey('seed: a home care service with its price and a home care provider')
    r = admin.post('/nursing/admin/catalog', {'name_ar': f'عناية منزلية بالضيف {tag}', 'name_en': f'Guest home care {tag}', 'category': 'general', 'price': 237, 'duration': '60 دقيقة', 'active': True})
    sid = r.get('id')
    step('admin creates the service', r.ok and sid, r)
    r = admin.put(f'/nursing/admin/catalog/{sid}', {'medical_review_status': 'approved'})
    step('admin publishes it', r.ok and r.get('public_eligibility') is True, r)
    out['service'], out['service_id'], out['service_price'] = f'عناية منزلية بالضيف {tag}', sid, 237
    hc = approved(admin, 'home_care')
    row = next((x for x in rows(anon.get('/providers?type=home_care')) if x.get('id') == hc), {})
    step('the home care provider is in the public list', bool(row), hc)
    out['home_care'] = row.get('name_ar') or row.get('name_en') or ''

    journey('seed: a doctor of each care specialty')
    for specialty in ('gynecology', 'psychiatry', 'nutrition'):
        did = approved(admin, 'doctor', {'specialty': specialty})
        listed = [x.get('id') for x in rows(anon.get(f'/care/doctors?specialty={specialty}&limit=50'))]
        step(f'the {specialty} doctor is in the public doctor list', did in listed, listed[:5])
        out[specialty] = did

    journey('seed: a hospital with its position (the map)')
    hid = approved(admin, 'hospital', location={'lat': 24.72, 'lng': 46.68})
    row = next((x for x in rows(anon.get('/providers/map?type=hospital')) if x.get('id') == hid), {})
    step('the hospital is on the public map read', bool(row), hid)
    out['hospital'] = row.get('name_ar') or row.get('name_en') or ''
    return out


def main():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    data = seed(admin, tag)
    acct = j_accounts.app_signup(label='guestsvc')
    with open(MESSAGES, encoding='utf-8') as f:
        ar = json.load(f)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web guest services', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    unauthorized = []
    page.on('response', lambda res: unauthorized.append(f'{res.status} {res.url}') if res.status == 401 else None)

    def visit(path):
        page.goto(f'{WEB}{path}', wait_until='load', timeout=60000)
        try:
            # a signed-in page keeps a request open (notifications), so a settled network is waited for briefly only
            page.wait_for_load_state('networkidle', timeout=8000)
        except Exception:
            pass
        return page.locator('main').first.inner_text() if page.locator('main').count() else page.inner_text('body')

    def amount(value, style):
        """The amount the page writes, formatted by the browser for Arabic exactly as the page does."""
        if style == 'money':
            return page.evaluate("v => new Intl.NumberFormat('ar', {style: 'currency', currency: 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2}).formatToParts(v).filter(p => p.type !== 'currency' && p.type !== 'literal').map(p => p.value).join('')", value)
        return page.evaluate("v => new Intl.NumberFormat('ar', {maximumFractionDigits: 2}).format(v)", value)

    def action_leads_to_sign_in(path, next_path):
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
        journey('issue 1550: a guest sees each service before signing in')
        text = visit('/ar/offers')
        step('/ar/offers: the guest sees the seeded offer, not the sign-in form', '/ar/login' not in page.url and data['offer'] in text, f'url={page.url} text={text[:200]}')
        step('/ar/offers: with its price', amount(199, 'number') in text, text[:300])
        action_leads_to_sign_in('/ar/offers', '/ar/offers')

        text = visit('/ar/insurance')
        step('/ar/insurance: the guest sees the seeded insurer and its plan', '/ar/login' not in page.url and data['insurer'] in text and data['plan'] in text, f'url={page.url} text={text[:200]}')
        action_leads_to_sign_in('/ar/insurance', '/ar/insurance/add-policy')

        text = visit('/ar/home-care')
        step('/ar/home-care: the guest sees the seeded service with its price', '/ar/login' not in page.url and data['service'] in text and amount(data['service_price'], 'money') in text, f'url={page.url} text={text[:300]}')
        step('/ar/home-care: the service opens its public page', page.locator(f'a[href="/ar/home-care/services/{data["service_id"]}"]').count() == 1, data['service_id'])
        step('/ar/home-care: and the seeded home care provider is listed', bool(data['home_care']) and data['home_care'] in text, data['home_care'])
        action_leads_to_sign_in('/ar/home-care', '/ar/home-care')

        for path, specialty, next_path in (('/ar/maternity', 'gynecology', '/ar/maternity/maternity-setup'),
                                            ('/ar/mental-health', 'psychiatry', '/ar/mental-health/mood'),
                                            ('/ar/nutrition', 'nutrition', '/ar/nutrition?tab=plan')):
            text = visit(path)
            doctor = data[specialty]
            step(f'{path}: the guest sees the service and its seeded {specialty} doctor', '/ar/login' not in page.url and page.locator(f'a[href="/ar/consultations/doctors/{doctor}"]').count() == 1, f'url={page.url} text={text[:200]}')
            action_leads_to_sign_in(path, next_path)

        journey('issue 1550: the map lists the facilities for a guest')
        visit('/ar/map')
        listed = 0
        if data['hospital']:
            try:
                page.locator('ul li', has_text=data['hospital']).first.wait_for(timeout=30000)
            except Exception:
                pass
            listed = page.locator('ul li', has_text=data['hospital']).count()
        step('/ar/map: the seeded hospital is on the list', listed >= 1, f"{data['hospital']} {page.inner_text('main')[:200] if page.locator('main').count() else ''}")
        step('no request of the guest visit answered 401', not unauthorized, unauthorized[:5])

        journey('issue 1550: signed in, the personal part is there')
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status}')
        visit('/ar/offers')
        step('/ar/offers signed in: the list without the guest card', data['offer'] in page.inner_text('body') and page.locator('section[data-guest-action]').count() == 0, page.url)
        visit('/ar/insurance')
        step('/ar/insurance signed in: the policy card and the tabs', page.locator('section[data-guest-action]').count() == 0 and ar['InsuranceWeb']['tabPolicy'] in page.inner_text('body'), page.url)
        visit('/ar/home-care')
        step('/ar/home-care signed in: the patient\'s own bookings section', page.locator('#home-care-bookings').count() == 1, page.url)
        visit('/ar/maternity')
        step('/ar/maternity signed in: the patient\'s maternity profile (empty: the setup)', page.locator('section[data-guest-action]').count() == 0 and ar['MaternityWeb']['emptyTitle'] in page.inner_text('body'), page.url)
        visit('/ar/mental-health')
        step('/ar/mental-health signed in: the patient\'s mood summary', page.locator(f'ul[aria-label="{ar["MentalWeb"]["summary"]}"]').count() == 1, page.url)
        visit('/ar/nutrition')
        step('/ar/nutrition signed in: the patient\'s day', page.locator('section[data-guest-action]').count() == 0 and ar['NutritionWeb']['todayTitle'] in page.inner_text('body'), page.url)
    except Exception as e:
        step('web guest services flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
