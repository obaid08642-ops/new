"""Journey (backend): the order of medicines follows what patients do (owner request 2026-10-26).
  - The admin creates three approved test medicines (TEST data) with the same unique tag: A (no signal), B (one view),
    C (a view and a cart add by a patient).
  - Before any signal the three are equal; after the signals and the score job (POST /admin/ranking/recompute) the public
    category list (what the web pages use) orders them C, B, A, and so do GET /medicines (the app's list).
  - The public event endpoint takes a view but refuses the events the server records itself (purchase, cart, wishlist).
  - Purchases count when the order is delivered (orders.service.ts); that step is covered by the unit tests.
  Stack: backend :8002.
"""
import uuid

from lib import Client, journey, step


def create(admin, tag, letter):
    body = {'name_ar': f'ترتيب {tag} {letter}', 'name_en': f'Ranking {tag} {letter}', 'active_ingredient': f'ranking-{tag}-{letter}',
            'generic_name': f'ranking-{tag}-{letter}', 'manufacturer': 'Nabd Test', 'brand': f'Ranking {tag}', 'category': 'vitamins',
            'sub_category': '', 'form': 'tablet', 'strength': '500mg', 'package_size': '20', 'barcode': str(6300000000000 + int(uuid.uuid4().hex[:6], 16) % 1000000),
            'price': 20, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار لترتيب الأدوية'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid:
        a = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step(f'admin approves test medicine {letter}', a.ok, a)
    step(f'admin creates test medicine {letter}', r.ok and mid, r)
    return mid


def order_of(anon, tag, ids, round_no):
    # the public list is cached per URL: each round asks with its own parameter, so the second answer is a fresh one
    r = anon.get(f'/public/categories/ar/items?category=all&q={tag}&limit=48&round={round_no}')
    found = [i.get('id') for i in r.items() if i.get('id') in ids]
    return r, found


def main():
    import j_admin
    import j_accounts
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    a, b, c = (create(admin, tag, x) for x in 'ABC')
    if not (a and b and c):
        return
    anon = Client(None, 'anon')
    ids = {a, b, c}

    journey('medicine ranking: no signal, no order')
    r = admin.post('/admin/admin/ranking/recompute')
    step('admin runs the score job', r.ok, r)
    r, before = order_of(anon, tag, ids, 1)
    step('the three test medicines are listed', set(before) == ids, r.body if not r.ok else before)

    journey('medicine ranking: what patients do moves a product up')
    v = anon.post('/medicines/events', {'event_type': 'product_viewed', 'drug_id': b, 'session_id': f'ranking-{tag}-b'})
    step('a view of B is recorded', v.ok and v.get('counted'), v)
    v = anon.post('/medicines/events', {'event_type': 'product_viewed', 'drug_id': c, 'session_id': f'ranking-{tag}-c'})
    step('a view of C is recorded', v.ok and v.get('counted'), v)
    for evt in ('purchase_completed', 'product_added_to_cart', 'wishlist_added'):
        bad = anon.post('/medicines/events', {'event_type': evt, 'drug_id': a})
        step(f'the public endpoint refuses {evt} (the server records it)', bad.status == 400, bad)
    pat = j_accounts.app_signup(label='ranking')
    pc = Client(pat['token'], 'patient')
    add = pc.post('/cart/items', {'medicine_id': c, 'quantity': 1})
    step('the patient adds C to the cart (the server records the event)', add.ok, add)

    journey('medicine ranking: the score job, then the lists')
    r = admin.post('/admin/admin/ranking/recompute')
    step('admin runs the score job again', r.ok and (r.get('updated') or 0) >= 2, r)
    r, after = order_of(anon, tag, ids, 2)
    step('public category list (web): C, then B, then A', after == [c, b, a], {'got': after, 'A': a, 'B': b, 'C': c})
    # the app's list has no text query: walk its pages (100 a page) until the three test medicines have all been seen.
    # The list is cached per URL and other journeys ask for the same one: a pharmacyId of this run's own makes a fresh key.
    got, pageno, total_pages = [], 1, 1
    while pageno <= min(total_pages, 30) and len(got) < 3:
        page = anon.get(f'/medicines?page={pageno}&limit=100&category=vitamins&sort=smart_ranking&pharmacyId=ranking-{tag}')
        total_pages = page.get('total_pages', default=1) or 1
        got += [m.get('id') for m in page.items() if m.get('id') in ids and m.get('id') not in got]
        pageno += 1
    step('medicines list without a text query (app): C, then B, then A', got == [c, b, a], {'got': got, 'pages': total_pages, 'status': page.status, 'A': a, 'B': b, 'C': c})


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
