"""Journey: the prescription and online-only facts reach every answer and web screen that shows a medicine
(needs-review rx-rules-web #1-#6, rx-rules-app #2-#4; owner decisions 10 and 11).
  - The admin publishes an online-only medicine and a prescription medicine (TEST data, a category of its own).
  - Card answers (category items, product search), the public product answer, the wishlist, GET /home/search, GET /search
    and the order detail carry requires_prescription / online_exclusive; a prescription item never carries an old price or
    a discount.
  - The admin maps the prescription medicine's category to a specialty through the admin panel's route
    (admin/src/pages/admin/config-portal.tsx, tab "استشر طبيب"), and "Consult a doctor" answers that specialty. The
    mapping that was there before is put back at the end.
  - patient-web (real browser): the catalogue card, the wishlist row and the search row say "online only" / "needs a
    prescription"; a line added from a card or from the reorder picker keeps "online only" in the cart.
  Stack: backend :8002, admin BFF :3001, patient-web :3100. A missing browser or patient-web is a FAIL, never a PASS.
"""
import os
import time
import urllib.parse
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
RX_CONSULT = '/admin/admin/pharmacy/rx-consult-specialties'  # the admin page's fetch: /api/admin/admin/pharmacy/...
SPECIALTY = 'internal_medicine'
ONLINE_ONLY = 'أونلاين فقط'      # messages/ar.json PublicProduct.onlineOnly / CartScreen.onlineOnly
RX_REQUIRED = 'يتطلب وصفة طبية'  # messages/ar.json PublicProduct.rxRequired
anon = Client(None, 'anon')


