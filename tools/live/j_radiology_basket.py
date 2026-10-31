"""Journey (radiology basket, #2257): a radiology basket is booked on /radiology/bookings. The quote names the centre by its
profile id; the booking resolves that profile to the centre's account; an unknown profile is refused.
  - POST /radiology/bookings {service_id, scheduled_at, location_type, payment_method, provider_id} (the basket's body)
  - GET /radiology/bookings/:id (the booking is with the centre's account)
"""
from lib import Client, journey, step, summary


def run():
    import j_admin, j_onboarding, j_accounts, j_radiology
    admin, _ = j_admin.login()
    j_radiology.admin_publishes_scans(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/radiology/services').items()]
    p = j_onboarding.register_type('radiology', {'equipment_list': catalog})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    center = Client(p['token'], 'radiology')
    profile_id = center.get('/provider-onboarding/my-profile').get('id')
    center_account = center.get('/provider/me').get('account', 'id')
    step('the centre has a profile id and an account id', bool(profile_id) and bool(center_account), (profile_id, center_account))

    pat = Client(j_accounts.app_signup(label='rad-basket-patient')['token'], 'patient')
    scan = pat.get('/radiology/services').items()[0]

    journey('radiology basket: the scan is booked by the profile id the quote names')
    body = {'service_id': scan['id'], 'scheduled_at': j_radiology.tomorrow_at(11), 'location_type': 'facility', 'payment_method': 'cash',
            'provider_id': profile_id}
    r = pat.post('/radiology/bookings', body)
    bid = r.get('id')
    step('the basket books the scan on /radiology/bookings with the quoted profile id', r.ok and bool(bid), r)
    if not bid:
        return summary()
    b = pat.get(f'/radiology/bookings/{bid}')
    step('the booking is with the centre\'s account', b.get('provider_account_id') == center_account, b)

    journey('radiology basket: an unknown centre is refused')
    r = pat.post('/radiology/bookings', dict(body, provider_id='00000000-0000-4000-8000-00000000dead', scheduled_at=j_radiology.tomorrow_at(12)))
    step('an unknown provider profile is refused (provider_not_found)', not r.ok and 'provider_not_found' in str(r.body), r)
    summary()


if __name__ == '__main__':
    run()
