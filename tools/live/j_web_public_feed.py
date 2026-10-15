"""Journey: the public services feed and the website's services pages (13-web#6 issue 791, 13-web#7 issue 792).
  GET /public/ai-catalog/services feeds the AI catalogue and patient-web /services/<service>/<city>.
  - it lists only doctors and facilities the public pages show (approved, public): a doctor still in review is not listed;
  - a listed doctor carries its own clinic price and insurers, never an invented "150 SAR" or insurer list;
  - every listed entry opens its own public page, and the website card opens that page (not /services, which goes home);
  - the "Register as a provider" button on an empty labs/radiology/pharmacies city page opens /provider-info.
"""
import os
import re
import urllib.parse

from lib import Client, WebClient, journey, step

CITY = 'الرياض'
WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def run():
    import j_admin, j_onboarding
    admin, _ = j_admin.login()
    anon = Client(None, 'anon')
    # A doctor still in review, and one the admin approved (as j_concurrency.ensure_doctor does).
    pending = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    approved = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    j_onboarding.admin_review(admin, approved)
    j_onboarding.provider_after_approval(approved)
    mine = lambda p: Client(p['token'], 'doctor').get('/provider-onboarding/my-profile')
    pend, appr = mine(pending), mine(approved)
    step('both doctors have a profile', pend.get('id') and appr.get('id'), f'{pend} {appr}')

    journey('public feed: only approved, public providers, with their own price and insurers')
    r = anon.get('/public/ai-catalog/services?city=' + urllib.parse.quote(CITY))
    items = r.get('items') or []
    ids = [x.get('id') for x in items]
    step('the feed answers', r.ok, r)
    step('a doctor still in review is not listed', pend.get('id') not in ids, f'{len(items)} items')
    step('the approved doctor is listed', appr.get('id') in ids, f'{len(items)} items')
    doc = next((x for x in items if x.get('id') == appr.get('id')), {})
    price = appr.get('price_clinic')
    want_price = f'{price} SAR' if isinstance(price, (int, float)) and price > 0 else None
    step('the listed price is the doctor\'s own clinic price (none invented)', doc.get('priceRange') == want_price,
         f"feed={doc.get('priceRange')} profile={price}")
    step('the listed insurers are the doctor\'s own (none invented)',
         doc.get('acceptedInsurance') == (appr.get('accepted_insurance') or []),
         f"feed={doc.get('acceptedInsurance')} profile={appr.get('accepted_insurance')}")
    dead = []
    for x in items:
        m = re.search(r'/(doctor|facility)/([^/?#]+)$', x.get('url') or '')
        if not m or not anon.get(f'/entity-graph/related/{m.group(1)}/{m.group(2)}').ok:
            dead.append(x.get('url'))
    step('every listed entry opens its own public page', items and not dead, f'{len(dead)} without a public page: {dead[:3]}')

    journey('website: the services card opens the provider page; the provider button opens /provider-info')
    web = WebClient(WEB)
    page = web.get(f'/ar/services/all/{urllib.parse.quote(CITY)}')
    html = page.body if page.status == 200 and isinstance(page.body, str) else ''
    step('the services page for the city opens', page.status == 200, page)
    href = f"/ar/doctor/{doc.get('slug') or ''}"
    step('the approved doctor\'s card opens the doctor page', bool(doc.get('slug')) and f'href="{href}"' in html, href)
    step('no card points to /ar/services (which goes to the home page)', 'href="/ar/services"' not in html, None)
    opened = web.get(href) if doc.get('slug') else None
    step('the doctor page opens', opened is not None and opened.status == 200, opened)
    # A city with no pharmacy: the empty page shows the provider button (same button on labs and radiology).
    empty = web.get('/ar/pharmacies/' + urllib.parse.quote('مدينة-بلا-صيدليات'))
    body = empty.body if empty.status == 200 and isinstance(empty.body, str) else ''
    # LinkEmptyState draws a button that opens its actionHref (the prop is in the page's server payload).
    step('the empty pharmacies city page offers "Register as a provider" -> /provider-info',
         'actionHref\\":\\"/ar/provider-info' in body and 'actionHref\\":\\"/ar/consultations/doctors' not in body, empty)
    step('/provider-info opens', web.get('/ar/provider-info').status == 200, None)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
