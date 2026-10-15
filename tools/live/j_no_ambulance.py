"""Journey: the ambulance provider type is gone (decision 14, issue 333).
  Registration refuses the role (it was still self-registerable through POST /auth/register), the admin notification centre
  no longer offers an "ambulance" audience, and the six other provider types still register.
  The ambulance dispatch backend is gone too: every SOS trigger / claim / track / active / dispatch route, the provider
  and admin ambulance fleet and the drivers module answer 404 (for a patient and for an admin), and the admin dashboards
  no longer carry SOS counters. "Send my location to my emergency contacts" (POST /emergency/share-location) still works.
"""
import time

from lib import Client, journey, step

# Same list as backend/acceptance/d-14/ambulance-removed.acceptance.ts (the routes the removed system served).
GONE = [
    ('POST', '/emergency/trigger'), ('GET', '/emergency/my/active'), ('POST', '/emergency/e-1/cancel'),
    ('GET', '/emergency/driver/missions'), ('POST', '/emergency/e-1/claim'), ('GET', '/emergency/tracking'),
    ('POST', '/emergency/e-1/track'), ('GET', '/emergency/active'), ('GET', '/emergency/e-1'),
    ('POST', '/emergency/e-1/assign'), ('POST', '/emergency/e-1/escalate-997'), ('POST', '/emergency/e-1/auto-dispatch'),
    ('POST', '/emergency/e-1/resolve'), ('POST', '/emergency/e-1/dispatch'),
    ('GET', '/provider/ambulance/fleet'), ('POST', '/provider/ambulance/fleet'),
    ('GET', '/admin/ambulance/fleet'), ('POST', '/admin/ambulance/fleet/v-1/approve'),
    ('POST', '/drivers/online'), ('GET', '/drivers/shift'), ('POST', '/drivers/location'),
    ('GET', '/drivers/orders/available'), ('POST', '/drivers/orders/o-1/accept'), ('GET', '/drivers/available'),
    ('GET', '/drivers/admin/online'),
]


def call(client, method, path):
    return client.get(path) if method == 'GET' else client.req(method, path, {})


def main():
    import j_admin, j_accounts
    from j_accounts import anon, mail_code, phone, uniq
    admin, _ = j_admin.login()

    journey('decision 14: nobody can register as an ambulance')
    email = f'{uniq("amb")}@nabd.test'
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
    code = mail_code(email, t0)
    anon.post('/auth/verify-otp', {'email': email, 'code': code})
    r = anon.post('/auth/register', {'full_name': 'اسعاف', 'phone': phone(), 'email': email, 'password': 'Str0ng!Pass' + uniq('')[-4:], 'role': 'ambulance'})
    step('POST /auth/register with role ambulance is refused', r.status == 400 and 'role_not_self_registerable' in str(r.body), r)
    nurse = j_accounts.app_signup(role='nurse', label='still-nurse')
    step('another provider role still registers (nurse)', bool(nurse.get('token')), nurse.get('user'))

    journey('decision 14: no ambulance audience in the admin notification centre')
    body = {'title': 'اختبار', 'body': 'اختبار', 'segment': 'role:ambulance', 'audience_confirmed': True}
    r = admin.post('/admin/admin/notification-center/broadcasts', body)
    step('a broadcast to "role:ambulance" is refused', r.status == 400 and 'unsupported notification segment' in str(r.body), r)
    uid = (nurse.get('user') or {}).get('id') or ''
    r = admin.post('/admin/admin/notification-center/broadcasts', {**body, 'segment': f'user:{uid}'})
    step('the notification centre itself still works (a single-user audience is accepted)', r.ok, r)

    journey('decision 14: the ambulance dispatch, fleet and drivers routes are gone')
    pat_acc = j_accounts.app_signup(label='amb-patient')
    pat = Client(pat_acc['token'], 'patient')
    still = [f'patient {m} {p} -> {r.status}' for m, p in GONE for r in [call(pat, m, p)] if r.status != 404]
    step(f'patient: all {len(GONE)} removed routes answer 404', not still, still)
    # the admin goes through the admin panel's proxy (/api/admin/<path> -> /api/v1/<path>), which passes the status on
    still = [f'admin {m} {p} -> {r.status}' for m, p in GONE for r in [call(admin, m, '/api/admin' + p)] if r.status != 404]
    step(f'admin: all {len(GONE)} removed routes answer 404', not still, still)

    journey('decision 14: the admin dashboards carry no SOS counters')
    r = admin.get('/admin/admin/command-center-v2')
    step('command centre answers and has no "sos_open" tile', r.ok and 'sos_open' not in (r.get('tiles') or {}), r)
    r = admin.get('/admin/admin/ops/overview')
    step('ops overview answers and has no "emergency" pipeline', r.ok and 'emergency' not in (r.get('pipelines') or {}), r)
    r = admin.get('/admin/admin/ops/requests?kind=emergency')
    step('the ops request feed has no emergency rows', r.ok and not [x for x in (r.get('data') or []) if x.get('kind') == 'emergency'], r)
    if uid:
        r = admin.get(f'/admin/admin/users/{uid}/overview?days=30')
        act = r.get('activity') or {}
        step('the user overview answers without "sos_total" / "recent_sos"', r.ok and 'sos_total' not in act and 'recent_sos' not in act, r)

    journey('decision 14: "send my location to my emergency contacts" still works')
    sister = j_accounts.app_signup(label='amb-sister')
    r = pat.post('/health/emergency-contacts', {'name': 'أخت', 'phone': sister['phone'], 'relation': 'sister', 'isPrimary': True})
    step('patient adds an emergency contact who uses the app', r.ok, r)
    neighbour = phone()
    r = pat.post('/health/emergency-contacts', {'name': 'جار', 'phone': neighbour, 'relation': 'neighbour'})
    step('patient adds an emergency contact who is only a phone number', r.ok, r)
    r = pat.post('/emergency/share-location', {'lat': 21.5433, 'lng': 39.1728})
    step('POST /emergency/share-location answers 2xx with the map link', r.ok and '21.5433' in str(r.get('map_url')) and '39.1728' in str(r.get('map_url')), r)
    step('the app-user contact is notified in the app (notified = 1)', r.ok and r.get('notified') == 1, r)
    links = r.get('sms_links') or []
    nb = next((x for x in links if x.get('phone') == neighbour), None)
    step('the other contact comes back as an sms: link with the map link', bool(nb) and str(nb.get('href', '')).startswith('sms:') and '21.5433' in str(nb.get('href')), links)
    feed = Client(sister['token'], 'patient').get('/notifications')
    step('the contact sees the location notification in their feed', feed.ok and '21.5433' in str(feed.body), feed)
    r = pat.post('/emergency/share-location', {'lat': 200, 'lng': 39})
    step('an invalid latitude is refused (400)', r.status == 400, r)
    r = anon.post('/emergency/share-location', {'lat': 21.5, 'lng': 39.1})
    step('an anonymous caller is refused (401)', r.status == 401, r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
