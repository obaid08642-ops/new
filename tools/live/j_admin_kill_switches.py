"""Journey: admin emergency controls (issues 955 / 995, needs-review admin-system item 10).

The page admin/src/pages/admin/kill-switches.tsx drives, through the admin BFF (/api/admin/<x> -> /api/v1/<x>):
  GET  /kill-switches                                   list of the enforced switches with their state
  POST /kill-switches/:key {value, reason}              turn one off / on (reason required, audited)
  GET  /admin/governance/emergency-maintenance          the real platform state
  PUT  /admin/governance/trigger-emergency-maintenance  {forceMaintenanceState, reason}
All four require modules.manage (super admin), the same permission as the page route in AdminGuard.

Real effects checked (and everything restored at the end, even when a step fails):
  - new_registrations off -> POST /auth/register is refused (503 kill_switch_off) with a verified OTP; on -> the same
    registration succeeds.
  - emergency maintenance on -> /config raises every app's maintenance banner and a patient write is refused
    (503 emergency_maintenance) while reads and the admin panel keep working; off -> banners are back to their previous
    values and the same write works.
  - the flags tab lists only flags a server check reads, and refuses a key nothing reads.
  Stack: backend :8002, admin :3001; the super admin is seeded by seed_admin.js (owner@nabd.test).
"""
import os
import time

from lib import Client, journey, step, mail_code, uniq, phone

OWNER_EMAIL = os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test')
OWNER_PASSWORD = os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass')
SWITCHES = {'chat_enabled', 'online_consultations', 'provider_withdrawals', 'pharmacy_broadcast', 'nursing_broadcast',
            'new_registrations', 'reviews_enabled', 'wearables_enabled'}
APPS = ('patient', 'provider', 'driver', 'pharmacy', 'web')
EMERGENCY = '/admin/admin/governance/emergency-maintenance'
TRIGGER = '/admin/admin/governance/trigger-emergency-maintenance'
CACHE_WAIT = 2.5  # the server caches switch state for 2 s per instance


def switch_map(r):
    rows = r.body if isinstance(r.body, list) else []
    return {x.get('key'): x for x in rows if isinstance(x, dict)}


def app_flags(anon):
    apps = (anon.get('/config').get('app_versions') or {}).get('apps') or {}
    return {a: bool((apps.get(a) or {}).get('maintenance')) for a in APPS}


def verified_signup_body(anon, label):
    """patient-app register.tsx -> otp.tsx: send-otp -> verify-otp; returns the /auth/register body."""
    email = f'{uniq(label)}@nabd.test'
    t0 = time.time()
    r = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
    step(f'{label}: send-otp', r.ok, r)
    code = mail_code(email, t0)
    step(f'{label}: OTP email delivered', code, 'no mail')
    r = anon.post('/auth/verify-otp', {'email': email, 'code': code})
    step(f'{label}: verify-otp', r.ok, r)
    return {'full_name': f'اختبار {label}', 'phone': phone(), 'email': email, 'password': 'Str0ng!Pass' + uniq('')[-4:]}