def publish(admin, tag, name_ar, name_en, category, rx, online):
    """admin/src/pages/admin/medicines-catalog.tsx saveForm (create), then the medical review approves it."""
    body = {'name_ar': name_ar, 'name_en': name_en, 'active_ingredient': f'rxrulesol-{tag}', 'generic_name': f'rxrulesol-{tag}',
            'manufacturer': 'Nabd QA', 'brand': name_en, 'category': category, 'sub_category': '', 'form': 'tablet', 'strength': '10mg',
            'package_size': '20', 'barcode': '', 'price': 30, 'requires_prescription': rx, 'online_exclusive': online, 'images': [], 'image': '',
            'description_ar': 'صنف اختبار', 'description_en': 'test item', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار لقواعد الوصفة والأونلاين'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step(f'admin creates {name_en} (rx={rx}, online_exclusive={online})', r.ok and mid, r)
    if not mid:
        return None
    r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    step(f'admin publishes {name_en}', r.ok, r)
    return mid


def card_hit(path, mid):
    for _ in range(10):
        r = anon.get(path)
        hit = next((x for x in r.items() if x.get('id') == mid), None)
        if hit:
            return r, hit
        time.sleep(2)
    return r, None


def api_checks(tag, online_id, rx_id):
    journey('rx-rules-web#1: card answers send online_exclusive next to is_rx')
    r, hit = card_hit('/public/categories/ar/items?' + urllib.parse.urlencode({'category': 'all', 'q': tag, 'page': 1}), online_id)
    step('category items: the online-only card says online_exclusive=true', hit and hit.get('online_exclusive') is True, hit or r)
    _, rx_card = card_hit('/public/categories/ar/items?' + urllib.parse.urlencode({'category': 'all', 'q': tag, 'page': 1}), rx_id)
    step('category items: the prescription card says is_rx=true, online_exclusive=false', rx_card and rx_card.get('is_rx') is True and rx_card.get('online_exclusive') is False, rx_card)
    r, hit = card_hit('/public/products/search?' + urllib.parse.urlencode({'q': f'rxrulesol-{tag}', 'locale': 'ar'}), online_id)
    step('product search: the online-only card says online_exclusive=true', hit and hit.get('online_exclusive') is True, hit or r)
    slug = (hit or {}).get('slug')

    journey('rx-rules-web#2: a prescription item never carries an old price or a discount')
    r = anon.get(f'/public/product-by-id/ar/{rx_id}')
    step('the public product answer of the new Rx item: no old price, no discount', r.ok and r.get('is_rx') is True and r.get('old_price') is None
         and r.get('discount_percent') in (0, None) and r.get('has_discount') in (False, None), r)
    rx_rows = []
    for page in (1, 2, 3):
        rows = anon.get('/public/categories/ar/items?' + urllib.parse.urlencode({'category': 'all', 'page': page, 'limit': 48})).items()
        rx_rows += [x for x in rows if x.get('is_rx') is True]
    step('the catalogue has prescription cards to check (seeded catalogue)', len(rx_rows) > 0, f'{len(rx_rows)} rx cards')
    with_old = [x.get('id') for x in rx_rows if x.get('old_price') not in (None, 0)]
    step('no prescription card carries an old price', not with_old, with_old[:5])
    bad = []
    for x in rx_rows[:5]:
        p = anon.get(f"/public/product-by-id/ar/{x.get('id')}")
        if p.ok and (p.get('old_price') is not None or p.get('has_discount') is True or (p.get('discount_percent') or 0) > 0):
            bad.append(x.get('id'))
    step('no prescription product answer carries old_price / discount_percent / has_discount', not bad, bad)
    return slug


def search_index_checks():
    """GET /search (the web and app search pages) reads the index; admin-published items are not indexable, so the
    index's own seeded rows are checked. Returns the Arabic name of an indexed prescription medicine."""
    journey('rx-rules-web#4: GET /search medicine rows carry requires_prescription and online_exclusive')
    rx_name = None
    seen = []
    tries = 0
    for page in (1, 2, 3):
        for x in anon.get('/public/categories/ar/items?' + urllib.parse.urlencode({'category': 'all', 'page': page, 'limit': 48})).items():
            if x.get('is_rx') is True and x.get('name') and tries < 40:
                tries += 1
                r = anon.get('/search?' + urllib.parse.urlencode({'q': x['name'][:60], 'locale': 'ar', 'section': 'pharmacy', 'limit': '10'}))
                rows = r.items() or [i for g in (r.get('groups') or []) for i in (g.get('items') or [])]
                seen += rows
                if any(i.get('id') == x.get('id') and i.get('requires_prescription') is True for i in rows):
                    rx_name = x['name'][:60]
                    break
        if rx_name:
            break
    meds = [i for i in seen if i.get('type') == 'medicine']
    step('every medicine row of /search carries a boolean online_exclusive', meds and all(isinstance(i.get('online_exclusive'), bool) for i in meds), meds[:3])
    step('an indexed prescription medicine says requires_prescription=true', bool(rx_name), f'{len(meds)} medicine rows read')
    return rx_name


def main():
    import j_admin, j_accounts
    from j_pharmacy import KEY, patient_address
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    category = f'اختبار وصفة {tag}'
    journey('rx-rules: setup (admin publishes an online-only and a prescription medicine)')
    online_name = f'فيتامين أونلاين {tag}'
    rx_name_new = f'دواء وصفة {tag}'
    online_id = publish(admin, tag, online_name, f'Online vitamin {tag}', category, False, True)
    rx_id = publish(admin, tag, rx_name_new, f'Rx medicine {tag}', category, True, False)
    if not (online_id and rx_id):
        return
    api_checks(tag, online_id, rx_id)
    indexed_rx = search_index_checks()

    journey('rx-rules-web#6 / app#4: the admin maps the category; "Consult a doctor" opens that specialty')
    before = admin.get(RX_CONSULT)
    step('the admin panel route answers the mapping, the Rx categories and the specialties', before.ok and isinstance(before.get('specialties'), list), before)
    keys = [c.get('key') for c in (before.get('categories') or [])]
    step('the new Rx category (empty sub-category) is listed to map', category in keys, keys[:10])
    old_map, old_default = dict(before.get('map') or {}), before.get('default')
    try:
        r = admin.put(RX_CONSULT, {'map': {**old_map, category: SPECIALTY}, 'default': old_default})
        step('the admin saves category -> specialty (PUT, as config-portal.tsx)', r.ok and (r.get('map') or {}).get(category) == SPECIALTY, r)
        r = anon.get(f'/medicines/{rx_id}/consult-specialty')
        step('"Consult a doctor" answers the mapped specialty from the category', r.ok and r.get('source') == 'category' and (r.get('specialty') or {}).get('slug') == SPECIALTY, r)
    finally:
        r = admin.put(RX_CONSULT, {'map': old_map, 'default': old_default})
        step('the earlier mapping is put back', r.ok and category not in (r.get('map') or {}), r)

    journey('rx-rules-web#3 / app#2: the wishlist sends online_exclusive')
    pat = j_accounts.app_signup(label='rxrules')
    pc = Client(pat['token'], 'patient')
    for mid in (online_id, rx_id):
        r = pc.post(f'/users/me/wishlist/{mid}', {})
        step('patient adds the medicine to the wishlist', r.ok and r.get('in_wishlist') is True, r)
    rows = {x.get('id'): x for x in pc.get('/users/me/wishlist').items()}
    step('wishlist: the online-only row says online_exclusive=true', (rows.get(online_id) or {}).get('online_exclusive') is True, rows.get(online_id))
    step('wishlist: the Rx row says requires_prescription=true, online_exclusive=false', (rows.get(rx_id) or {}).get('requires_prescription') is True and (rows.get(rx_id) or {}).get('online_exclusive') is False, rows.get(rx_id))

    journey('rx-rules-web#4 / app#3: GET /home/search medicine rows carry the two facts')
    r = pc.get('/home/search?' + urllib.parse.urlencode({'q': tag}))
    home = {x.get('id'): x for x in r.items() if x.get('typeEn') == 'Medicine'}
    step('home search: the online-only medicine says online_exclusive=true', (home.get(online_id) or {}).get('online_exclusive') is True, home.get(online_id) or r)
    step('home search: the Rx medicine says requires_prescription=true', (home.get(rx_id) or {}).get('requires_prescription') is True, home.get(rx_id) or r)

    journey('rx-rules-web#5: the order detail carries online_exclusive per line (the reorder picker keeps it)')
    addr = patient_address(pc)
    draft = {'items': [{'raw_name': online_name, 'qty': 1, 'sku': online_id, 'intake_source': 'cart'}],
             'delivery_address': {'label': addr.get('label') or 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
             'prescription_attachments': []}
    r = pc.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': KEY('rx-rules-reorder')})
    oid = r.get('id')
    step('patient saves an order draft with the online-only medicine', r.ok and oid, r)
    if oid:
        d = pc.get(f'/patient/pharmacy/orders/{oid}')
        lines = d.get('items') or []
        step('the order detail line says online_exclusive=true', d.ok and any(l.get('online_exclusive') is True for l in lines), lines)

    web(pat, tag, online_name, oid, indexed_rx)


def web(pat, tag, online_name, oid, indexed_rx):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web', False, f'no chromium: {e}')
    try:
        journey('rx-rules-web#1 + #5 (web): the catalogue card says "online only" and the cart line keeps it')
        page = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}).new_page()
        page.goto(f'{WEB}/ar/c?q={urllib.parse.quote(f"rxrulesol-{tag}")}', wait_until='load', timeout=60000)
        card = page.locator('.nabd-product-card', has_text=online_name)
        card.first.wait_for(timeout=30000)
        step('the online-only card shows "أونلاين فقط"', card.first.locator('.nabd-product-card__online', has_text=ONLINE_ONLY).count() == 1, card.first.inner_text()[:200])
        card.first.locator('button.nabd-product-card__add').click()
        page.wait_for_timeout(800)
        page.goto(f'{WEB}/ar/cart', wait_until='load', timeout=60000)
        page.wait_for_selector(f'text={online_name}', timeout=30000)
        step('the cart line added from the card says "أونلاين فقط"', page.locator('li', has_text=online_name).locator(f'text={ONLINE_ONLY}').count() > 0, 'no online-only note')
        page.context.close()

        ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
        page = ctx.new_page()
        r = ctx.request.post(f'{WEB}/api/auth/login', data={'identifier': pat['email'], 'password': pat['password']}, headers={'origin': WEB})
        step('patient signs in on the website', r.ok, r.status)

        journey('rx-rules-web#3 (web): the wishlist row says "online only"')
        page.goto(f'{WEB}/ar/wishlist', wait_until='load', timeout=60000)
        row = page.locator('li', has_text=online_name)
        row.first.wait_for(timeout=30000)
        step('the wishlist row shows "أونلاين فقط"', row.first.locator(f'text={ONLINE_ONLY}').count() > 0, row.first.inner_text()[:200])

        journey('rx-rules-web#4 (web): a medicine search result says "needs a prescription"')
        if indexed_rx:
            page.goto(f'{WEB}/ar/search?q={urllib.parse.quote(indexed_rx)}', wait_until='load', timeout=60000)
            page.wait_for_selector(f'text={RX_REQUIRED}', timeout=30000)
            step('the search row of a prescription medicine shows "يتطلب وصفة طبية"', page.locator(f'text={RX_REQUIRED}').count() > 0, 'no chip')
        else:
            step('the search row of a prescription medicine shows "يتطلب وصفة طبية"', False, 'no indexed prescription medicine found')

        journey('rx-rules-web#5 (web): the reorder picker keeps "online only" on the cart line')
        if oid:
            page.goto(f'{WEB}/ar/pharmacy/reorder?orderId={oid}', wait_until='load', timeout=60000)
            page.get_by_role('button', name='أضف إلى السلة').click(timeout=30000)
            page.wait_for_url('**/ar/cart', timeout=30000)
            page.wait_for_selector(f'text={online_name}', timeout=30000)
            step('the cart line added by the reorder picker says "أونلاين فقط"', page.locator('li', has_text=online_name).locator(f'text={ONLINE_ONLY}').count() > 0, 'no online-only note')
        else:
            step('the cart line added by the reorder picker says "أونلاين فقط"', False, 'no order draft')
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
