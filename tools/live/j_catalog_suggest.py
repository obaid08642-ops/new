"""Journey: public drug-index suggestions -> admin review -> authoritative catalog (catalog audit §7).

  python3 tools/live/j_catalog_suggest.py

A guest (no account) reads a public medicine, proposes a correction and a new item; the catalog must not
change until an admin approves; approval must reach the public read; rejection must leave it unchanged.
Payloads follow the provider-app drug index (MedicalDrugIndexScreen "اقتراح تعديل") and the admin inbox
(admin/src/pages/admin catalog suggestions).
"""
import os, uuid
from lib import Client, journey, step, summary
import j_admin
from j_pharmacy import admin_adds_medicines

guest = Client()


def run():
    admin, _ = j_admin.login()
    mid = os.environ.get('MEDICINE_ID')  # an existing public medicine (lets the rest run while Q60 is open)
    if not mid:
        mid = admin_adds_medicines(admin)[0]['id']
        r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})  # admin medicines-catalog.tsx:192
        step('admin publishes the medicine', r.ok, r)

    journey('drug index: a guest reads the public medicine')
    r = guest.get(f'/medicines/{mid}')
    step('guest reads the medicine (no account)', r.ok and r.get('id') == mid, r)
    before = r.get('description_ar')

    journey('drug index: guest proposes a correction')
    new_desc = f'وصف مقترح {uuid.uuid4().hex[:5]}'
    r = guest.post(f'/medicines/{mid}/suggest-change', {'type': 'field_edit', 'changes': {'description_ar': new_desc}, 'note': 'تصحيح من زائر'})
    rid = r.get('request_id')
    step('suggestion stored as pending', r.ok and rid and r.get('status') == 'pending', r)
    r = guest.get(f'/medicines/{mid}')
    step('the catalog is unchanged before review', r.ok and r.get('description_ar') == before, f"{r.get('description_ar')!r} vs {before!r}")

    journey('drug index: invalid suggestions are refused')
    r = guest.post(f'/medicines/{mid}/suggest-change', {'type': 'hack', 'changes': {'description_ar': 'x'}})
    step('unknown type -> 400', r.status == 400, r)
    r = guest.post(f'/medicines/{mid}/suggest-change', {'type': 'field_edit', 'changes': {'is_deleted': True}})
    step('non-editable field only -> 400', r.status == 400, r)
    r = guest.post('/medicines/no-such-medicine/suggest-change', {'type': 'field_edit', 'changes': {'description_ar': 'x'}})
    step('unknown medicine -> 404', r.status == 404, r)

    journey('drug index: guest proposes a new medicine')
    tag = uuid.uuid4().hex[:6]
    r = guest.post('/medicines/suggest-new-item', {'name_ar': f'دواء مقترح {tag}', 'name_en': f'Suggested drug {tag}', 'note': 'غير موجود في الفهرس'})
    nid = r.get('request_id')
    step('new-item suggestion stored as pending', r.ok and nid, r)
    r = guest.get(f'/medicines?q={tag}')
    rows = r.body if isinstance(r.body, list) else (r.get('data') or r.get('items') or [])
    step('the new item is not public before review', r.ok and not any(tag in str(x) for x in rows), f'{len(rows)} rows')

    journey('admin: review inbox')
    r = admin.get('/medicines/admin/change-requests?status=pending')
    rows = r.body if isinstance(r.body, list) else (r.get('data') or r.get('items') or [])
    ids = {x.get('id') for x in rows}
    step('both suggestions are in the admin inbox', r.ok and rid in ids and nid in ids, f'{r.status} {len(rows)} rows')
    one = next((x for x in rows if x.get('id') == rid), {})
    step('the inbox shows old -> new values', one.get('current_values', {}).get('description_ar') == before and one.get('changes', {}).get('description_ar') == new_desc, one)

    journey('admin: approve the correction -> visible to everyone')
    r = admin.post(f'/medicines/admin/change-requests/{rid}/approve', {})
    step('approve', r.ok, r)
    r = guest.get(f'/medicines/{mid}')
    step('the public medicine shows the approved value', r.ok and r.get('description_ar') == new_desc, r.get('description_ar'))
    r = admin.post(f'/medicines/admin/change-requests/{rid}/approve', {})
    step('approving twice is refused', r.status in (400, 409), r)

    journey('admin: approve the new item -> it exists in the catalog')
    r = admin.post(f'/medicines/admin/change-requests/{nid}/approve', {})
    new_id = (r.get('applied') or {}).get('new_medicine_id') if isinstance(r.body, dict) else None
    step('approve new item creates a catalog record', r.ok and new_id, r)
    r = admin.get(f'/medicines/admin/catalog?q={tag}')
    rows = r.body if isinstance(r.body, list) else (r.get('data') or r.get('items') or [])
    step('the new record is in the admin catalog', any(x.get('id') == new_id for x in rows), f'{len(rows)} rows')

    journey('admin: reject a suggestion -> catalog unchanged')
    r = guest.post(f'/medicines/{mid}/suggest-change', {'type': 'field_edit', 'changes': {'description_ar': 'اقتراح سيرفض'}})
    rj = r.get('request_id')
    r = admin.post(f'/medicines/admin/change-requests/{rj}/reject', {'reason': 'غير دقيق'})
    step('reject', r.ok, r)
    r = guest.get(f'/medicines/{mid}')
    step('rejected value never reaches the catalog', r.get('description_ar') == new_desc, r.get('description_ar'))

    journey('abuse: a guest floods suggestions')
    codes = [guest.post(f'/medicines/{mid}/suggest-change', {'type': 'other', 'note': f'spam {i}'}).status for i in range(15)]
    step('15 guest suggestions in a row are limited (expect a 429 or a duplicate guard)', any(c == 429 for c in codes),
         f'statuses: {sorted(set(codes))} (rate limiter disabled locally: DISABLE_RATE_LIMIT=true; production relies on the global throttler only)')


if __name__ == '__main__':
    run()
    summary()
