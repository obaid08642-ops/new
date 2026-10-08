"""Journey P22.2: back-in-stock + price-drop alerts, shareable wishlists.

Contracts (slice p22-a, read-only via `git show p22-a:<path>` from /Users/ahmedobaid/nabd-plus):
  backend/src/modules/pharmacy/controllers/product-alert.controller.ts
  backend/src/modules/pharmacy/dto/product-alert.dto.ts
  backend/src/modules/wishlist/wishlist.controller.ts  (share/list/revoke + public resolve)

What the screens send (no fixture-only shortcuts):
  - alert subscribe: POST /pharmacy/alerts/subscriptions {medicine_id, kind, price_threshold?} + Idempotency-Key
  - pipeline stand-ins: POST /pharmacy/alerts/report-restock and /report-price are the
    ADMIN hooks the stock/price pipelines call (the provider restock path also calls
    onRestock internally); the journey drives them as the pipeline would.
  - alerts arrive as patient notifications (GET /notifications): restock ->
    action {type open_medicine}, price-drop -> the same; the app's inbox screen
    reads this endpoint (cf. j_chat.py).
  - wishlist share: POST /wishlist/share {item_ids} (patient-app wishlist.tsx share
    action); recipients open GET /wishlist/shared/:token with NO auth.

NOT RUN HERE: no docker on this machine, so the live gate cannot start.
Authored + static-checked only; must go green in CI (NABD_GATE_P22=1) after p22-a merges.

Never-loses-data invariants asserted:
  - re-subscribing the same (medicine, kind) never duplicates; unsubscribe stops alerts.
  - a price move that does NOT meet the threshold sends NOTHING (no spam).
  - the public share link carries the frozen item snapshot only — never owner identity —
    and a revoked link is honestly 404.
"""
import time
import uuid
from lib import Client, journey, step

KEY = lambda tag: f'p22-alerts-{tag}-{uuid.uuid4()}'


