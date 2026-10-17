"""Journey: the provider drug index (GET /drugs, provider-app MedicalDrugIndexScreen) is for providers and admins only.
  It lists the whole catalogue, items still in medical review included, so a patient gets 403 on every route;
  a pharmacy still lists and opens an item that is in review. Patients search the public catalogue (/medicines).
"""
from lib import Client, journey, step, summary
from j_pharmacy import catalog_body


def run():
    import j_admin, j_accounts, j_onboarding
    admin, _ = j_admin.login()
    journey('GET /drugs: provider drug index is providers/admin only')
    r = admin.post('/medicines/admin/catalog', catalog_body('دواء فهرس مزودين', 'Provider Index Drug', 9.0))
    mid = r.get('id')
    step('admin adds an item (medical review pending)', r.ok and mid, r)
    pat = Client(j_accounts.app_signup(label='drugs-patient')['token'], 'patient')
    r = pat.get('/drugs?search=Provider%20Index%20Drug')
    step('patient GET /drugs -> 403', r.status == 403, r)
    r = pat.get(f'/drugs/{mid}')
    step('patient GET /drugs/:id -> 403', r.status == 403, r)
    r = pat.get('/drugs/categories')
    step('patient GET /drugs/categories -> 403', r.status == 403, r)
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    ph = Client(p['token'], 'pharmacy')
    r = ph.get('/drugs?search=Provider%20Index%20Drug')
    step('pharmacy lists the index, including the item in review', r.ok and any(x.get('id') == mid for x in (r.get('data') or [])), r)
    r = ph.get(f'/drugs/{mid}')
    step('pharmacy opens the item', r.ok and r.get('id') == mid, r)


if __name__ == '__main__':
    run()
    summary()
