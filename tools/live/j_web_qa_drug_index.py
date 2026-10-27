"""Journey (QA DI-01, patient-web in a real browser): the drug index, search and detail, as a visitor.
  - the admin creates and approves two medicines (j_pharmacy.admin_adds_medicines, and a medicine with a unique English name
    for this run), so both are public;
  - the API search finds them (GET /medicines?q=), the same search the website uses;
  - the visitor searches the website for the unique name (/ar/c?q=): the result list shows the medicine, and after a reload it still does;
  - the visitor opens the medicine's detail page (/ar/p/<slug>, slug from the API): it shows the name, and after a reload it still does.
The unique name keeps the search result on this run's item: the catalogue is sorted by popularity and seeded items with the same
name would otherwise fill the first results.
Scope: the public catalogue as a visitor. The pharmacy-side drug index inside the provider app is not covered here.
A missing browser or website is a FAIL, never a PASS."""
import os
import urllib.parse
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_admin, j_pharmacy
    from j_pharmacy import catalog_body
    from playwright.sync_api import sync_playwright
    from lib import summary
    admin, _ = j_admin.login()
    meds = j_pharmacy.admin_adds_medicines(admin)
    if not meds:
        summary()
        return
    med = meds[0]
    name_en = med.get('name_en') or ''
    name_ar = med.get('name_ar') or ''

    tag = uuid.uuid4().hex[:8]
    unique = catalog_body(f'دواء بحث {tag}', f'Search Drug {tag}', 9.0)
    r = admin.post('/medicines/admin/catalog', unique)
    uid = r.get('id')
    step('the admin creates a medicine with a unique name for this run', r.ok and uid, r)
    if not uid:
        summary()
        return
    j_pharmacy.admin_approves(admin, uid, unique['name_en'])

    journey('drug index DI-01 (API): the approved medicines are searchable')
    r = Client(None, 'anon').get('/medicines?q=' + urllib.parse.quote(name_en) + '&limit=50')
    found = next((x for x in r.items() if x.get('id') == med.get('id')), None)
    step('GET /medicines?q= finds the approved medicine', r.ok and found is not None, r.status)
    r = Client(None, 'anon').get('/medicines?q=' + urllib.parse.quote(unique['name_en']) + '&limit=50')
    step('GET /medicines?q= finds the unique medicine', r.ok and any(x.get('id') == uid for x in r.items()), r.status)

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('drug index DI-01 (web): the visitor searches the catalogue for the medicine')
        page.goto(f'{WEB}/ar/c?q={urllib.parse.quote(unique["name_en"])}', wait_until='load', timeout=60000)
        try:
            page.get_by_text(unique['name_ar']).first.wait_for(state='attached', timeout=60000)
            shown = True
        except Exception:
            shown = False
        step('the search page lists the medicine for its name', shown, page.url)
        page.reload(wait_until='load')
        try:
            page.get_by_text(unique['name_ar']).first.wait_for(state='attached', timeout=60000)
            shown = True
        except Exception:
            shown = False
        step('after reload the search page still lists the medicine', shown, page.url)

        journey('drug index DI-01 (web): the detail page of the medicine as a visitor')
        slug = (found or {}).get('slug') or med.get('id')
        page.goto(f'{WEB}/ar/p/{urllib.parse.quote(str(slug))}', wait_until='load', timeout=60000)
        body = page.inner_text('body')
        step('the detail page opens and shows the medicine name (Arabic)', bool(name_ar) and name_ar in body, page.url)
        page.reload(wait_until='load')
        body = page.inner_text('body')
        step('after reload the detail still shows the medicine name', bool(name_ar) and name_ar in body, page.url)
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
