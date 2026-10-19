"""Journey (backend): the audit trail covers the events the plan lists (23.2) — in order, with the origin of each.

  1. A patient signs up, fails a sign-in, signs in, asks for a code, changes the password and signs out everywhere. The
     owner reads the user's timeline (GET /security/audit/timeline): the events are there in that order, each with the
     address, device and request id of the call, and the wrong password is never stored (only a hash of the identifier).
  2. `check_chain` is also called from the pharmacy and lab journeys: one pharmacy order and one booking produce the
     ordered chain (requested -> offers -> selected -> paid -> delivered / requested -> confirmed ...).
  3. The tamper-evidence check (GET /security/audit/verify) is green after all of it.
  Stack: backend :8002. TEST database only.
"""
import os
import time
import uuid

from lib import Client, journey, step, summary
import j_accounts
import j_admin

DEVICE = 'live-audit-' + uuid.uuid4().hex
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) live-audit'


def owner_client():
    _, owner = j_admin.login(os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test'), os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass'))
    return owner


def timeline(owner, wait_for=None, **query):
    """The events are written by the event bus a moment after the request: poll until `wait_for(actions)` holds."""
    qs = '&'.join(f'{k}={v}' for k, v in query.items())
    events, deadline = [], time.time() + 15
    while True:
        r = owner.get(f'/security/audit/timeline?{qs}')
        events = (r.get('events') or []) if r.ok else []
        if (wait_for is None or wait_for([e.get('action') for e in events])) or time.time() > deadline:
            return r, events
        time.sleep(0.7)


def in_order(actions, expected):
    """`expected` appears in `actions` as an ordered subsequence."""
    it = iter(actions)
    return all(any(a == e for a in it) for e in expected)


def check_chain(owner, label, expected, **query):
    """Used by the pharmacy and lab journeys: the subject's timeline holds `expected` in order."""
    r, events = timeline(owner, wait_for=lambda acts: in_order(acts, expected), **query)
    actions = [e.get('action') for e in events]
    step(f'{label}: the audit timeline holds the chain in order', r.ok and in_order(actions, expected), f'want {expected} got {actions}')
    step(f'{label}: every event has its time order (sequence) and a hash', all(e.get('hash') and e.get('sequence') for e in events) and
         [e['sequence'] for e in events] == sorted(e['sequence'] for e in events), actions)
    return events


def run():
    owner = owner_client()
    anon = Client()

    journey('audit events: a patient\'s account events')
    p = j_accounts.app_signup(label='audit')
    me = Client(p['token'], 'patient').get('/auth/me')
    uid = me.get('id') or (me.get('user') or {}).get('id') or p['user'].get('id')
    step('the patient has an id', bool(uid), me)
    h = {'x-device-id': DEVICE, 'user-agent': UA}
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': 'definitely-wrong-' + uuid.uuid4().hex[:6]}, headers=h)
    step('a wrong password is refused (401)', r.status == 401, r)
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': p['password']}, headers=h)
    tok = r.get('token')
    tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    step('the right password signs in', r.ok and tok, r)
    pat = Client(tok, 'patient')
    r = anon.post('/auth/send-otp', {'email': p['email'], 'purpose': 'login'}, headers=h)
    step('a login code is requested', r.ok, r)
    new_pw = 'Ch4nged!Pass' + uuid.uuid4().hex[:4]
    r = pat.post('/users/me/change-password', {'current_password': p['password'], 'new_password': new_pw}, headers=h)
    step('the password is changed', r.ok, r)
    nt = r.get('access_token') or tok
    r = Client(nt, 'patient').post('/auth/logout-all', None, headers=h)
    step('sign out of all devices', r.ok, r)

    expected = ['account_registered', 'login_failed', 'login_success', 'otp_requested', 'password_changed', 'session_ended']
    r, events = timeline(owner, wait_for=lambda acts: in_order(acts, expected), user_id=uid)
    actions = [e.get('action') for e in events]
    step('the owner reads the timeline of the user', r.ok, r)
    step('sign-up, failed and successful sign-in, code, password change and sign-out are there, in order', in_order(actions, expected), actions)
    mine = [e for e in events if e.get('action') in ('login_failed', 'login_success', 'password_changed', 'session_ended')]
    step('each carries the address, user agent, device and request id of the call',
         mine and all(e.get('ip') and e.get('user_agent') and e.get('correlation_id') and e.get('device_id') for e in mine),
         [{k: e.get(k) for k in ('action', 'ip', 'device_id', 'correlation_id')} for e in mine])
    failed = next((e for e in events if e.get('action') == 'login_failed'), {})
    step('the failed sign-in records the reason and never the identifier', (failed.get('details') or {}).get('reason') == 'wrong_password'
         and p['phone'] not in str(failed) and p['password'] not in str(events), failed)

    journey('audit events: the chain is intact')
    r = owner.get('/security/audit/verify')
    step('GET /security/audit/verify is green after all of it', r.ok and r.get('ok') is True, r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
