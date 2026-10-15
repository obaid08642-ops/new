"""Journey (patient-web in a real browser): pharmacy browse -> product -> cart, and the ways to ask the pharmacies for an
item the catalogue does not have (journeys.json scenario 1 and 8, decisions 11 and 12).
  Stack: backend :8002, admin BFF :3001 (for the admin API session), patient-web :3000 (tools/live/start-web.sh).
  A missing browser or a missing patient-web is a FAIL, never a PASS.
"""
import os
import time
import urllib.parse
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_PATIENT_WEB', 'http://127.0.0.1:3000')
anon = Client()


def published_online_only_medicine(admin):
    """Admin creates an online-only medicine and publishes it (medical review approved), as medicines-catalog.tsx does."""
    tag = uuid.uuid4().hex[:6]
    name_ar = f'فيتامين أونلاين {tag}'
    body = {'name_ar': name_ar, 'name_en': f'Online vitamin {tag}', 'active_ingredient': 'cholecalciferol', 'generic_name': 'vitamin d3',
            'manufacturer': 'Nabd QA', 'category': 'vitamins', 'form': 'tablet', 'strength': '1000IU', 'package_size': '30',
            'price': 25, 'requires_prescription': False, 'online_exclusive': True, 'images': [],
            'description_ar': 'مكمل غذائي', 'description_en': 'supplement', 'reason': 'إنشاء صنف أونلاين فقط للاختبار الحي'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step('admin creates an online-only medicine', r.ok and mid, r)
    if not mid:
        return None, None
    r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    step('admin publishes it (medical review approved)', r.ok, r)
    slug = None
    for _ in range(10):
        r = anon.get('/public/categories/ar/items?' + urllib.parse.urlencode({'category': 'all', 'q': tag, 'page': 1}))
        hit = next((x for x in r.items() if x.get('id') == mid or name_ar in str(x.get('name') or '')), None)
        if hit and hit.get('slug'):
            slug = hit['slug']
            break
        time.sleep(2)
    step('the public catalogue lists the medicine the admin just published', bool(slug), r)
    return slug, name_ar


def main():
    import j_admin
    journey('web pharmacy: setup (admin publishes an online-only medicine)')
    try:
        _, admin = j_admin.login()
    except Exception as e:
        step('admin api session', False, str(e)[:200])
        return
    slug, name_ar = published_online_only_medicine(admin) if admin else (None, None)
    r = anon.get(f'/public/product/ar/{urllib.parse.quote(slug)}') if slug else None
    if slug:
        step('the public product answer carries online_exclusive (decision 11)', r.ok and r.get('online_exclusive') is True, r)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web pharmacy', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web pharmacy', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
    except Exception as e:
        browser.close(); pw.stop()
        return step('web pharmacy', False, f'patient-web not running at {WEB}: {e}')

    journey('web pharmacy: product page shows "online only" and the cart keeps it')
    try:
        if slug:
            page.goto(f'{WEB}/ar/p/{urllib.parse.quote(slug)}', wait_until='load', timeout=60000)
            page.wait_for_selector('h1', timeout=30000)
            step('product page shows the "أونلاين فقط" badge', page.locator('text=أونلاين فقط').count() > 0, 'badge missing')
            robots = page.locator('meta[name="robots"]').first.get_attribute('content') or ''
            step('a published item not cleared for search engines is shown with noindex', 'noindex' in robots, robots)
            page.locator('button:has-text("أضف للسلة"):visible').first.click()
            page.wait_for_timeout(800)
            page.goto(f'{WEB}/ar/cart', wait_until='load', timeout=60000)
            page.wait_for_selector(f'text={name_ar}', timeout=30000)
            step('cart line added from the product page says "أونلاين فقط"', page.locator('li', has_text=name_ar).locator('text=أونلاين فقط').count() > 0, 'no online-only note on the line')
            link = page.locator('a[href$="/ar/pharmacy/request"]')
            step('cart offers "can\'t find your medicine? add a manual request" (issue 1081)', link.count() > 0, f'{link.count()} link(s)')
    except Exception as e:
        step('product and cart flow', False, str(e)[:300])

    journey('web pharmacy: a search that finds nothing offers to ask the pharmacies (issue 1080)')
    try:
        term = f'دواء غير موجود {uuid.uuid4().hex[:6]}'
        page.goto(f'{WEB}/ar/c?q={urllib.parse.quote(term)}', wait_until='load', timeout=60000)
        page.wait_for_timeout(1500)
        ask = page.locator('a[href*="/ar/pharmacy/request?name="]')
        step('empty search shows "ask nearby pharmacies" with the term', ask.count() > 0, f'{ask.count()} link(s)')
        if ask.count():
            href = ask.first.get_attribute('href') or ''
            step('the link carries the searched term', urllib.parse.unquote(href.split('name=', 1)[-1]) == term, href)
    except Exception as e:
        step('empty search flow', False, str(e)[:300])

    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
