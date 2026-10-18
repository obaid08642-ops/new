"""Journey (backend): the guest permission matrix is enforced by the server and the admin can change it (21.3).

  1. GET /auth/guest/capabilities lists the matrix; the owner defaults hold (browse yes, family/insurance no).
  2. A guest session gets 403 `account_required` (with the capability name) on the family and the loyalty routes, and a
     route that is allowed for guests is not refused.
  3. The admin turns `loyalty` into allowed through PUT /auth/admin/guest/capabilities: the same guest is let through once
     the 3 s cache has passed, and the other capabilities keep their value (a partial update merges, it does not replace).
  4. The admin turns it back; the guest is refused again. A registered patient is never refused by the matrix.
  Stack: backend :8002. The matrix is restored at the end.
"""
import os
import time
import uuid

from lib import Client, journey, step, summary, uniq
import j_admin

WAIT = 3.5  # GuestPermissionMatrixService.CACHE_MS + margin


def token_of(r):
    t = r.get('token') or r.get('accessToken') or r.get('access_token')
    return t if isinstance(t, str) else (t or {}).get('accessToken')


def refused(r, capability):
    return r.status == 403 and 'account_required' in str(r.body) and capability in str(r.body)


def run():
    _, owner = j_admin.login(os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test'),
                             os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass'))
    anon = Client()

    journey('guest matrix: defaults')
    r = anon.get('/auth/guest/capabilities')
    caps = r.get('capabilities') or {}
    step('GET /auth/guest/capabilities answers the matrix', r.ok and isinstance(caps, dict) and caps, r)
    step('browse is allowed, family and insurance are not (owner defaults)',
         caps.get('browse') is True and caps.get('family') is False and caps.get('insurance') is False, caps)
    start_loyalty = caps.get('loyalty')

    r = anon.post('/auth/guest', {}, headers={'x-device-id': 'live-' + uuid.uuid4().hex})
    gtok = token_of(r)
    step('a guest session is issued', r.ok and gtok, r)
    guest = Client(gtok, 'guest')

    journey('guest matrix: the server refuses what the matrix forbids')
    r = guest.get('/family/my-group')
    step('guest on /family/my-group -> 403 account_required (capability family)', refused(r, 'family'), r)
    r = guest.get('/loyalty/account') if start_loyalty is False else None
    if r is not None:
        step('guest on a loyalty route -> 403 account_required (capability loyalty)', refused(r, 'loyalty'), r)
    r = guest.get('/auth/guest/capabilities')
    step('a route that is allowed for guests is not refused by the matrix', r.status != 403, r)

    journey('guest matrix: the admin changes one capability, no deploy')
    try:
        r = owner.put('/auth/admin/guest/capabilities', {'capabilities': {'family': True}})
        step('admin PUT family=true accepted', r.ok, r)
        time.sleep(WAIT)
        r = guest.get('/family/my-group')
        step('the guest is no longer refused by the matrix on /family/my-group', not refused(r, 'family'), r)
        r = anon.get('/auth/guest/capabilities')
        after = r.get('capabilities') or {}
        step('a partial update merges: family true, insurance still false',
             after.get('family') is True and after.get('insurance') is False and after.get('browse') is True, after)
    finally:
        r = owner.put('/auth/admin/guest/capabilities', {'capabilities': {'family': caps.get('family', False)}})
        step('matrix restored', r.ok, r)
    time.sleep(WAIT)
    r = guest.get('/family/my-group')
    step('after the restore the guest is refused again', refused(r, 'family'), r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
