"""Journey (QA AD-01 case 5, admin rejects a medicine): a new catalogue item in medical review is rejected by the admin,
and it never becomes public.
  - the admin creates a medicine (POST /medicines/admin/catalog), which starts in medical review (pending);
  - the admin rejects it (POST /medicines/admin/catalog/:id/approve with approve false, the medical-review decision);
  - the admin catalogue lists it with medical_review_status rejected (GET /medicines/admin/catalog?q=);
  - a patient search for the item name does not return it, before or after the rejection.
Approval of a medicine is covered in j_pharmacy.py (admin_approves)."""
import urllib.parse
import uuid

from lib import Client, journey, step


def main():
    import j_admin
    from j_pharmacy import catalog_body
    from lib import summary
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    body = catalog_body(f'دواء مرفوض {tag}', f'Rejected Drug {tag}', 12.0)

    journey('catalog AD-01 case 5: the admin rejects a medicine in medical review')
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step('the admin creates a medicine (medical review pending)', r.ok and mid, r)
    if not mid:
        summary()
        return
    patient = Client(None, 'anon')
    hits = lambda: [x.get('id') for x in patient.get('/medicines?q=' + urllib.parse.quote(body['name_en']) + '&limit=50').items()]
    step('before the decision a patient search does not show it', mid not in hits(), body['name_en'])

    r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': False})
    step('the admin rejects it (medical review decision, approve false)', r.ok and r.get('medical_review_status') == 'rejected', r)
    r = admin.get('/medicines/admin/catalog?q=' + urllib.parse.quote(body['name_en']) + '&limit=50')
    row = next((x for x in r.items() if x.get('id') == mid), None)
    step('the admin catalogue lists it as rejected (medical review)', r.ok and row is not None and row.get('medical_review_status') == 'rejected', row and row.get('medical_review_status'))
    step('after the rejection a patient search still does not show it', mid not in hits(), body['name_en'])
    summary()


if __name__ == '__main__':
    main()
