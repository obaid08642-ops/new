"""Journey (QA provider service options): a lab, a radiology centre and a nurse choose, per service, what they offer,
where (premises or home), whether they accept insurance, and the price; a patient then sees exactly the matching providers.
  - the admin publishes one lab test, one scan and one nursing service of this run (medical review approved);
  - two labs, two centres and two nurses register with those services through the registration wizard
    (step 3: test_prices, test_insurance_map, test_home_map; scan_prices, scan_insurance_map; nursing_services with a price);
    the second provider of each pair differs on price, insurance and home collection;
  - a nurse then changes its insurance acceptance through the settings change (the nursing dashboard's own call); the admin approves it;
  - the patient sees each provider's price and options for the service, and the home and insurance filters return only the matching ones.
Each gap is a failing step (recorded in docs/qa/findings/provider-services.md). A missing route is a FAIL, never a PASS."""
import urllib.parse

from lib import Client, journey, step


def items(r):
    return r.body if isinstance(r.body, list) else r.items()


def pending_ids(admin):
    return {x.get('id') for x in admin.get('/admin/admin/providers/provider-deltas').items() if x.get('status') == 'pending'}


def approve_new(admin, before, label):
    """The admin approves every change the provider just made."""
    new = [x for x in admin.get('/admin/admin/providers/provider-deltas').items() if x.get('status') == 'pending' and x.get('id') not in before]
    step(f'{label}: the change waits for admin review', len(new) > 0, f'{len(new)} pending')
    for x in new:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/approve", {})
        step(f'{label}: the admin approves the change', r.ok, r)


