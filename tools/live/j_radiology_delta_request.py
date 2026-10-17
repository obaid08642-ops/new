"""Journey: a radiology centre's "add a scan" and "availability schedule" requests reach an admin
(provider-app RadiologyDashboard: POST /radiology/catalog/delta-request, walkthrough docs/review/walkthrough/provider-app.md P32).
  The route used to answer "submitted for admin approval" after emitting an event that only the SEO indexer reads:
  nothing was stored, no admin saw it. Now a new scan is an approval request (same queue as a lab's new test) and a
  schedule update is a settings change waiting for review.
"""
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_onboarding
    admin, _ = j_admin.login()
    scans = Client(None, 'anon').get('/radiology/services')
    catalog = [x['id'] for x in (scans.body if isinstance(scans.body, list) else scans.items())][:3]
    p = j_onboarding.register_type('radiology', {'equipment_list': catalog})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    rad = Client(p['token'], 'radiology')
    tag = uuid.uuid4().hex[:6]

    journey('radiology: a new scan the centre proposes reaches the admin')
    body = {'name_ar': f'رنين الركبة {tag}', 'name_en': f'Knee MRI {tag}', 'modality_category': 'MRI', 'price': 450,
            'estimated_duration_minutes': 40, 'insurance_availability': True, 'portable_ultrasound': False,
            'requires_pregnancy_check': False, 'requires_metal_implant_check': True, 'requires_contrast_allergy_check': False,
            'preparation_keys': ['no_metal', 'fasting_6h']}
    r = rad.post('/radiology/catalog/delta-request', body)
    req_id = r.get('id') or r.get('data', 'id')
    step('the centre sends the scan and the answer carries a request id', r.ok and req_id, r)
    r = admin.get('/approval-workflow/requests/pending')
    rows = r.body if isinstance(r.body, list) else r.items()
    mine = next((x for x in rows if x.get('id') == req_id), None)
    step('the admin review list holds the request with who proposed it', r.ok and mine and mine.get('submitter_name'), str(mine)[:300])
    cd = (mine or {}).get('change_data') or {}
    step('the request carries the price and the preparation text', cd.get('price') == 450 and 'Remove metal objects' in str(cd.get('preparation_en')), cd)
    r = rad.post('/radiology/catalog/delta-request', {'price': 10})
    step('a scan without a name is refused, not acknowledged', r.status == 400, r)

    journey('radiology: the availability schedule waits for review')
    r = rad.post('/radiology/catalog/delta-request', {'type': 'schedule_update', 'working_days': [True, True, True, True, True, False, False],
                 'morning_shift': {'from': '08:00', 'to': '14:00'}, 'evening_shift': {'from': '17:00', 'to': '22:00'}, 'emergency_available': True})
    step('the schedule update is acknowledged as waiting for review', r.ok and r.get('pending_review') is True, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    deltas = r.items()
    step('the admin sees the schedule change among the pending provider changes',
         r.ok and any((d.get('requested_changes') or {}).get('settings_key') == 'radiology_schedule' for d in deltas), [d.get('target') for d in deltas][:10])


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
