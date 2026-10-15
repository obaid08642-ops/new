"""Journey: no fixed medical text (owner decision B8, 2026-10-15; 14b-app #4, 3-app #6, 3-app #7, 5-app #14).
  - Lab sample tracking (GET /labs/bookings/:id/tracking, read by patient-app sample-tracking and the website):
    the steps are the booking's real states, the preparation is each booked test's own catalogue text,
    and the collector is a name, never an id or "Unknown".
  - Sleep advice: the published articles tagged "sleep" (GET /articles?tag=sleep), nothing else.
"""
import uuid

from lib import Client, journey, step


def tracking_check(admin, pat, lab, lab_id):
    import j_lab
    journey('B8: lab tracking is the booking\'s real timeline and each test\'s own preparation')
    bid, picks = j_lab.patient_books(pat, lab_id)
    if not bid:
        return
    r = lab.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CONFIRMED', 'note': 'accepted_by_lab'})
    step('the lab confirms the booking', r.ok, r)
    r = pat.get(f'/labs/bookings/{bid}/tracking')
    timeline = [x.get('state') for x in (r.get('timeline') or []) if isinstance(x, dict)]
    step('the steps are the states the booking went through', r.ok and timeline == ['NEW_REQUEST', 'CONFIRMED'], r)
    step('no invented step text ("State changed to ...")', 'State changed' not in str(r.body), r)
    step('no collector is named before one is assigned (no id, no "Unknown")', r.get('techName') in (None, ''), r)
    want = sorted(p['id'] for p in picks if (p.get('preparation_en') or p.get('preparation_ar')))
    got = sorted(x.get('service_id') for x in (r.get('preparation') or []) if isinstance(x, dict))
    step('the preparation is listed for exactly the booked tests that have one in the catalogue', r.ok and got == want, f'got={got} want={want}')


def sleep_check(admin):
    journey('B8: the sleep advice is the published articles tagged "sleep"')
    tag = uuid.uuid4().hex[:6]
    ids = {}
    for name, tags in (('sleep', ['sleep']), ('heart', ['heart'])):
        r = admin.post('/admin/admin/articles', {'title_ar': f'مقال {name} {tag}', 'title_en': f'Article {name} {tag}', 'body_ar': 'نص', 'body_en': 'Text',
                                           'category': 'wellness', 'tags': tags})
        ids[name] = r.get('id')
        step(f'admin writes the {name} article', r.ok and ids[name], r)
        r = admin.post(f'/admin/admin/articles/{ids[name]}/publish', {})
        step(f'admin publishes the {name} article', r.ok, r)
    r = Client().get('/articles?tag=sleep&limit=50')
    rows = r.body if isinstance(r.body, list) else r.items()
    got = [a.get('id') for a in rows if isinstance(a, dict)]
    step('the sleep screen\'s request lists the sleep article', r.ok and ids['sleep'] in got, r)
    step('and not an article without the sleep tag', ids['heart'] not in got, f'{len(got)} rows')


def run():
    import j_admin, j_accounts, j_onboarding, j_lab
    admin, _ = j_admin.login()
    j_lab.admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    p = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='b8-patient')['token'], 'patient')
    tracking_check(admin, pat, lab, lab_id)
    sleep_check(admin)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
