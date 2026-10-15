"""Journey: the pharmacy owner decisions of 2026-10-15 (questions 30/40, 35, 36, 39 and the removed entry points).
  1. Order chat (issues 479, 480): the pharmacy that answered an order opens the chat of one line from its "Order chat"
     (POST /pharmacy/chat/threads), attaches a substitute from its own inventory; a substitute outside the prescription is
     refused (issue 1440 rule), one inside it reaches the patient (patient API and the website's chat page).
  2. Web cart (decisions 35 and 39): the cart says the prices come with the offers; a cart with a prescription medicine goes
     to rx-order to pick the prescription, and the checkout never guesses an "active" one.
  3. Web barcode page (decision 36): the camera button exists only where BarcodeDetector exists; a scanned code goes
     through the same lookup as a typed one.
  4. The product page has no "ask a pharmacist" entry (decision 40).
  Stack: backend :8002, patient-web :3100. A missing browser or patient-web is a FAIL, never a PASS.
"""
import os
import time
import urllib.parse
import uuid

from lib import Client, journey, step, web_login

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
KEY = lambda tag: f'mobile-{tag}-{uuid.uuid4()}'
anon = Client()

# a fake BarcodeDetector that reads one fixed code, for the browser that has the API
STUB_CODE = '6281234567890'
STUB = """
window.BarcodeDetector = class { constructor() {} async detect() { return [{ rawValue: '%s' }]; } };
""" % STUB_CODE


def public_slug(admin, med):
    r = admin.post(f"/medicines/admin/catalog/{med['id']}/approve", {'approve': True})
    step(f"admin publishes {med['name_en']}", r.ok, r)
    for _ in range(10):
        r = anon.get('/public/categories/ar/items?' + urllib.parse.urlencode({'category': 'all', 'q': med['name_ar'], 'page': 1}))
        hit = next((x for x in r.items() if x.get('id') == med['id']), None)
        if hit and hit.get('slug'):
            return hit['slug']
        time.sleep(2)
    step('the public catalogue lists the published medicine', False, r)
    return None


