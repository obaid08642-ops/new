"""Journey (QA DI-01, patient-web in a real browser): the drug index, search and detail, as a visitor.
  - the admin creates and approves a medicine (j_pharmacy.admin_adds_medicines), so it is public;
  - the API search finds it (GET /medicines?q=), the same search the website uses;
  - the visitor opens the item's detail page (/ar/p/<slug>, slug from the API): it shows the name, and after a reload it still does.
  The web search page (/ar/c?q=) is not used to find this item: the page is sorted by popularity and seeded items with the same name
  fill the first results, so the search result for this run's item is not proven on the page (the API search is).
Scope: the public catalogue as a visitor. The pharmacy-side drug index inside the provider app is not covered here.
A missing browser or website is a FAIL, never a PASS."""
import os
import urllib.parse

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_admin, j_pharmacy
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
    journey('drug index DI-01 (API): the approved medicine is searchable')
    r = Client(None, 'anon').get('/medicines?q=' + urllib.parse.quote(name_en) + '&limit=50')
    found = next((x for x in r.items() if x.get('id') == med.get('id')), None)
    step('GET /medicines?q= finds the approved medicine', r.ok and found is not None, r.status)

    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
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
