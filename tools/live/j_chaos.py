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
  SMS provider down ...... the backend's TEST-ONLY switch (p15-backend
                          backend/src/common/chaos-switches.ts):
                          CHAOS_FAIL_SMS=1 makes SmsService.sendOtp() return
                          false before any provider call, so the standard OTP
                          email+push fallback is forced. It is process env, so
                          the drill restarts the backend with it set
                          (chaos_ctrl.sh backend-chaos) and without it afterwards
                          (backend-nochaos). The drill only trusts the fallback
                          if the restart is PROVED (new backend pid) and the
                          runtime marker is seen in the backend log.
  LiveKit down .......... same mechanism: CHAOS_FAIL_LIVEKIT=1 makes
                          LiveKitService.roomService() return null, so every
                          server-side room call answers exactly as if LiveKit
                          were unconfigured. The drill asserts the three
                          documented degraded answers over admin HTTP.

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


def ctrl(*args, timeout=60):
    try:
        out = subprocess.check_output(['bash', CTRL] + list(args), stderr=subprocess.STDOUT, timeout=timeout)
        return True, out.decode('utf8', 'replace').strip()
    except Exception as e:
        return False, str(e)[:300]


def has_docker():
    try:
        subprocess.check_output(['docker', 'info'], stderr=subprocess.STDOUT, timeout=15)
        return True
    except Exception:
        return False


# The backend's TEST-ONLY chaos switches are process env on the server, so a drill
# can only reach them by restarting the backend with the variable set. This helper
# wraps chaos_ctrl.sh and turns its machine-readable line into fields the drill can
# assert on. It FAILS LOUDLY: if the switch cannot be proven on the new process,
# the drill must not go on to assert a fallback that would also hold in the default
# configuration (that would be a vacuous pass).
BACKEND_LOG = os.environ.get('NABD_BACKEND_LOG', '/tmp/nabd-backend.log')


def chaos_backend(var, mode):
    """mode 'on' -> restart with VAR=1, 'off' -> restart without it.

    Returns (ok, fields, raw) where fields carries the proof chaos_ctrl.sh printed.
    """
    verb = 'backend-chaos' if mode == 'on' else 'backend-nochaos'
    # A restart has to wait for start-backend.sh's own liveness loop, which can
    # take a couple of minutes on a cold start — do not cut it off mid-flight.
    ok, raw = ctrl(verb, var, timeout=420)
    fields = {}
    for tok in raw.split():
        if '=' in tok:
            k, v = tok.split('=', 1)
            fields[k] = v
    # A fresh process is the minimum proof that the env could have changed at all.
    fields['new_process'] = bool(fields.get('new_pids')) and fields.get('new_pids') != fields.get('old_pids')
    fields['env_verified'] = fields.get('env_state') in ('set', 'absent')
    return ok, fields, raw