def order_chat(admin, pat, pharm):
    from j_rx_substitute import rx_medicine
    from j_pharmacy import patient_address
    import j_onboarding
    journey('order chat: catalogue, the pharmacy inventory and an order with a prescription')
    ordered = rx_medicine(admin, 'Amoxil', 'amoxicillin', '500mg', 'capsule')
    generic = rx_medicine(admin, 'Amoxicillin Generic', 'amoxicillin', '500mg', 'capsule')
    weaker = rx_medicine(admin, 'Amoxil', 'amoxicillin', '250mg', 'capsule')
    if not all(m['id'] for m in (ordered, generic, weaker)):
        return None
    pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    for m in (ordered, generic, weaker):
        # the generic substitute costs more than the ordered medicine (37 against 31): after payment it may not be taken
        r = pharm.post('/provider/capabilities/pharmacy', {'sku': m['id'], 'name_ar': m['name_ar'], 'name_en': m['name_en'], 'price': 37 if m is generic else 31,
                                                          'stock': 20, 'available': True, 'substitute_skus': []})
        step(f"pharmacy lists {m['name_en']}", r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    for d in [d for d in r.items() if d.get('target') == 'capability' and d.get('status') == 'pending']:
        admin.post(f"/admin/admin/providers/provider-deltas/{d['id']}/approve", {'reason': 'سعر معتمد'})
    r = pharm.get('/provider/capabilities/pharmacy')
    inv = {x.get('sku'): x.get('id') for x in (r.body if isinstance(r.body, list) else r.items())}
    step('the items are live in the pharmacy inventory', all(inv.get(m['id']) for m in (ordered, generic, weaker)), inv)

    addr = patient_address(pat)
    rx = j_onboarding.upload(pat, 'rx.png', 'image/png')
    draft = {'items': [{'raw_name': ordered['name_ar'], 'qty': 1, 'sku': ordered['id'], 'intake_source': 'cart'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
             'prescription_attachments': [rx] if rx else []}
    k = KEY('chat')
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    step('order with the prescription', r.ok and oid, r)
    if not oid:
        return None
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('submitted to nearby pharmacies', r.ok, r)
    r = pharm.get('/provider/pharmacy/broadcasts')
    mine = next((b for b in r.items() if b.get('order_id') == oid), None)
    step('the pharmacy sees the request', r.ok and mine, r.status)
    if not mine:
        return None
    line = (mine.get('items') or [{}])[0]
    line_id = str(line.get('id') or line.get('order_item_id') or '')

    journey('order chat: only a pharmacy that is part of the order opens a line chat')
    r = pharm.post(f'/pharmacy/chat/threads', {'order_id': oid, 'order_item_id': line_id})
    step('before answering the order the pharmacy cannot open its chat (not_part_of_order)', r.status == 403 and 'not_part_of_order' in str(r.body), r)
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': [
        {'order_item_id': line_id, 'availability': 'available', 'inventory_item_id': inv.get(ordered['id']), 'qty_offered': 1}]})
    offer_id = r.get('id')
    step('the pharmacy drafts an offer for the line', r.ok and offer_id, r)
    r = pharm.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('and sends it to the patient', r.ok, r)
    r = pharm.post('/pharmacy/chat/threads', {'order_id': oid, 'order_item_id': line_id})
    tid = r.get('id')
    step('the pharmacy opens the chat of the order line (issues 479/480)', r.ok and tid and r.get('order_id') == oid and r.get('status') == 'open', r)
    if not tid:
        return None
    r = pharm.post('/pharmacy/chat/threads', {'order_id': oid, 'order_item_id': line_id})
    step('opening it again returns the same chat', r.ok and r.get('id') == tid, r)
    r = pat.post('/pharmacy/chat/threads', {'order_id': oid, 'order_item_id': line_id})
    step('the patient cannot open a pharmacy chat', r.status == 403, r)
    r = pharm.post('/pharmacy/chat/threads', {'order_id': oid, 'order_item_id': 'not-a-line'})
    step('a line that is not on the order is refused', r.status == 400 and 'order_item_not_found' in str(r.body), r)
    r = pharm.get(f'/pharmacy/chat/threads?order_id={oid}')
    step('the pharmacy lists its chats of the order', r.ok and any(t.get('id') == tid for t in r.items()), r)

    journey('order chat: a substitute from the pharmacy inventory, checked against the prescription (issue 1440)')
    r = pharm.post(f'/pharmacy/chat/threads/{tid}/messages', {'text': 'عندنا تركيز آخر', 'substitute_offer': {'inventory_item_id': inv.get(weaker['id'])}})
    step('a substitute with another strength is refused (substitute_outside_prescription)', r.status == 400 and 'substitute_outside_prescription' in str(r.body), r)
    r = pharm.post(f'/pharmacy/chat/threads/{tid}/messages', {'text': 'بديل جنيس', 'substitute_offer': {'inventory_item_id': inv.get(generic['id']), 'notes': 'نفس المادة والتركيز'}})
    sub = r.get('substitute_offer') or {}
    step('the generic is sent, with the name and price of the inventory row', r.ok and sub.get('name') == generic['name_ar'] and sub.get('price') == 31, r)
    r = pat.post(f'/pharmacy/chat/threads/{tid}/messages', {'substitute_offer': {'inventory_item_id': inv.get(generic['id'])}})
    step('the patient cannot attach a substitute', r.status in (400, 403), r)

    journey('order chat: the patient sees it and answers')
    r = pat.get(f'/pharmacy/chat/threads?order_id={oid}')
    step('the patient lists the chat of the order', r.ok and any(t.get('id') == tid for t in r.items()), r)
    r = pat.get(f'/pharmacy/chat/threads/{tid}/messages')
    msgs = (r.body or {}).get('messages') if isinstance(r.body, dict) else []
    offer_msg = next((m for m in msgs or [] if (m.get('substitute_offer') or {}).get('name') == generic['name_ar']), None)
    step('the patient reads the substitute', r.ok and offer_msg, r)
    step('the refused substitute never reached the patient', not any((m.get('substitute_offer') or {}).get('name') == weaker['name_ar'] for m in msgs or []), msgs)
    stranger = Client(__import__('j_accounts').app_signup(label='chat-stranger')['token'], 'patient')
    r = stranger.get(f'/pharmacy/chat/threads/{tid}/messages')
    step('another patient cannot read the chat', r.status == 403, r)
    return {'oid': oid, 'tid': tid, 'msg': offer_msg, 'generic': generic, 'ordered': ordered, 'pharm': pharm}


