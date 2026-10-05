"""P15.11 chaos and failure drills in the live gate.

Each drill asserts an explicit degraded behaviour (degrade, retry, message)
and the invariant that nothing is lost: a canary patient record written before
the drill reads back identical afterwards.

Controlled-failure mechanisms (see tools/live/chaos_ctrl.sh — they match how
the harness actually runs each dependency):
  redis down ............ pause the redis container / SIGSTOP redis-server
  mongo primary step-down mongosh rs.stepDown(30) on the rs0 set
  slow API (+2 s) ....... tools/live/slow_proxy.py (harness-side delay proxy;
                          no server-side latency switch exists — the backend
                          half is DEFERRED-OUT-OF-SCOPE, see notes)
  payment gateway 500 .... tools/live/fake_moyasar.py /__mode failure switch
  SMS provider down ...... no fake SMS provider exists in the harness
                          (DEFERRED-OUT-OF-SCOPE); the drill proves the
                          fallback that does exist: SMS disabled by default,
                          OTP still arrives via the smtp_sink email
  LiveKit down ........... the live gate never starts LiveKit; the drill
                          asserts the F37 contract (/config video_calls=false
                          and a call attempt fails fast with a message)

  Stack: backend :8002, smtp_sink :2525, fake_moyasar :9100 (see start-backend.sh).
  Payloads are copied from the clients the same way the other journeys do
  (j_accounts register flow, j_payments lab-booking + intent/verify).
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

from lib import Client, journey, step
import lib as libmod

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__)))
CTRL = os.path.join(ROOT, 'chaos_ctrl.sh')
FAKE_MOYASAR = 'http://127.0.0.1:9100'


def skip(name, reason):
    # A drill whose failure mechanism is unavailable in this environment skips
    # explicitly (same norm as j_admin_clicks.skip) — it never passes silently.
    return step(f'SKIP {name} ({reason})', True, 'skipped: no failure mechanism')


def ctrl(*args):
    try:
        out = subprocess.check_output(['bash', CTRL] + list(args), stderr=subprocess.STDOUT, timeout=60)
        return True, out.decode('utf8', 'replace').strip()
    except Exception as e:
        return False, str(e)[:300]


def has_docker():
    try:
        subprocess.check_output(['docker', 'info'], stderr=subprocess.STDOUT, timeout=15)
        return True
    except Exception:
        return False


def fresh_patient(label):
    """The patient-app register flow (j_accounts.app_signup), returned with its canary."""
    from j_accounts import app_signup
    acct = app_signup(label=label)
    pat = Client(acct['token'], label)
    me = pat.get('/auth/me')
    step(f'{label}: canary patient reads back before the drill', me.ok, me)
    return pat, acct


def canary_intact(pat, acct, label):
    me = pat.get('/auth/me')
    body = json.dumps(me.body, ensure_ascii=False) if not isinstance(me.body, str) else me.body
    return step(f'{label}: never loses data — canary patient intact after the drill',
                me.ok and acct['email'] in body, me)


def backend_liveness():
    try:
        with urllib.request.urlopen('http://127.0.0.1:8002/api/v1/health/liveness', timeout=15) as r:
            return r.status
    except Exception as e:
        return f'UNREACHABLE {e}'


def payable_lab_booking(pat):
    """Minimal payable lab booking, copied from j_payments.run."""
    from j_onboarding import register_type, admin_review, provider_after_approval
    import j_admin
    admin, _ = j_admin.login()
    lab = register_type('lab')
    admin_review(admin, lab)
    provider_after_approval(lab)
    lab_id = lab.get('account_id') or lab.get('id')
    r = pat.get('/labs/services')
    services = r.items() if r.ok else []
    if not services or not lab_id:
        return None, 'no lab catalog seeded'
    svc = services[0]
    r = pat.post('/labs/bookings', {'items': [{'service_id': svc.get('id')}],
                                    'provider_account_id': lab_id,
                                    'scheduled_at': '2030-01-01T10:00:00Z',
                                    'location_type': 'facility', 'payment_method': 'card'})
    bid = r.get('id')
    if not bid:
        step('chaos payment setup: lab booking created', False, r)
        return None, str(r)[:200]
    return bid, ''


def drill_redis_down():
    journey('chaos: Redis down — reads degrade, writes wait, nothing is lost')
    pat, acct = fresh_patient('chaos-redis')
    ok, msg = ctrl('redis-pause')
    if not ok:
        skip('redis down', msg)
        return
    try:
        liveness = backend_liveness()
        step('backend still answers liveness while Redis is down (degraded, not dead)',
             liveness == 200, f'liveness={liveness}')
        t0 = time.time()
        me = pat.get('/auth/me')
        elapsed = time.time() - t0
        body = str(me.body)[:300]
        step('reads degrade gracefully (2xx or a JSON error with a message — never a hang)',
             (me.ok or (isinstance(me.body, dict) and bool(me.body))) and elapsed < 55,
             f'{me.status} in {elapsed:.1f}s {body[:150]}')
    finally:
        ok2, msg2 = ctrl('redis-resume')
        step('redis resumed after the drill', ok2, msg2)
        time.sleep(2)
    canary_intact(pat, acct, 'redis down')
    me = pat.get('/auth/me')
    step('reads recover after Redis is back', me.ok, me)


def drill_mongo_stepdown():
    journey('chaos: MongoDB primary step-down — requests retry, nothing is lost')
    if not has_docker():
        skip('mongo step-down', 'no docker: stepDown needs the rs0 container')
        return
    pat, acct = fresh_patient('chaos-mongo')
    ok, msg = ctrl('mongo-stepdown')
    if not ok:
        skip('mongo step-down', msg)
        return
    # Single-node rs0: the step-down is a full write outage for ~30 s; on a
    # real multi-node set it would be a brief failover. Either way the client
    # must see retries/clear errors — never a hang and never a partial write.
    t0 = time.time()
    try:
        me = pat.get('/auth/me')
        elapsed = time.time() - t0
        ok_read = me.ok or (isinstance(me.body, dict) and bool(str(me.body)))
        step('a read during step-down retries or fails with a message (never hangs)',
             ok_read and elapsed < 55, f'{me.status} in {elapsed:.1f}s {str(me.body)[:150]}')
    except Exception as e:
        step('a read during step-down retries or fails with a message (never hangs)', False, str(e)[:200])
    # Wait for the primary to be re-elected (bounded: longer than the 30 s step-down).
    recovered = False
    for _ in range(24):
        if backend_liveness() == 200:
            probe = pat.get('/auth/me')
            if probe.ok:
                recovered = True
                break
        time.sleep(5)
    step('the API recovers after re-election (retry succeeds)', recovered, 'primary did not come back in 120 s')
    canary_intact(pat, acct, 'mongo step-down')


def drill_slow_api():
    journey('chaos: slow API (+2 s) — the app waits patiently, nothing is lost')
    import subprocess as sp
    proxy = sp.Popen([sys.executable, os.path.join(ROOT, 'slow_proxy.py'),
                      '--listen', '9101', '--target', 'http://127.0.0.1:8002',
                      '--delay', '2', '--slow-prefixes', '/api/v1'],
                     stdout=sp.DEVNULL, stderr=sp.DEVNULL)
    try:
        time.sleep(1)
        real_base = libmod.BASE
        libmod.BASE = 'http://127.0.0.1:9101/api/v1'
        try:
            pat, acct = fresh_patient('chaos-slow')
            t0 = time.time()
            me = pat.get('/auth/me')
            elapsed = time.time() - t0
            step('a slow read still succeeds (degrade: patient, not broken)', me.ok, me)
            step('the +2 s delay was actually injected (not a vacuous pass)',
                 elapsed >= 1.8, f'{elapsed:.1f}s')
        finally:
            libmod.BASE = real_base
    finally:
        proxy.terminate()
        proxy.wait(timeout=10)
    canary_intact(pat, acct, 'slow API')


def drill_payment_gateway_500():
    journey('chaos: payment gateway 500 — no charge, clear message, retry wins')
    pat, _ = fresh_patient('chaos-pay')
    bid, why = payable_lab_booking(pat)
    if not bid:
        skip('payment gateway 500', why)
        return
    import urllib.request as urlreq
    mode = urlreq.Request(FAKE_MOYASAR + '/__mode', data=json.dumps({'payments_fail': True}).encode(),
                          method='POST', headers={'content-type': 'application/json'})
    try:
        urlreq.urlopen(mode, timeout=10).read()
    except Exception as e:
        skip('payment gateway 500', f'fake_moyasar unreachable: {e}')
        return
    try:
        import uuid
        r = pat.post(f'/payments/intent/lab/{bid}', {'method': 'card'},
                     headers={'Idempotency-Key': f'chaos-{bid}-{uuid.uuid4()}'})
        txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        step('the intent during the outage is refused with a message (never a phantom success)',
             (not r.ok) and bool(str(r.body)), r)
        step('no paid transaction exists for the booking after the refused intent',
             not (isinstance(txn, dict) and txn.get('status') == 'paid'), r)
    finally:
        try:
            ok_req = urlreq.Request(FAKE_MOYASAR + '/__mode', data=json.dumps({'payments_fail': False}).encode(),
                                    method='POST', headers={'content-type': 'application/json'})
            urlreq.urlopen(ok_req, timeout=10).read()
            step('gateway failure mode switched off after the drill', True, '')
        except Exception as e:
            step('gateway failure mode switched off after the drill', False, str(e)[:200])
    # Retry on the healthy gateway: exactly one intent, exactly one paid charge.
    import uuid
    r = pat.post(f'/payments/intent/lab/{bid}', {'method': 'card'},
                 headers={'Idempotency-Key': f'chaos-retry-{bid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('retry after recovery creates the intent', r.ok and txn.get('id'), r)
    if txn.get('gateway_intent_id'):
        from j_nursing import fake_pay
        fake_pay(txn['gateway_intent_id'])
        v = pat.post(f"/payments/verify/{txn['id']}", {})
        step('retry pays exactly once (status paid)', v.ok and v.get('status') == 'paid', v)
        v2 = pat.post(f"/payments/verify/{txn['id']}", {})
        # Both sides must carry a real id: the old check allowed None on either
        # side of the membership test, so an id-less response passed as "the same
        # transaction". Now the replayed id must equal the verified id, and both
        # must be present.
        v_id, v2_id = v.get('id') or v.get('txn_id'), v2.get('id') or v2.get('txn_id')
        step('re-verify returns the same transaction (no duplicate charge)',
             v2.ok and bool(v_id) and bool(v2_id) and v2_id == v_id and v2.get('status') == 'paid',
             f'first={v_id} second={v2_id} (both must exist and match) {v2}')


def drill_sms_down():
    journey('chaos: SMS provider down — OTP falls back to email, nobody is locked out')
    # There is no fake SMS provider in the harness, so there is no switch to
    # flip (DEFERRED-OUT-OF-SCOPE: an SMS failure-injection double owned by the
    # backend agent). What the gate CAN prove today is the fallback the code
    # actually implements (SmsService: disabled by default -> senders fall back
    # to email + push): a fresh register OTP still arrives by email.
    import time as _t
    from lib import mail_code, uniq, phone
    anon = Client()
    email = f'sms-fallback-{uniq("c")}@nabd.test'
    t0 = _t.time()
    r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
    step('send-otp answers while SMS is down/disabled', r.ok, r)
    code = mail_code(email, t0)
    step('the OTP is delivered by email (SMS -> email fallback works)', code, 'no mail with a 6-digit code')
    if code:
        r = anon.post('/auth/verify-otp', {'email': email, 'code': code})
        step('the emailed OTP verifies (the user is not locked out)', r.ok, r)


def drill_livekit_down():
    journey('chaos: LiveKit down — no dead call button, a clear message instead')
    pat, _ = fresh_patient('chaos-call')
    cfg = pat.get('/config')
    features = cfg.get('features') or {}
    video_calls = features.get('video_calls')
    step('/config is reachable and carries the video_calls flag (F37 input)', cfg.ok and isinstance(features, dict), cfg)
    if video_calls:
        skip('livekit down', 'LiveKit is configured here; the down-drill needs it absent')
        return
    step('calls are not advertised while LiveKit is down (video_calls=false)', video_calls is False, features)
    t0 = time.time()
    try:
        r = pat.post('/calls/initiate', {'callee_id': 'nobody', 'call_type': 'video'})
        elapsed = time.time() - t0
        step('a call attempt fails fast with a JSON message (never hangs, never a phantom room)',
             r.status >= 400 and isinstance(r.body, dict) and bool(str(r.body)) and elapsed < 20,
             f'{r.status} in {elapsed:.1f}s {str(r.body)[:150]}')
    except Exception as e:
        step('a call attempt fails fast with a JSON message (never hangs, never a phantom room)', False, str(e)[:200])


def run():
    drill_redis_down()
    drill_mongo_stepdown()
    drill_slow_api()
    drill_payment_gateway_500()
    drill_sms_down()
    drill_livekit_down()


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
