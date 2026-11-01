"""Journey (provider resubmit after a rejection, #2228 and #2245): an admin rejects a new doctor's application with a written
reason; the provider's status shows "rejected" and the reason; the provider resubmits; the application is back in the
pending review queue, the status is no longer rejected, and the rejection reason is no longer shown.
  - admin: POST /admin/admin/providers/:id/reject {reason} (provider.controllers.ts, admin/providers)
  - provider: GET /provider-onboarding/progress (review_status, review_note); POST /provider-onboarding/submit (the wizard's submit)
  - admin: GET /admin/admin/providers?status=pending (the queue)
"""
from lib import Client, journey, step, summary

REASON = 'الرخصة منتهية، أعد التقديم بعد التجديد'


def run():
    import j_admin, j_onboarding
    from j_onboarding import upload
    admin, _ = j_admin.login()
    p = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    prov = Client(p['token'], 'doctor')
    loc = {'lat': 24.7136, 'lng': 46.6753}

    journey('provider resubmit: the admin rejects the application with a reason')
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    items = r.body.get('items', []) if isinstance(r.body, dict) else []
    mine = next((i for i in items if i.get('email') == p['email']), None)
    step('the new doctor is in the pending list', r.ok and mine, r)
    if not mine:
        return summary()
    r = admin.post(f"/admin/admin/providers/{mine['id']}/reject", {'reason': REASON})
    step('admin rejects the application with a reason', r.ok, r)

    journey('provider resubmit: the provider sees the rejection and its reason')
    r = prov.get('/provider-onboarding/progress')
    step('progress says the application is rejected', r.ok and r.get('review_status') == 'rejected', r)
    step("progress carries the reviewer's reason", r.get('review_note') == REASON, r.get('review_note'))

    journey('provider resubmit: the provider resubmits for review')
    sig = upload(prov, 'signature.png', 'image/png')
    r = prov.post('/legal/accept/provider_agreement', {})
    step('the provider reads and accepts the provider agreement', r.ok, r)
    r = prov.post('/provider-onboarding/submit', {'signer_name': 'مدير صيدلية اختبار', 'signer_role': 'owner', 'lat': loc['lat'], 'lng': loc['lng'],
                                                  'signature_url': sig, 'full_data': {'nameAr': 'طبيب إعادة التقديم', 'city': 'الرياض'}})
    step('the provider resubmits (POST /provider-onboarding/submit)', r.ok, r)
    r = prov.get('/provider-onboarding/progress')
    step('the application is no longer rejected', r.ok and r.get('review_status') != 'rejected', r)
    step('the old rejection reason is no longer shown', not r.get('review_note'), r.get('review_note'))
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    back = [i for i in (r.body.get('items', []) if isinstance(r.body, dict) else []) if i.get('email') == p['email']]
    step('the application is back in the pending review queue', bool(back), r)
    summary()


if __name__ == '__main__':
    run()