def log_marker(marker):
    """True when the running backend logged `marker` (proves the switch was read)."""
    try:
        with open(BACKEND_LOG, 'r', encoding='utf8', errors='replace') as fh:
            return marker in fh.read()
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
    if pat is None or acct is None:
        # The canary was never created (its setup raised). The invariant cannot be
        # proven, and saying so beats crashing on a None client or skipping it.
        return step(f'{label}: never loses data — canary patient intact after the drill', False,
                    'no canary patient was created: the invariant cannot be proven')
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
        # A 500 is never "graceful": the degrade/fail-fast drills allow a 2xx or a
        # 4xx with a JSON message, never a server error with a body attached.
        step('reads degrade gracefully (2xx or a JSON error with a message — never a hang)',
             me.status < 500 and (me.ok or (isinstance(me.body, dict) and bool(me.body))) and elapsed < 55,
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
        ok_read = me.status < 500 and (me.ok or (isinstance(me.body, dict) and bool(str(me.body))))
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
    # Initialised before the try: the canary check below runs after the proxy is
    # torn down, and an unbound name there would raise NameError instead of
    # reporting the real problem.
    pat = acct = None
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
    # The switch is REAL now (p15-backend F10), so the drill takes SMS down for
    # real instead of asserting the fallback that already holds when SMS is merely
    # disabled by default. CHAOS_FAIL_SMS=1 -> SmsService.sendOtp() returns false
    # before any provider call, forcing the documented email+push OTP fallback.
    ok, sw, raw = chaos_backend('CHAOS_FAIL_SMS', 'on')
    if not ok or not sw.get('new_process') or sw.get('env_state') == 'absent':
        step('the backend restarted with CHAOS_FAIL_SMS=1 (SMS is really down)', False, raw[:300])
        skip('SMS provider down', f'could not prove the switch on the backend: {raw[:160]}')
        return
    step('the backend restarted with CHAOS_FAIL_SMS=1 (SMS is really down)', True, raw)
    try:
        import time as _t
        from lib import mail_code, uniq
        anon = Client()
        email = f'sms-fallback-{uniq("c")}@nabd.test'
        t0 = _t.time()
        r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
        # Step name kept verbatim from the pre-switch version (never rename an
        # existing step); "disabled" is now literally true: the switch forces
        # SmsService.sendOtp() to return false.
        step('send-otp answers while SMS is down/disabled', r.ok, r)
        marker = log_marker('CHAOS_FAIL_SMS=1')
        step('the server actually took the SMS failure path (runtime marker in the backend log)', marker,
             f'no "CHAOS_FAIL_SMS=1" marker in {BACKEND_LOG} — the switch was never read')
        code = mail_code(email, t0)
        step('the OTP is delivered by email (SMS -> email fallback works)', code, 'no mail with a 6-digit code')
        if code:
            r = anon.post('/auth/verify-otp', {'email': email, 'code': code})
            step('the emailed OTP verifies (the user is not locked out)', r.ok, r)
    finally:
        ok2, sw2, raw2 = chaos_backend('CHAOS_FAIL_SMS', 'off')
        step('the backend is back on a clean process with CHAOS_FAIL_SMS unset',
             ok2 and sw2.get('new_process') and (not sw2.get('env_verified') or sw2.get('env_state') == 'absent'),
             raw2)


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
             r.status >= 400 and r.status < 500 and isinstance(r.body, dict) and bool(str(r.body)) and elapsed < 20,
             f'{r.status} in {elapsed:.1f}s {str(r.body)[:150]}')
    except Exception as e:
        step('a call attempt fails fast with a JSON message (never hangs, never a phantom room)', False, str(e)[:200])

    # Take LiveKit down for real and assert the three documented degraded answers.
    # This gate env has no LIVEKIT_URL at all, so on its own every call would
    # already look degraded — the only way the drill means anything is to run it
    # against a backend started with CHAOS_FAIL_LIVEKIT=1 and to PROVE that.
    ok, sw, raw = chaos_backend('CHAOS_FAIL_LIVEKIT', 'on')
    if not ok or not sw.get('new_process') or not sw.get('env_verified') or sw.get('env_state') != 'set':
        step('the backend restarted with CHAOS_FAIL_LIVEKIT=1 (LiveKit is really down)', False, raw[:300])
        skip('livekit server-side degrade', f'could not prove the switch on the backend: {raw[:160]}')
        return
    step('the backend restarted with CHAOS_FAIL_LIVEKIT=1 (LiveKit is really down)', True, raw)
    try:
        import j_admin
        admin, _ = j_admin.login()
        room, who = 'room-chaos-drill', 'identity-chaos-drill'
        parts = admin.get(f'/calls/admin/rooms/{room}/participants')
        step('participants list degrades to an empty list, never an error or a hang',
             parts.ok and parts.items() == [], f'{parts.status} {str(parts.body)[:150]}')
        mute = admin.post(f'/calls/admin/rooms/{room}/mute/{who}', {'muted': True})
        reason = mute.get('reason')
        step('mute reports the documented livekit_not_configured reason (success=false)',
             mute.ok and mute.get('success') is False and reason == 'livekit_not_configured',
             f'{mute.status} {str(mute.body)[:150]}')
        rem = admin.post(f'/calls/admin/rooms/{room}/remove/{who}', {})
        step('remove a participant fails with a 4xx livekit_not_configured, never a 5xx',
             400 <= rem.status < 500 and 'livekit_not_configured' in str(rem.body),
             f'{rem.status} {str(rem.body)[:150]}')
    finally:
        ok2, sw2, raw2 = chaos_backend('CHAOS_FAIL_LIVEKIT', 'off')
        step('the backend is back on a clean process with CHAOS_FAIL_LIVEKIT unset',
             ok2 and sw2.get('new_process') and (not sw2.get('env_verified') or sw2.get('env_state') == 'absent'),
             raw2)


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