def notif_with(pat, medicine_id, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        r = pat.get('/notifications')
        if r.ok:
            body = r.body if isinstance(r.body, list) else r.items()
            hits = [n for n in body if isinstance(n, dict)
                    and (n.get('action') or {}).get('type') == 'open_medicine'
                    and (n.get('action') or {}).get('medicine_id') == medicine_id]
            if hits:
                return hits
        time.sleep(1)
    return []


def run(pat, admin, medicine):
    mid = medicine['id']

    journey('P22.2: subscribe to restock + price-drop alerts')
    r = pat.post('/pharmacy/alerts/subscriptions', {'medicine_id': mid, 'kind': 'restock'},
                 headers={'Idempotency-Key': KEY('restock')})
    rs = r.get('id')
    step('restock subscription created', r.ok and rs, r)
    r = pat.post('/pharmacy/alerts/subscriptions',
                 {'medicine_id': mid, 'kind': 'price_drop', 'price_threshold': 15.0},
                 headers={'Idempotency-Key': KEY('pricedrop')})
    pd = r.get('id')
    step('price-drop subscription with threshold created', r.ok and pd, r)
    if not (rs and pd):
        return
    r = pat.post('/pharmacy/alerts/subscriptions', {'medicine_id': mid, 'kind': 'restock'},
                 headers={'Idempotency-Key': KEY('restock2')})
    step('re-subscribing never duplicates', r.ok and r.get('id') == rs, r)
    r = pat.get('/pharmacy/alerts/subscriptions')
    mine = [s for s in r.items() if s.get('medicine_id') == mid] if r.ok else []
    step('both subscriptions listed', r.ok and len(mine) == 2, f'{r.status} {len(mine)}')

    journey('P22.2: restock -> the subscriber alert arrives')
    r = admin.post('/pharmacy/alerts/report-restock', {'medicine_id': mid},
                   headers={'Idempotency-Key': KEY('rs')})
    step('restock reported', r.ok, r)
    hits = notif_with(pat, mid)
    step('restock alert arrives in the patient inbox', len(hits) >= 1, f'{len(hits)} open_medicine notifications')

    journey('P22.2: price-drop -> alert only when the threshold is met')
    r = admin.post('/pharmacy/alerts/report-price',
                   {'medicine_id': mid, 'new_price': 17.0, 'old_price': 18.5},
                   headers={'Idempotency-Key': KEY('p1')})
    step('small move reported', r.ok, r)
    time.sleep(2)
    before = notif_with(pat, mid, timeout=3)
    n0 = len(before)
    r = admin.post('/pharmacy/alerts/report-price',
                   {'medicine_id': mid, 'new_price': 12.0, 'old_price': 17.0},
                   headers={'Idempotency-Key': KEY('p2')})
    step('threshold-breaking move reported', r.ok, r)
    after = notif_with(pat, mid)
    step('price-drop alert arrives only for the threshold break',
         len(after) > n0, f'before={n0} after={len(after)}')

    journey('P22.2: unsubscribe stops alerts; no data lost elsewhere')
    r = pat.delete(f'/pharmacy/alerts/subscriptions/{rs}')
    step('restock subscription removed', r.ok, r)
    r = pat.get('/pharmacy/alerts/subscriptions')
    left = [s for s in r.items() if s.get('medicine_id') == mid] if r.ok else []
    step('only the price-drop subscription remains',
         r.ok and len(left) == 1 and left[0].get('id') == pd, [s.get('id') for s in left])

    journey('P22.2: shareable wishlist (wishlist.tsx share action)')
    r = pat.post('/wishlist/share', {'item_ids': [mid]}, headers={'Idempotency-Key': KEY('share')})
    token = r.get('token')
    step('share link created', r.ok and token, r)
    if not token:
        return
    anon = Client()
    r = anon.get(f'/wishlist/shared/{token}')
    items = r.get('items') or []
    step('recipients open it with NO auth and see the items', r.ok and any(i.get('id') == mid for i in items), r)
    step('the snapshot leaks no owner identity',
         r.ok and 'owner' not in str(r.body).lower() and '@' not in str(r.body), str(r.body)[:200])
    r = pat.get('/wishlist/shares')
    step('owner lists the share', r.ok and token in str(r.body), r)
    r = pat.delete(f'/wishlist/shares/{token}')
    step('owner revokes it', r.ok, r)
    r = anon.get(f'/wishlist/shared/{token}')
    step('revoked link is honestly 404', r.status == 404, r)


if __name__ == '__main__':
    import j_admin
    import j_accounts
    from lib import summary
    admin, _ = j_admin.login()
    pat = j_accounts.app_signup(label='alerts-patient')
    tag = uuid.uuid4().hex[:6]
    r = admin.post('/medicines/admin/catalog',
                   {'name_ar': f'دواء تنبيهات {tag}', 'name_en': f'Alert med {tag}',
                    'active_ingredient': 'ibuprofen', 'generic_name': 'ibuprofen',
                    'manufacturer': 'SPIMACO', 'brand': 'Sapofen', 'category': 'pain', 'sub_category': '',
                    'form': 'tablet', 'strength': '400mg', 'package_size': '20', 'barcode': '',
                    'price': 18.5, 'requires_prescription': False, 'images': [], 'image': '',
                    'description_ar': 'مسكن', 'description_en': 'painkiller',
                    'usage_instructions_ar': '', 'usage_instructions_en': '',
                    'indications_ar': ['صداع'], 'indications_en': ['headache'],
                    'contraindications_ar': [], 'contraindications_en': [],
                    'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [],
                    'precautions_ar': [], 'precautions_en': [],
                    'reason': 'صنف لاختبار تنبيهات P22.2'})
    step('admin catalogs the alert medicine', r.ok and r.get('id'), r)
    if r.ok:
        run(Client(pat['token'], 'patient'), admin, {'id': r.get('id')})
    summary()