def main():
    import j_admin, j_onboarding, j_lab, j_radiology, j_nursing, j_accounts
    from lib import summary
    admin, _ = j_admin.login()

    journey('provider services: the admin publishes one test, one scan and one nursing service for this run')
    test_id = j_lab.admin_publishes_tests(admin)
    j_radiology.admin_publishes_scans(admin)
    j_nursing.admin_publishes_nursing(admin)
    labs_cat = Client(None, 'anon').get('/labs/services').items()
    rad_cat = Client(None, 'anon').get('/radiology/services').items()
    nur_items = items(Client(None, 'anon').get('/nursing/catalog'))
    test = next((x for x in labs_cat if x.get('id') == test_id), None)
    step('the new test is public (GET /labs/services)', test is not None, test_id)
    scan = rad_cat[0] if rad_cat else None
    step('a scan is public (GET /radiology/services)', scan is not None, len(rad_cat))
    svc = nur_items[0] if nur_items else None
    step('a nursing service is public (GET /nursing/catalog)', svc is not None, len(nur_items))
    if not (test and scan and svc):
        summary()
        return

    journey('provider services: two labs register with the test and their own price, insurance and home collection')
    catalog_labs = [test_id] + [x['id'] for x in labs_cat if x['id'] != test_id][:19]
    lab_options = [
        {'price': '95', 'insurance': True, 'home': True},
        {'price': '130', 'insurance': False, 'home': False},
    ]
    labs = []
    for o in lab_options:
        p = j_onboarding.register_type('lab', {
            'test_prices': {test_id: o['price']},
            'test_insurance_map': {test_id: o['insurance']},
            'test_home_map': {test_id: o['home']},
        }, step3_extra={'test_categories': catalog_labs})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        labs.append(p)

    journey('provider services: two radiology centres register with the scan and their own price and insurance')
    catalog_rad = [scan['id']] + [x['id'] for x in rad_cat if x['id'] != scan['id']][:19]
    centre_options = [{'price': '210', 'insurance': True}, {'price': '190', 'insurance': False}]
    centres = []
    for o in centre_options:
        p = j_onboarding.register_type('radiology', {
            'scan_prices': {scan['id']: o['price']},
            'scan_insurance_map': {scan['id']: o['insurance']},
        }, step3_extra={'equipment_list': catalog_rad})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        centres.append(p)

    journey('provider services: two nurses register with the service at their own price; one then accepts insurance for it')
    nurses = []
    for price in (150, 120):
        p = j_onboarding.register_type('home_care', {'nursing_services': [{'key': svc['id'], 'name_ar': svc.get('name_ar'), 'price': price}]})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        p['profile_id'] = Client(p['token'], 'nurse').get('/provider-onboarding/my-profile').get('id')
        nurses.append(p)
    before = pending_ids(admin)
    r = Client(nurses[0]['token'], 'nurse').post('/provider/settings/delta', {'newData': {'insurance_covered_services': [svc['id']]}})
    step('nurse A accepts insurance for the service (POST /provider/settings/delta)', r.ok, r)
    approve_new(admin, before, 'nurse A')

    pat_acc = j_accounts.app_signup(label='service-options')
    pat = Client(pat_acc['token'], 'patient')

    journey('provider services (patient): the lab test lists each lab with its own price')
    r = Client(None, 'anon').get(f"/labs/compatible-providers?testIds={urllib.parse.quote(test_id)}")
    rows = items(r)
    step('both labs are listed for the test', r.ok and len(rows) >= 2, f'{r.status} {len(rows)} rows')
    step('each listed lab shows its own price for the test (95 and 130)', sorted(x.get('price') for x in rows) == [95, 130], [x.get('price') for x in rows])
    po = Client(None, 'anon').get(f"/labs/price-comparison?serviceId={urllib.parse.quote(test_id)}")
    offers = (po.body or {}).get('offers') or []
    step('the price comparison shows lab A at 95 and lab B at 130', sorted(o.get('price') for o in offers) == [95, 130], f'{po.status} {[o.get("price") for o in offers]}')
    step('the price comparison says which lab does home collection (lab A)', any(o.get('home_collection_supported') for o in offers), offers[:2])
    step('the price comparison says which lab accepts insurance (lab A)', any(o.get('insurance_covered') for o in offers), offers[:2])

    journey('provider services (patient): the home and insurance filters return only the matching labs')
    r = Client(None, 'anon').get(f"/labs/compatible-providers?testIds={urllib.parse.quote(test_id)}&location=home")
    step('the home filter returns only labs that collect at home', r.ok and len(items(r)) == 1, f'{r.status} {len(items(r))} rows')
    r = Client(None, 'anon').get(f"/labs/compatible-providers?testIds={urllib.parse.quote(test_id)}&insurance=1")
    step('the insurance filter returns only labs that accept insurance for the test', r.ok and len(items(r)) == 1, f'{r.status} {len(items(r))} rows')

    journey('provider services (patient): the scan lists each centre with its own price and insurance')
    po = Client(None, 'anon').get(f"/radiology/price-comparison?serviceId={urllib.parse.quote(str(scan['id']))}")
    offers = (po.body or {}).get('offers') or []
    step('the scan price comparison shows centre A at 210 and centre B at 190', sorted(o.get('price') for o in offers) == [190, 210], f'{po.status} {[o.get("price") for o in offers]}')
    step('the scan price comparison says which centre accepts insurance', any(o.get('insurance_covered') for o in offers), offers[:2])

    journey('provider services (patient): the nursing service lists each nurse with its price and insurance')
    r = pat.get(f"/home-care/providers?type={svc['id']}&sort=rating&gender=any&availability=any&nationality=any&search=")
    rows = items(r)
    ours = [x for x in rows if x.get('profile_id') in {n['profile_id'] for n in nurses}]
    step('both of this run\'s nurses are listed for the service', r.ok and len(ours) == 2, f'{r.status} {len(ours)} of {len(rows)} rows')
    print('    nurse row keys:', sorted(ours[0].keys()) if ours else [])
    by_profile = {x.get('profile_id'): x for x in ours}
    price_a = by_profile.get(nurses[0]['profile_id'], {}).get('price')
    price_b = by_profile.get(nurses[1]['profile_id'], {}).get('price')
    step('nurse A shows its own price for the service (150)', price_a == 150, price_a)
    step('nurse B shows its own price for the service (120)', price_b == 120, price_b)
    step('nurse A is marked as accepting insurance for the service', bool(by_profile.get(nurses[0]['profile_id'], {}).get('insurance_covered')), by_profile.get(nurses[0]['profile_id'], {}).get('insurance_covered'))
    r = pat.get(f"/home-care/providers?type={svc['id']}&insurance=1&sort=rating&gender=any&availability=any&nationality=any&search=")
    step('the insurance filter returns only nurses that accept insurance (every row is marked)', r.ok and all(x.get('insurance_covered') for x in items(r)), f'{r.status} {len(items(r))} rows')
    summary()


if __name__ == '__main__':
    main()