def substitute_and_payment(pat, chat):
    """Owner decision 30: accepting a chat substitute is the allocation's own accept, and a paid order keeps its price."""
    from j_nursing import card_payment
    oid, tid, msg = chat['oid'], chat['tid'], chat['msg']
    journey('order chat: a substitute is taken only on the chosen offer, and never changes a paid order')
    r = pat.post(f'/pharmacy/chat/threads/{tid}/accept-substitute/{msg["id"]}', {})
    step('before the patient chooses an offer the accept is refused (substitute_needs_selected_offer)', r.status == 400 and 'substitute_needs_selected_offer' in str(r.body), r)
    r = pat.get(f'/patient/pharmacy/orders/{oid}/offers')
    offers = r.items()
    step('the patient sees the pharmacy offer', r.ok and offers, r)
    if not offers:
        return
    of = offers[0]
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{of.get('id') or of.get('offer_id')}/select", {'coverage_mode': 'cash'}, headers={'Idempotency-Key': KEY('chat-offer')})
    step('the patient chooses the offer', r.ok, r)
    o = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
    if order.get('governed_state') == 'FINAL_QUOTE_READY' or order.get('selected_offer_hash'):
        final = order.get('governed_state') == 'FINAL_QUOTE_READY'
        r = pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept', {'quote_hash': order.get('pending_final_quote_hash') if final else order.get('selected_offer_hash'),
                                                                           'quote_revision': order.get('pending_final_quote_revision') if final else order.get('selected_offer_revision')},
                     headers={'Idempotency-Key': KEY('chat-final-quote')})
        step('the patient accepts the final quote', r.ok, r)
    paid = card_payment(pat, 'pharmacy', oid)
    step('the patient pays the order by card', bool(paid), paid)
    total_before = ((pat.get(f'/patient/pharmacy/orders/{oid}').get('pricing_snapshot') or {}).get('totals') or {}).get('total')
    r = pat.post(f'/pharmacy/chat/threads/{tid}/accept-substitute/{msg["id"]}', {})
    step('after payment a substitute at another price is refused (substitute_price_after_payment)', r.status == 409 and 'substitute_price_after_payment' in str(r.body), r)
    r = pat.post(f'/pharmacy/chat/threads/{tid}/remove-item', {})
    step('and removing the line of a paid order is refused (item_removal_after_payment)', r.status == 409 and 'item_removal_after_payment' in str(r.body), r)
    total_after = ((pat.get(f'/patient/pharmacy/orders/{oid}').get('pricing_snapshot') or {}).get('totals') or {}).get('total')
    step('the paid total is unchanged', total_before is not None and total_before == total_after, f'{total_before} -> {total_after}')
    r = pat.get(f'/pharmacy/chat/threads/{tid}/messages')
    step('the chat stays open for the pharmacy to cancel or refund the line', r.ok and (r.get('thread') or {}).get('status') == 'open', r)


