"""Journey: a manual pharmacy request with a quantity and a photo of the box, and an unchecked price (journeys 74, 75).
  - The website's "type the names" request (patient-web pharmacy/request) uploads the box photo (/api/pharmacy/box-photo ->
    POST /storage/upload) and sends the quantity; the order line carries both.
  - The pharmacy asked about it sees the quantity and opens the photo (GET /storage/:id); a pharmacy not asked cannot; a
    photo that is not the patient's own is refused.
  - The pharmacy prices the line without a catalogue match: the patient's offer marks the price "not verified" and the
    offers page says so.
  Stack: backend :8002, patient-web :3100.
"""
import base64
import os
import tempfile
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
# a 1x1 PNG: a real image the server stores (TEST data)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')


def main():
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pharm = Client(p['token'], 'pharmacy')
    r = pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('the pharmacy goes online', r.ok, r)
    other = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, other)
    j_onboarding.provider_after_approval(other)
    other_pharm = Client(other['token'], 'pharmacy')
    acct = j_accounts.app_signup(label='manual-req')
    pat = Client(acct['token'], 'patient')
    j_pharmacy.patient_address(pat)
    intruder = Client(j_accounts.app_signup(label='manual-intruder')['token'], 'patient')
    foreign = intruder.post('/storage/upload', {'mime': 'image/png', 'data_base64': base64.b64encode(PNG).decode(), 'original_name': 'x.png'}).get('id')

    journey('journeys 74: quantity and box photo from the website')
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    name = f'دواء غير موجود {uuid.uuid4().hex[:5]}'
    oid = None
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('the patient signs in on the website', r.ok, f'{r.status}')
        page.goto(f'{WEB}/ar/pharmacy/request', wait_until='load', timeout=60000)
        page.get_by_label('اسم الدواء', exact=False).first.fill(name)
        page.get_by_label('الكمية (عدد العلب)').fill('3')
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(PNG)
            path = f.name
        page.locator('input[type="file"]').first.set_input_files(path)
        page.get_by_role('img', name='صورة علبة الدواء').wait_for(timeout=30000)
        step('the photo is uploaded and shown', True, '')
        page.get_by_role('button', name='أرسل للصيدليات القريبة').last.click(timeout=30000)
        page.wait_for_url('**/broadcast-status**', timeout=60000)
        oid = page.url.split('orderId=')[1].split('&')[0] if 'orderId=' in page.url else None
        step('the request is sent', oid, page.url)
    except Exception as e:
        step('web request flow', False, str(e)[:300])
    if not oid:
        browser.close(); pw.stop()
        return
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    line = (order.get('items') or [{}])[0]
    step('the order line has the quantity 3 and the photo', line.get('qty') == 3 and str(line.get('photo_uri', '')).startswith('/api/v1/storage/'), line)
    r = pat.post('/patient/pharmacy/orders', {'manual_request': {'name': 'x', 'qty': 1, 'photo_id': foreign}, 'delivery_address': {'label': 'a', 'lat': 24.7, 'lng': 46.7}}, headers={'Idempotency-Key': f'mr-{uuid.uuid4()}'})
    step('another person\'s photo is refused', r.status == 400, r)

    journey('journeys 74: the pharmacy asked sees the quantity and the photo')
    b = next((x for x in pharm.get('/provider/pharmacy/broadcasts').items() if x.get('order_id') == oid), None)
    item = ((b or {}).get('items') or [{}])[0]
    step('the broadcast line says 3 and carries the photo', item.get('qty_requested') == 3 and item.get('photo_uri') == line.get('photo_uri'), item)
    sid = str(line.get('photo_uri', '')).rsplit('/', 1)[-1]
    r = pharm.get(f'/storage/{sid}/signed-url')
    step('the pharmacy opens the photo (signed link)', r.ok and r.get('url'), r.status)
    r = other_pharm.get(f'/storage/{sid}')
    step('a pharmacy not asked cannot', r.status == 403, r.status)

    journey('journeys 75: a price the server cannot check is "not verified" for the patient')
    # the pharmacy's own item, not in the catalogue (provider-app inventory, approved by the admin): its price has nothing
    # to be checked against
    sku = f'custom-{uuid.uuid4().hex[:8]}'
    pharm.post('/provider/capabilities/pharmacy', {'sku': sku, 'name_ar': name, 'name_en': 'Custom item', 'price': 20, 'stock': 10, 'available': True})
    for d in [d for d in admin.get('/admin/admin/providers/provider-deltas').items() if d.get('target') == 'capability' and d.get('status') == 'pending']:
        admin.post(f"/admin/admin/providers/provider-deltas/{d['id']}/approve", {'reason': 'صنف الصيدلية'})
    inv = next((x for x in (pharm.get('/provider/capabilities/pharmacy').body or []) if isinstance(x, dict) and x.get('sku') == sku), {})
    step('the pharmacy has its own item for the line', inv.get('id'), inv)
    items = [{'order_item_id': str(item.get('order_item_id')), 'availability': 'available', 'qty_offered': 3, 'inventory_item_id': inv.get('id')}]
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': items})
    offer = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the pharmacy prices the unmatched line', r.ok and offer.get('id'), r)
    if offer.get('id'):
        r = pharm.post(f"/provider/pharmacy/broadcasts/{oid}/offers/{offer['id']}/submit", {})
        step('and sends the offer', r.ok, r)
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    offers = r.body if isinstance(r.body, list) else r.items()
    lines = (offers[0].get('items') if offers else None) or []
    step('the patient\'s offer line says the price is not verified', any(l.get('price_status') == 'not_verified' for l in lines), lines)
    try:
        page.goto(f'{WEB}/ar/pharmacy/broadcast-status?orderId={oid}', wait_until='load', timeout=60000)
        note = page.get_by_text('السعر غير متحقق منه', exact=False).first
        try:
            # the offer's lines are in its details: open them as the patient does, once the page is interactive
            page.locator('details summary').first.wait_for(timeout=30000)
            page.wait_for_function("() => { const d = document.querySelector('details'); return !!d && Object.keys(d).some((k) => k.startsWith('__react')); }", timeout=30000)
            for summary in page.locator('details summary').all():
                summary.click()
            note.wait_for(timeout=30000)
            shown = True
        except Exception:
            shown = False
        details = ' | '.join(d.inner_text()[:200] for d in page.locator('details').all())
        step('the offers page says the price is not verified', shown, details or page.locator('main').first.inner_text()[:300])
    except Exception as e:
        step('web offers', False, str(e)[:300])

    journey('journeys 66 (decision 26): the home-visit terms the app shows before payment')
    r = Client(None, 'anon').get('/refund-policy')
    hv = (r.body or {}).get('home_visit') if isinstance(r.body, dict) else {}
    step('the public refund policy has the trip fee and the absent rule (nurse-profile reads them)', r.ok and isinstance((hv or {}).get('trip_fee_sar'), (int, float)) and (hv or {}).get('patient_absent_percent') is not None, r)

    journey('journeys 8 (decision 26): the order page says the refund rule before cancelling')
    try:
        cfg = Client(None, 'anon').get('/system-config/public')
        rp = (cfg.body.get('data', cfg.body) if isinstance(cfg.body, dict) else {}).get('returns_policy') or {}
        lo, hi = rp.get('wallet_refund_days_min'), rp.get('wallet_refund_days_max')
        step('the server publishes the refund days', lo is not None and hi is not None, rp)
        page.goto(f'{WEB}/ar/orders/{oid}', wait_until='load', timeout=60000)
        page.wait_for_function("() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('إلغاء الطلب')); return !!b && Object.keys(b).some((k) => k.startsWith('__react')); }", timeout=30000)
        page.get_by_role('button', name='إلغاء الطلب').first.click()
        rule = page.get_by_text('يصل الاسترداد خلال', exact=False).first  # the numbers may be drawn in Arabic digits
        rule.wait_for(timeout=20000)
        step('the cancel confirmation says the refund rule from the server', True, '')
    except Exception as e:
        step('the cancel confirmation says the refund rule from the server', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
