"""Journey (QA PR-05): pharmacy B2B procurement, rejection and cancellation by the pharmacy.
  - a quotation the admin issued is declined by the pharmacy (POST /pharmacy/procurement/:id/feedback status CANCELLED):
    MongoDB procurementrequests -> CANCELLED; the pharmacy cannot answer again; the admin cannot complete it.
  - the pharmacy cannot cancel a request through the admin route (PATCH /admin/procurement/:id/cancel answers 403).
  - a request still waiting for review is cancelled by the admin (PATCH /admin/procurement/:id/cancel), the pharmacy sees it.
Every write is checked in MongoDB (procurementrequests). Routes: pharmacy/procurement.controller.ts, admin-procurement.controller.ts."""
import json
import subprocess

from lib import Client, journey, step


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def request_row(pid):
    return mongo_json(f'db.procurementrequests.findOne({{_id: ObjectId("{pid}")}}, {{_id: 0, status: 1, pharmacy_id: 1}})')


def submit(pharm, meds):
    body = {'items': [{'medicine_id': m['id'], 'raw_name_string': m['name_en'], 'requested_quantity': 20 + i}
                      for i, m in enumerate(meds[:2])]}
    r = pharm.post('/pharmacy/procurement/submit-request', body)
    pid = r.get('procurement_id')
    step('pharmacy submits a shortage request', r.ok and pid, r)
    return pid


def run(pharm, admin, meds):
    journey('procurement PR-05: pharmacy declines the quotation')
    pid = submit(pharm, meds)
    if not pid:
        return
    row = request_row(pid)
    step('MongoDB: the request waits for admin review', bool(row) and row.get('status') == 'PENDING_ADMIN_REVIEW', row)
    r = admin.patch(f'/admin/admin/procurement/{pid}/review', {})
    step('admin starts the review', r.ok, r)
    items = [{'medicineId': m['id'], 'quantity': 20 + i, 'price': 12.5 + i} for i, m in enumerate(meds[:2])]
    r = admin.post(f'/admin/admin/procurement/{pid}/quotation', {'items': items, 'totalPrice': sum(x['quantity'] * x['price'] for x in items)})
    step('admin issues the quotation', r.ok, r)
    row = request_row(pid)
    step('MongoDB: QUOTATION_ISSUED', bool(row) and row.get('status') == 'QUOTATION_ISSUED', row)
    r = pharm.post(f'/pharmacy/procurement/{pid}/feedback', {'status': 'CANCELLED', 'pharmacyFeedback': 'السعر مرتفع (QA)'})
    step('pharmacy declines the quotation', r.ok, r)
    row = request_row(pid)
    step('MongoDB: the request is CANCELLED', bool(row) and row.get('status') == 'CANCELLED', row)
    r = pharm.get('/pharmacy/procurement/my-requests')
    mine = next((x for x in r.items() if x.get('_id') == pid or x.get('id') == pid), None)
    step('pharmacy list shows the request CANCELLED after reload', r.ok and mine and mine.get('status') == 'CANCELLED', r.status)
    r = pharm.post(f'/pharmacy/procurement/{pid}/feedback', {'status': 'APPROVED_BY_PHARMACY'})
    step('the pharmacy cannot approve a cancelled request', not r.ok and 'Cannot respond' in str(r.body), r)
    r = admin.patch(f'/admin/admin/procurement/{pid}/complete', {})
    step('the admin cannot complete a cancelled request', not r.ok, r)
    row = request_row(pid)
    step('MongoDB: still CANCELLED after the refused calls', bool(row) and row.get('status') == 'CANCELLED', row)

    journey('procurement PR-05: pharmacy cannot cancel through the admin route; admin cancels a waiting request')
    pid2 = submit(pharm, meds)
    if not pid2:
        return
    r = pharm.patch(f'/admin/admin/procurement/{pid2}/cancel', {})
    step('the pharmacy is refused on the admin cancel route (404: route hidden from non-admins)', not r.ok and r.status in (403, 404), r)
    row = request_row(pid2)
    step('MongoDB: the refused cancel leaves the request PENDING_ADMIN_REVIEW', bool(row) and row.get('status') == 'PENDING_ADMIN_REVIEW', row)
    r = admin.patch(f'/admin/admin/procurement/{pid2}/cancel', {})
    step('admin cancels the waiting request', r.ok, r)
    row = request_row(pid2)
    step('MongoDB: the waiting request is CANCELLED', bool(row) and row.get('status') == 'CANCELLED', row)
    r = pharm.get('/pharmacy/procurement/my-requests')
    mine = next((x for x in r.items() if x.get('_id') == pid2 or x.get('id') == pid2), None)
    step('pharmacy sees it CANCELLED after reload', r.ok and mine and mine.get('status') == 'CANCELLED', r.status)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    meds = j_pharmacy.admin_adds_medicines(admin)
    run(Client(p['token'], 'pharmacy'), admin, meds)
    summary()
