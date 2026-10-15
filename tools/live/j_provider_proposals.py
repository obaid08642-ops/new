"""Journey: provider proposals reach an admin (needs-review provider-journeys 28).
  The lab dashboard's "Add custom test" (and its price edits, and a pharmacy's new product) go to
  POST /approval-workflow/requests, a queue no admin page read on main. Now admin/service-proposals lists them with who
  proposed (GET /approval-workflow/requests/pending), the admin approves a test (published and owned by the lab:
  GET /service-catalog/mine/lab) or rejects one with a reason the lab reads in its requests.
"""
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_onboarding
    admin, _ = j_admin.login()

    journey('provider-journeys 28: a lab proposes tests, the admin decides')
    tests = Client(None, 'anon').get('/labs/services')
    catalog = [x['id'] for x in (tests.body if isinstance(tests.body, list) else tests.items())][:3]
    p = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    tag = uuid.uuid4().hex[:6]
    # LabDashboard "Add custom test" body
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'change_data': {'type': 'lab', 'name_ar': f'تحليل مقترح {tag}', 'name_en': f'Proposed test {tag}', 'price': 120, 'fasting_required': True, 'turnaround_hours': 24, 'reference_ranges': {'min': 1, 'max': 9, 'unit': 'mg/dL'}}})
    test_req = r.get('id')
    step('the lab sends a new test for review', r.ok and test_req, r)
    r = lab.post('/approval-workflow/requests', {'entity_type': 'service', 'change_data': {'type': 'lab', 'name_ar': f'مرفوض {tag}', 'price': 10}})
    reject_req = r.get('id')
    r = admin.get('/approval-workflow/requests/pending')
    rows = r.body if isinstance(r.body, list) else r.items()
    mine = [x for x in rows if x.get('id') in (test_req, reject_req)]
    step('the admin review list has both proposals with who proposed them', r.ok and len(mine) == 2 and all(x.get('submitter_name') for x in mine), str(mine)[:400])
    r = admin.post(f'/approval-workflow/requests/{test_req}/decide', {'decision': 'approved'})
    test_id = r.get('entity_id')
    step('the admin approves the test', r.ok and r.get('status') == 'approved' and test_id, r)
    r = admin.post(f'/approval-workflow/requests/{reject_req}/decide', {'decision': 'rejected', 'notes': 'اسم غير واضح'})
    step('the admin rejects one with a reason', r.ok and r.get('status') == 'rejected', r)
    r = lab.get('/service-catalog/mine/lab')
    owned = r.body if isinstance(r.body, list) else r.items()
    step('the approved test belongs to the lab', r.ok and test_id in {x.get('id') for x in owned}, [x.get('id') for x in owned][:10])
    r = Client(None, 'anon').get(f'/labs/services/{test_id}')
    step('the approved test is published', r.ok and r.get('name_ar') == f'تحليل مقترح {tag}' and r.get('price') == 120, r)
    r = lab.get('/approval-workflow/my-requests')
    rej = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('id') == reject_req), {})
    step('the lab reads the rejection reason', rej.get('status') == 'rejected' and rej.get('rejected_reason') == 'اسم غير واضح', rej)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
