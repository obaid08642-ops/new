"""Journey (backend): the audit trail lives in ONE collection, and the PDPL export reads it.

A patient signs up and signs in. Then, on the raw database (health_db.find_raw), the chained rows are in `auditlogs`
(each with a sequence and a hash) and there is no live `audit_logs` collection taking writes. The patient's own data
export (GET /users/me/data-export) lists those events, and the owner's chain check (GET /security/audit/verify) is green.
Stack: backend :8002. TEST database only.
"""
import time
import uuid

from lib import Client, journey, step, summary
import j_accounts
import j_audit_events
from health_db import find_raw


def find_key(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            r = find_key(v, key)
            if r is not None:
                return r
    return None


def run():
    owner = j_audit_events.owner_client()
    journey('audit collection: the events are in the one collection')
    p = j_accounts.app_signup(label='auditcol')
    me = Client(p['token'], 'patient').get('/auth/me')
    uid = me.get('id') or (me.get('user') or {}).get('id') or p['user'].get('id')
    step('the patient has an id', bool(uid), me)
    r = Client().post('/auth/login', {'phone': p['phone'], 'password': p['password']}, headers={'x-device-id': 'live-auditcol-' + uuid.uuid4().hex})
    step('the patient signs in', r.ok, r)

    row = None
    for _ in range(20):  # the events reach the chain a moment after the request
        row = find_raw('auditlogs', {'user_id': uid, 'action': 'login_success'})
        if row:
            break
        time.sleep(0.7)
    step('the sign-in is a row of `auditlogs` with a sequence and a hash', bool(row) and bool(row.get('sequence')) and bool(row.get('hash')), row)
    step('nothing about this person was written to a separate `audit_logs`', find_raw('audit_logs', {'user_id': uid}) is None, find_raw('audit_logs', {'user_id': uid}))

    journey('audit collection: the data export carries the chain events')
    pat = Client(p['token'], 'patient')
    ev = None
    for _ in range(10):
        r = pat.get('/users/me/data-export')
        ev = find_key(r.body, 'audit_events') if r.ok else None
        if isinstance(ev, list) and any(e.get('action') == 'login_success' for e in ev):
            break
        time.sleep(0.7)
    actions = [e.get('action') for e in (ev or [])]
    step('audit_events lists the registration and the sign-in', 'account_registered' in actions and 'login_success' in actions, actions)
    step('the export has no hash and no chain internals', '"hash"' not in str(ev) and '"prev_hash"' not in str(ev) and '"sequence"' not in str(ev), str(ev)[:200])

    journey('audit collection: the chain is intact')
    r = owner.get('/security/audit/verify')
    step('GET /security/audit/verify is green', r.ok and r.get('ok') is True, r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