def main():
    import j_admin, j_accounts, j_onboarding
    journey('pharmacy owner decisions: setup')
    try:
        admin, _ = j_admin.login()
    except Exception as e:
        return step('admin api session', False, str(e)[:200])
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    acct = j_accounts.app_signup(label='rx-chat-patient')
    pat = Client(acct['token'], 'patient')
    chat = order_chat(admin, pat, Client(p['token'], 'pharmacy'))
    from j_rx_substitute import rx_medicine
    web_med = rx_medicine(admin, 'Augmentin', 'amoxicillin clavulanate', '1g', 'tablet')
    slug = public_slug(admin, web_med) if web_med.get('id') else None

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None,
                                     args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'])
    except Exception as e:
        return step('web', False, f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        page.goto(f'{WEB}/ar', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        step('patient signs in on the website', r.ok, f'{r.status} {r.text()[:200]}')
    except Exception as e:
        browser.close(); pw.stop()
        return step('web', False, f'patient-web not running at {WEB}: {e}')

    if chat:
        journey('order chat: the website shows the pharmacy substitute in the order chat')
        try:
            page.goto(f"{WEB}/ar/pharmacy/chat?orderId={chat['oid']}", wait_until='load', timeout=60000)
            page.wait_for_selector(f"text={chat['generic']['name_ar']}", timeout=30000)
            step('the substitute is on the patient chat page', True)
        except Exception as e:
            step('the substitute is on the patient chat page', False, str(e)[:300])
        if chat.get('msg'):
            substitute_and_payment(pat, chat)

    journey('web: the product page has no "ask a pharmacist" entry (decision 40)')
    try:
        if slug:
            page.goto(f'{WEB}/ar/p/{urllib.parse.quote(slug)}', wait_until='load', timeout=60000)
            page.wait_for_selector('h1', timeout=30000)
            step('no link to a pharmacist chat without an order', page.locator('a[href$="/pharmacy/chat"]').count() == 0, 'link still there')
            page.locator('button:has-text("أضف للسلة"):visible').first.click()
            page.wait_for_timeout(800)
        else:
            step('a published prescription medicine to put in the cart', False, 'no slug')
    except Exception as e:
        step('product page', False, str(e)[:300])

    journey('web cart: no prices, and a prescription medicine goes to rx-order first (decisions 35 and 39)')
    try:
        page.goto(f'{WEB}/ar/cart', wait_until='load', timeout=60000)
        page.wait_for_selector('[data-testid="cart-price-note"]', timeout=30000)
        note = page.locator('[data-testid="cart-price-note"]').first.inner_text()
        step('the cart says the prices come with the offers', 'الأسعار تأتي مع عروض الصيدليات' in note, note)
        step('the cart request button goes to rx-order, not to checkout', page.locator('a[href="/ar/pharmacy/rx-order"]').count() > 0
             and page.locator('a[href="/ar/cart/checkout"]').count() == 0, 'button target')
        page.locator('a[href="/ar/pharmacy/rx-order"]:visible').first.click()
        page.wait_for_url('**/ar/pharmacy/rx-order**', timeout=30000)
        step('the patient lands on rx-order to pick the prescription', '/ar/pharmacy/rx-order' in page.url, page.url)
        page.goto(f'{WEB}/ar/cart/checkout', wait_until='load', timeout=60000)
        page.wait_for_selector('[data-testid="checkout-rx-choose"]', timeout=30000)
        step('the checkout of an Rx cart without a picked prescription points to rx-order (no "active" one guessed)',
             page.locator('[data-testid="checkout-rx-choose"] a[href="/ar/pharmacy/rx-order"]').count() > 0, 'no choose link')
        # a streamed page answers 200 with the not-found screen, so the screen is what is checked
        page.goto(f'{WEB}/ar/cart/checkout?prescriptionId={uuid.uuid4()}', wait_until='load', timeout=60000)
        page.wait_for_selector('text=الصفحة غير متاحة', timeout=30000)
        step('the checkout on a prescription that is not the patient\'s is not found (never another prescription)', True)
    except Exception as e:
        step('web cart flow', False, str(e)[:300])

    journey('web barcode page: the camera only where BarcodeDetector exists (decision 36)')
    try:
        page.goto(f'{WEB}/ar/pharmacy/barcode', wait_until='load', timeout=60000)
        page.wait_for_selector('h1', timeout=30000)
        page.wait_for_timeout(1500)
        has_api = page.evaluate("'BarcodeDetector' in window")
        cam = page.locator('[data-testid="barcode-camera"]').count()
        step('without the API there is no camera button, the typed field stays', (cam == 0 or has_api) and page.locator('input').count() > 0, f'api={has_api} camera={cam}')
        ctx2 = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}, permissions=['camera'])
        ctx2.add_init_script(STUB)
        web_login(ctx2, WEB, acct['email'], acct['password'])
        p2 = ctx2.new_page()
        p2.goto(f'{WEB}/ar/pharmacy/barcode', wait_until='load', timeout=60000)
        p2.wait_for_selector('[data-testid="barcode-camera"]', timeout=30000)
        step('with BarcodeDetector the camera button is shown', True)
        step('the typed field is still there', p2.locator('input').count() > 0, 'no input')
        with p2.expect_request(lambda req: f'/medicines/by-barcode/{STUB_CODE}' in req.url, timeout=30000):
            p2.locator('[data-testid="barcode-camera"] button').first.click()
        step('the scanned code goes through the same lookup as a typed one', True)
        ctx2.close()
    except Exception as e:
        step('web barcode camera', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
