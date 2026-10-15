"""Journey: every list that can put a medicine in the cart says "needs a prescription" / "online only" (rx-rules-app #0-#3).
  The cart stores the flag of the row it was added from (pharmacyCartStore onlineOnly), so each list must send it:
  - the alternatives on the product page (GET /medicines/:id/details, alternatives[]);
  - the wishlist (GET /users/me/wishlist);
  - the search results (GET /search, the app's global search).
"""
import time
import urllib.parse
import uuid

from lib import Client, journey, step


def create(admin, tag, name, online, rx=False):
    # admin/src/pages/admin/medicines-catalog.tsx saveForm (create), with the "online only" switch
    body = {'name_ar': f'{name} {tag}', 'name_en': f'{name} {tag}', 'active_ingredient': f'flagtest-{tag}', 'generic_name': f'flagtest-{tag}',
            'manufacturer': 'Nabd Test', 'brand': 'Flag', 'category': 'vitamins', 'sub_category': '', 'form': 'tablet', 'strength': '1000iu',
            'package_size': '30', 'barcode': '', 'price': 25, 'requires_prescription': rx, 'online_exclusive': online, 'images': [], 'image': '',
            'description_ar': 'مكمل', 'description_en': 'supplement', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step(f'admin creates "{body["name_en"]}" (online only={online}, rx={rx})', r.ok and mid, r)
    if mid:  # admin medicines-catalog.tsx approve: the item joins the public catalogue
        r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step(f'admin publishes "{body["name_en"]}"', r.ok, r)
    return mid


def run():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    online_id = create(admin, tag, 'Vitamin D online', True)
    rx_id = create(admin, tag, 'Vitamin D rx', False, rx=True)
    base_id = create(admin, tag, 'Vitamin D plain', False)
    if not (online_id and rx_id and base_id):
        return

    journey('rx flags: the alternatives on the product page')
    r = Client().get(f'/medicines/{base_id}/details')
    alts = {a.get('id'): a for a in (r.get('alternatives') or [])}
    step('the product page lists both alternatives', r.ok and online_id in alts and rx_id in alts, r)
    step('the online-only alternative says so (online_exclusive: true)', alts.get(online_id, {}).get('online_exclusive') is True, alts.get(online_id))
    step('the prescription alternative says so (requires_prescription: true)', alts.get(rx_id, {}).get('requires_prescription') is True, alts.get(rx_id))

    journey('rx flags: the wishlist')
    pat = Client(j_accounts.app_signup(label='rx-flags')['token'], 'patient')
    r = pat.post(f'/users/me/wishlist/{online_id}', {})
    step('the patient saves the online-only item', r.ok, r)
    r = pat.get('/users/me/wishlist')
    rows = r.body if isinstance(r.body, list) else r.items()
    row = next((x for x in rows if isinstance(x, dict) and x.get('id') == online_id), {})
    step('the wishlist row says online only (online_exclusive: true)', r.ok and row.get('online_exclusive') is True, row)

    journey('rx flags: the search results')
    hit = {}
    for _ in range(10):  # the search index follows the catalogue (change stream); give it a moment
        r = Client().get(f'/search?q={urllib.parse.quote(tag)}&locale=en&limit=10')
        items = [i for g in (r.get('groups') or []) for i in (g.get('items') or [])]
        hit = {i.get('id'): i for i in items}
        if online_id in hit and rx_id in hit:
            break
        time.sleep(2)
    step('the search finds the new medicines', online_id in hit and rx_id in hit, r)
    step('the online-only result says so (online_exclusive: true)', hit.get(online_id, {}).get('online_exclusive') is True, hit.get(online_id))
    step('the prescription result says so (requires_prescription: true)', hit.get(rx_id, {}).get('requires_prescription') is True, hit.get(rx_id))


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
