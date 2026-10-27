"""Journey (QA MP-01, patient-web in a real browser): the providers map lists an approved doctor as a card.
  - an approved doctor in Riyadh publishes clinic hours (the same setup as j_qa_map_book.py);
  - the API lists the doctor on GET /providers/map?type=doctor (the count is the server's);
  - the anonymous visitor opens /ar/map: the list (aria-label mapList) shows the doctor's card by name;
  - the card's main button selects it (aria-pressed true), and its booking link points at the doctor profile;
  - after a reload the card is still listed.
MP-02 (same run): the card's booking link opens this doctor's profile page, which shows the doctor's name.
  The booking and card payment on the website are in j_web_qa_map_book.py.
The map markers are not clicked here. The type filter buttons are clicked (doctor, then pharmacy, then doctor again): the doctor card follows the filter.
A missing browser or website is a FAIL, never a PASS."""
import json
import os

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
HOME = {'lat': 24.7136, 'lng': 46.6753}
HERE = os.path.dirname(os.path.abspath(__file__))


def find_key(node, key):
    """The Arabic label of a message key (patient-web/messages/ar.json), so the journey clicks the text the patient sees."""
    if isinstance(node, dict):
        if isinstance(node.get(key), str):
            return node[key]
        for v in node.values():
            found = find_key(v, key)
            if found:
                return found
    return None


def main():
    import j_admin, j_onboarding, j_consultation
    from playwright.sync_api import sync_playwright
    from lib import summary
    admin, _ = j_admin.login()
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    Client(d['token'], 'doctor').post('/provider-onboarding/step2', {'location': HOME, 'city': 'الرياض'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doc = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic',))
    profile_id = doc.get('/provider-onboarding/my-profile').get('id')

    journey('providers map MP-01 (API): the approved doctor is a card on the map')
    api = Client(None, 'anon').get('/providers/map?type=doctor')
    card = next((x for x in (api.body if isinstance(api.body, list) else api.items()) if x.get('id') == profile_id), None)
    step('the approved doctor is a card on GET /providers/map?type=doctor', api.ok and card is not None, f'{api.status}')
    if not card:
        summary()
        return
    name = card.get('name') or card.get('name_ar') or card.get('name_en')

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('providers map MP-01 (web): the card is listed, selected and links to the profile')
        page.goto(f'{WEB}/ar/map', wait_until='load', timeout=60000)
        lst = page.locator('ul[aria-label]').first
        lst.wait_for(timeout=60000)
        row = lst.locator('li', has=page.locator(f'a[href*="{profile_id}"]')).first
        step('the map list shows this doctor card (its booking link carries the profile id)', row.count() > 0, profile_id)
        main_btn = row.locator('button').first
        main_btn.click()
        step('the card is selected (aria-pressed true)', main_btn.get_attribute('aria-pressed') == 'true', main_btn.get_attribute('aria-pressed'))
        href = ''
        booking = row.locator('a[href*="/care/"], a[href*="/doctors/"], a[href*="/book"]')
        step('the card links to the doctor booking page', booking.count() > 0 and str(profile_id) in (booking.first.get_attribute('href') or ''), booking.first.get_attribute('href') if booking.count() else href)
        page.reload(wait_until='load')
        lst = page.locator('ul[aria-label]').first
        lst.wait_for(timeout=60000)
        step('after reload the doctor card is still listed', lst.locator('li', has=page.locator(f'a[href*="{profile_id}"]')).count() > 0, profile_id)

        journey('providers map MP-01 (web): the type filter narrows the list')
        msgs = json.load(open(os.path.join(HERE, '..', '..', 'patient-web', 'messages', 'ar.json'), encoding='utf-8'))
        doc_btn = page.locator('button[aria-pressed]', has_text=find_key(msgs, 'filterDoctors')).first
        pharm_btn = page.locator('button[aria-pressed]', has_text=find_key(msgs, 'filterPharmacies')).first

        def card_listed():
            return page.locator('ul[aria-label]').first.locator('li', has=page.locator(f'a[href*="{profile_id}"]')).count() > 0

        doc_btn.click()
        step('the doctor filter is pressed', doc_btn.get_attribute('aria-pressed') == 'true', doc_btn.get_attribute('aria-pressed'))
        step('the doctor card is listed under the doctor filter', card_listed(), profile_id)
        pharm_btn.click()
        step('the pharmacy filter is pressed', pharm_btn.get_attribute('aria-pressed') == 'true', pharm_btn.get_attribute('aria-pressed'))
        step('the doctor card leaves the list under the pharmacy filter', not card_listed(), profile_id)
        doc_btn.click()
        step('the doctor card is listed again under the doctor filter', card_listed(), profile_id)

        journey('providers map MP-02 (web): the card opens the doctor profile')
        row = lst.locator('li', has=page.locator(f'a[href*="{profile_id}"]')).first
        profile_link = row.locator(f'a[href*="/consultations/doctors/{profile_id}"]').first
        profile_link.click()
        page.wait_for_url(f'**/consultations/doctors/{profile_id}**', timeout=60000)
        step('the card opens the doctor profile page (this doctor)', profile_id in page.url, page.url)
        step('the profile shows the doctor name from the card', name in page.inner_text('body'), name)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
