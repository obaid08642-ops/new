"""Journey (patient-web, real browser): the public catalogue with real rows, compare from a product page, a missing product
(batch-1a-web 0, 8, 10).
  - The admin publishes two medicines with the same active ingredient (TEST data). The public catalogue lists them, the
    product page shows the other as an alternative and links to compare them; the compare page reads both through
    POST /medicines/compare (one call, as the app) and draws the catalogue's own fields (form, strength).
  - A missing product page is not indexable (noindex).
  Stack: backend :8002, patient-web :3100.
"""
import os
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def medicine(admin, tag, name_ar, name_en, strength, price):
    body = {'name_ar': name_ar, 'name_en': name_en, 'active_ingredient': f'compareol-{tag}', 'generic_name': f'compareol-{tag}',
            'manufacturer': 'Nabd Test', 'brand': name_en, 'category': 'vitamins', 'sub_category': '', 'form': 'tablet', 'strength': strength,
            'package_size': '20', 'barcode': '', 'price': price, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار للمقارنة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid:
        admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    step(f'admin publishes {name_en}', r.ok and mid, r)
    return mid


def main():
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    a = medicine(admin, tag, f'كومبارول {tag} 500', f'Compareol {tag} 500', '500mg', 18)
    b = medicine(admin, tag, f'كومبارول {tag} 250', f'Compareol {tag} 250', '250mg', 11)
    if not (a and b):
        return
    anon = Client(None, 'anon')
    slug = anon.get(f'/public/product-by-id/ar/{a}').get('slug')
    step('the first medicine has a public page', slug, slug)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    page = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}).new_page()
    try:
        journey('batch-1a-web#0: the public catalogue shows real rows')
        page.goto(f'{WEB}/ar/c?q=compareol-{tag}', wait_until='load', timeout=60000)
        found = page.get_by_text(f'كومبارول {tag}', exact=False)
        found.first.wait_for(timeout=30000)
        step('the catalogue lists the published medicines', found.count() >= 2, found.count())

        journey('batch-1a-web#8: compare from the product page')
        page.goto(f'{WEB}/ar/p/{slug}', wait_until='load', timeout=60000)
        link = page.get_by_role('link', name='قارن بالبدائل')
        link.wait_for(timeout=30000)
        href = link.get_attribute('href') or ''
        step('the product page links to compare it with its alternative', a in href and b in href, href)
        page.goto(f'{WEB}{href}', wait_until='load', timeout=60000)
        table = page.locator('table').first
        table.wait_for(timeout=30000)
        text = ' '.join(t.inner_text() for t in page.locator('table').all())
        step('the compare table has both medicines', f'كومبارول {tag} 500' in text and f'كومبارول {tag} 250' in text, text[:300])
        step('and the catalogue fields (strength 500mg / 250mg)', '500mg' in text and '250mg' in text, text[:300])

        journey('batch-1a-web#10: a missing product is not indexable')
        page.goto(f'{WEB}/ar/p/no-such-product-{tag}', wait_until='load', timeout=60000)
        robots = page.locator('meta[name="robots"]').evaluate_all('(els) => els.map((e) => e.content)')
        step('the missing product page says noindex', any('noindex' in r for r in robots), robots)

    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
