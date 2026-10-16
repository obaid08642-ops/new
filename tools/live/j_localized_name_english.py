"""Journey (API + patient-web, real browser): owner decision E (issue 1556) — names in ur, hi and bn.
  - The admin publishes a medicine (TEST data) whose ur/hi/bn names are set on the TEST database.
  - The public product answer in ur, hi and bn carries the English name; in ar, en and fil it does not.
  - The catalogue search finds the product by its Hindi, Urdu or Bengali name and by its English name.
  - The ur and hi product pages draw the English name under the localized one; the ar page does not.
  Stack: backend :8002, patient-web :3100, local Mongo in the `mongo` container (TEST database only).
"""
import json
import os
import subprocess
import urllib.parse
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def set_names(mid, names):
    """TEST database only: the localized names the catalogue import fills in production."""
    db = os.environ.get('DB_NAME') or 'nabd_live'
    sets = {f'translations.{k}.name': v for k, v in names.items()}
    js = f'db.getSiblingDB("{db}").medicines.updateOne({{id: {json.dumps(mid)}}}, {{$set: {json.dumps(sets, ensure_ascii=False)}}}).modifiedCount'
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', '--eval', js], capture_output=True, text=True, timeout=60)
    return out.stdout.strip()


def main():
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    name_en = f'Duonamol {tag} 500 mg 24 Tablets'
    names = {'ur': f'ڈیونامول {tag} 500', 'hi': f'ड्यूनामोल {tag} 500', 'bn': f'ডুনামল {tag} 500', 'tl': f'Duonamol {tag} 500 tableta'}
    body = {'name_ar': f'ديونامول {tag} 500', 'name_en': name_en, 'active_ingredient': f'duonamol-{tag}', 'generic_name': f'duonamol-{tag}',
            'manufacturer': 'Nabd Test', 'brand': 'Duonamol', 'category': 'vitamins', 'sub_category': '', 'form': 'tablet', 'strength': '500mg',
            'package_size': '24', 'barcode': '', 'price': 14, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار للأسماء'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step('admin adds the medicine (TEST data)', r.ok and mid, r)
    if not mid:
        return
    step('its ur/hi/bn/tl names are set on the TEST database', set_names(mid, names) == '1')
    a = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    step('admin publishes it', a.ok, a)
    anon = Client(None, 'anon')

    journey('decision E: the public answer carries the English name for ur, hi and bn only')
    for loc in ('ur', 'hi', 'bn'):
        d = anon.get(f'/public/product-by-id/{loc}/{mid}')
        step(f'{loc}: localized name with the English name under it', d.get('name') == names[loc] and d.get('english_name') == name_en, {k: d.get(k) for k in ('name', 'english_name')})
    for loc in ('ar', 'en', 'fil'):
        d = anon.get(f'/public/product-by-id/{loc}/{mid}')
        step(f'{loc}: no English line', d.ok and not d.get('english_name'), {k: d.get(k) for k in ('name', 'english_name')})

    journey('decision E: the search matches the localized and the English names')
    for label, term in (('Hindi', names['hi']), ('Urdu', names['ur']), ('Bengali', names['bn']), ('English', f'Duonamol {tag}')):
        res = anon.get(f'/medicines?search={urllib.parse.quote(term)}&page=1&limit=20')
        ids = [x.get('id') for x in res.items() if isinstance(x, dict)]
        step(f'the catalogue search finds it by its {label} name', mid in ids, ids[:5])

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    try:
        journey('decision E: the product page draws the English name under the localized one')
        for loc, expect in (('ur', True), ('hi', True), ('ar', False)):
            slug = anon.get(f'/public/product-by-id/{loc}/{mid}').get('slug')
            page = browser.new_context(viewport={'width': 390, 'height': 844}).new_page()
            page.goto(f'{WEB}/{loc}/p/{slug}', wait_until='load', timeout=60000)
            page.locator('h1').first.wait_for(timeout=30000)
            en = page.get_by_test_id('english-name')
            if expect:
                ok = en.count() == 1 and en.inner_text().strip() == name_en and page.locator('h1').first.inner_text().strip() == names[loc]
                step(f'{loc} page: the English name under the {loc} name', ok, page.locator('h1').first.inner_text())
            else:
                step(f'{loc} page: no English line under the name', en.count() == 0, en.count())
            page.close()
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