def run():
    import j_admin
    anon = Client()
    gate_web, _ = j_admin.login()

    journey('emergency controls: page and backend name the same permission (modules.manage)')
    r = gate_web.get('/kill-switches')
    step('role admin (no modules.manage) is refused GET /kill-switches (403)', r.status == 403, r)
    r = gate_web.get(EMERGENCY)
    step('role admin is refused the emergency state (403)', r.status == 403, r)
    r = gate_web.put(TRIGGER, {'forceMaintenanceState': True, 'reason': 'permission probe only'})
    step('role admin cannot trigger emergency maintenance (403)', r.status == 403, r)

    owner, _ = j_admin.login(OWNER_EMAIL, OWNER_PASSWORD)

    journey('kill switches: the page lists every enforced switch, nothing else')
    r = owner.get('/kill-switches')
    before = switch_map(r)
    step('super admin reads GET /kill-switches through the BFF', r.ok and before, r)
    step('exactly the enforced switches are listed (no ambulance, no "cash only")', set(before) == SWITCHES, sorted(before))
    step('each row carries a name, a description and a boolean state',
         all(isinstance(x.get('value'), bool) and x.get('name') and x.get('description') for x in before.values()), r)

    journey('kill switch new_registrations: off refuses a sign-up, on accepts the same one')
    start = (before.get('new_registrations') or {}).get('value', True)
    tok = None
    try:
        r = owner.post('/kill-switches/new_registrations', {'value': False, 'reason': ''})
        step('a switch change without a reason is refused (400)', r.status == 400, r)
        r = owner.post('/kill-switches/new_registrations', {'value': False, 'reason': 'live gate: registrations drill'})
        row = switch_map(r).get('new_registrations') or {}
        step('switch turned off; the server answers with the stored state and reason',
             r.ok and row.get('value') is False and row.get('reason') == 'live gate: registrations drill', r)
        time.sleep(CACHE_WAIT)
        body = verified_signup_body(anon, 'ks-signup')
        r = anon.post('/auth/register', body)
        step('POST /auth/register is refused while off (503 kill_switch_off:new_registrations)',
             r.status == 503 and 'kill_switch_off' in str(r.body) and 'new_registrations' in str(r.body), r)
        r = owner.post('/kill-switches/new_registrations', {'value': True, 'reason': 'live gate: registrations back on'})
        step('switch turned back on', r.ok and (switch_map(r).get('new_registrations') or {}).get('value') is True, r)
        time.sleep(CACHE_WAIT)
        r = anon.post('/auth/register', body)
        tok = r.get('token')
        tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
        step('the same registration succeeds once the switch is on', r.ok and tok, r)
    finally:
        r = owner.post('/kill-switches/new_registrations', {'value': bool(start), 'reason': 'live gate: restore the pre-run state'})
        step('new_registrations restored to its pre-run state', r.ok, r)
    patient = Client(tok, 'patient') if tok else None

    journey('emergency maintenance: the whole platform stops taking writes, then comes back exactly')
    r = owner.get(EMERGENCY)
    step('super admin reads the real emergency state', r.ok and isinstance(r.get('active'), bool), r)
    if r.get('active') is True:
        step('the platform is not already in emergency maintenance (the drill would end a real one)', False, r)
        return
    banners_before = app_flags(anon)
    if patient:
        r = patient.patch('/users/me', {'locale': 'ar'})
        step('baseline: a patient write works', r.ok, r)
    try:
        r = owner.put(TRIGGER, {'forceMaintenanceState': True})
        step('trigger without a reason is refused (400)', r.status == 400, r)
        r = owner.put(TRIGGER, {'forceMaintenanceState': True, 'reason': 'live gate: emergency drill'})
        step('emergency maintenance on; the server answers active=true', r.ok and r.get('active') is True, r)
        time.sleep(CACHE_WAIT)
        r = owner.get(EMERGENCY)
        step('the state reads back active with the reason', r.get('active') is True and r.get('reason') == 'live gate: emergency drill', r)
        step('/config raises every app maintenance banner', all(app_flags(anon).values()), app_flags(anon))
        if patient:
            r = patient.patch('/users/me', {'locale': 'ar'})
            step('a patient write is refused (503 emergency_maintenance)', r.status == 503 and 'emergency_maintenance' in str(r.body), r)
            r = patient.get('/users/me/profile')
            step('patient reads keep working', r.ok, r)
        r = owner.get('/kill-switches')
        step('the admin panel keeps working during maintenance', r.ok, r)
    finally:
        r = owner.put(TRIGGER, {'forceMaintenanceState': False, 'reason': 'live gate: drill over'})
        step('emergency maintenance off; the server answers active=false', r.ok and r.get('active') is False, r)
    time.sleep(CACHE_WAIT)
    step('every app banner is back to its pre-run value', app_flags(anon) == banners_before, f'before={banners_before} after={app_flags(anon)}')
    if patient:
        r = patient.patch('/users/me', {'locale': 'ar'})
        step('the same patient write works again', r.ok, r)

    journey('flags tab: only flags a server check reads')
    r = owner.get('/admin/admin/governance-controls/feature-flags')
    keys = [x.get('key') for x in r.items()]
    step('the flags tab lists the six flags the server reads, each with its effect',
         r.ok and set(keys) == {'ai_symptom_checker', 'recommendations_enabled', 'nudges_enabled', 'live_map_enabled',
                                'analytics_ingestion_enabled', 'search_suggestions_enabled'}
         and all(x.get('effect') for x in r.items()), r)
    r = owner.post('/admin/admin/governance-controls/feature-flags', {'key': 'telehealth', 'enabled': False, 'reason': 'live gate: dead flag probe'})
    step('a flag nothing reads is refused (400 feature_flag_has_no_effect)', r.status == 400 and 'feature_flag_has_no_effect' in str(r.body), r)

    journey('emergency controls: nothing left changed')
    after = switch_map(owner.get('/kill-switches'))
    drift = [k for k in SWITCHES if (before.get(k) or {}).get('value') != (after.get(k) or {}).get('value')]
    step('every kill switch is back to its pre-run state', not drift, drift)
    r = owner.get(EMERGENCY)
    step('emergency maintenance is off', r.get('active') is False, r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
