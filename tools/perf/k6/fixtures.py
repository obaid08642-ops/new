"""P14.27: the accounts and bookings the write scenarios of capacity.js need, made through the real API with the live-journey
helpers (tools/live), on a local test stack only.
  python3 tools/perf/k6/fixtures.py > /tmp/k6-fixtures.json
Makes: an approved doctor with video hours tomorrow and a video slot now, a patient, a paid booking (card, fake
gateway) with its booking chat thread, and a started video visit with a call session. Prints one JSON object: tokens,
ids and the gateway payment id that the payment-webhook scenario replays. Journey steps go to stderr; any failed step
exits 1 so a capacity run never measures half-made fixtures.
The admin steps call the backend directly (POST /auth/login + the emailed 2FA code), so no admin panel build is needed.
"""
import contextlib, json, os, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'live'))
EXTRA_PATIENTS = int(os.environ.get('K6_PATIENTS', '10')) - 1
API = os.environ.get('NABD_API', 'http://127.0.0.1:8002/api/v1')
if not API.startswith(('http://127.0.0.1', 'http://localhost')):
    sys.exit('fixtures.py: refused, NABD_API is not a local test stack')

with contextlib.redirect_stdout(sys.stderr):
    import j_accounts, j_consultation, j_onboarding, j_web_call
    from lib import Client, RESULTS, enroll_admin_device, journey, mail_code, step


class AdminApi(Client):
    """The admin journeys call the panel's BFF paths (/admin/admin/<x> -> /api/v1/admin/<x>); this sends them to the API."""

    def req(self, method, path, body=None, headers=None, idem=True):
        if path.startswith('/admin/admin/'):
            path = path[len('/admin'):]
        return super().req(method, path, body, headers, idem)


def admin_login():
    journey('fixtures: admin signs in to the API (email 2FA)')
    email, password = 'admin@nabd.test', os.environ.get('LIVE_ADMIN_PASSWORD', 'Adm1n!Live-Pass')
    t0 = time.time()
    r = Client().post('/auth/login', {'identifier': email, 'password': password})
    step('credentials -> 2FA', r.ok and r.get('requires_2fa'), r)
    code = mail_code(email, t0)
    r = Client().post('/auth/login/verify-2fa', {'identifier': email, 'code': code})
    tok = r.get('token')
    tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    step('2FA -> admin token', r.ok and tok, r)
    admin = AdminApi(tok, 'admin-api')
    enroll_admin_device(admin)
    return admin


def main():
    admin = admin_login()
    # j_web_call.setup signs the admin in through the panel; the API session above stands in for it
    import j_admin
    j_admin.login = lambda *a, **k: (admin, None)
    real_tomorrow = j_consultation.tomorrow
    s = j_web_call.setup()   # doctor (video), patient, a paid video visit the doctor has started
    if not s:
        return None
    j_consultation.tomorrow = real_tomorrow
    doctor, pat = s['doctor'], s['pat']

    # video hours 08:00-18:00 tomorrow (the doctor of j_web_call offers video only), for the booking scenario
    j_consultation.doctor_publishes_hours(doctor, admin, ('video',))
    paid = []
    real_pay = j_consultation.fake_pay
    j_consultation.fake_pay = lambda gid, *a, **k: (paid.append(gid), real_pay(gid, *a, **k))[1]
    booking_aid = j_consultation.book_variant(pat, doctor, 'video', 'card')
    j_consultation.fake_pay = real_pay
    gateway_id = paid[-1] if paid else None
    step('a paid booking tomorrow with its gateway payment id', booking_aid and gateway_id, paid)

    journey('fixtures: booking chat thread and a call session')
    r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': booking_aid})
    tid = r.get('id')
    step('booking chat thread', r.ok and tid, r)
    r = doctor.post('/calls/initiate', {'appointmentId': s['aid'], 'call_type': 'video'})
    sid = r.get('session_id') or r.get('id')
    step('call session for the started video visit', r.ok and sid, r)

    # one account per virtual user group: a patient holds one slot lock at a time, so a single shared patient would
    # turn every booking hold into an update of the same lock
    journey(f'fixtures: {EXTRA_PATIENTS} more patients')
    tokens = [pat.token] + [j_accounts.app_signup(label=f'k6-patient-{i}')['token'] for i in range(EXTRA_PATIENTS)]
    step('patient tokens', all(tokens), len([t for t in tokens if t]))
    profile_id = doctor.get('/provider-onboarding/my-profile').get('id')
    return {
        'patient_token': pat.token, 'patient_tokens': tokens, 'doctor_token': doctor.token, 'doctor_id': profile_id,
        'slot_day': real_tomorrow().isoformat(), 'appointment_id': booking_aid, 'video_appointment_id': s['aid'],
        'thread_id': tid, 'call_session_id': sid, 'gateway_payment_id': gateway_id,
    }


if __name__ == '__main__':
    with contextlib.redirect_stdout(sys.stderr):
        out = main()
    failed = [r for r in RESULTS if not r['ok']]
    for r in failed:
        print(f"FAIL {r['journey']}: {r['step']} -> {r['detail'][:300]}", file=sys.stderr)
    if failed or not out or not all(out.values()):
        sys.exit(1)
    print(json.dumps(out))
