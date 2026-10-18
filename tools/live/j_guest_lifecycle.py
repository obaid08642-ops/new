"""Journey (backend): guest data lifecycle (21.8).

  1. A guest session is issued; the guest asks to delete their data (DELETE /users/me) with no password — the guest
     session is the proof — and it is erased; the guest's token stops working at once.
  2. A registered patient cannot use that shortcut: DELETE /users/me without the password is refused (400 password_required)
     and the account keeps working.
  The 12-month purge, the order/invoice retention and the scheduled job are proved in guest-lifecycle.spec.ts (the window
  is 12 months, so the live gate cannot wait for it).
  Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary
import j_accounts


def run():
    anon = Client()

    journey('guest lifecycle: a guest deletes their own data')
    r = anon.post('/auth/guest', {}, headers={'x-device-id': 'live-guest-' + uuid.uuid4().hex})
    tok = r.get('token')
    tok = tok if isinstance(tok, str) else (tok or {}).get('accessToken')
    step('a guest session is issued', r.ok and tok, r)
    guest = Client(tok, 'guest')
    r = guest.get('/auth/me')
    step('the guest token works', r.ok, r)
    r = guest.req('DELETE', '/users/me', {'reason': 'live gate: guest deletes own data'})
    step('DELETE /users/me with no password erases the guest (guest session is the proof)', r.ok and 'erased_at' in (r.body or {}), r)
    r = guest.get('/auth/me')
    step('the guest token is refused afterwards (401)', r.status == 401, r)

    journey('guest lifecycle: a registered patient still needs the password')
    p = j_accounts.app_signup(label='noshortcut')
    pat = Client(p['token'], 'patient')
    r = pat.req('DELETE', '/users/me', {})
    step('DELETE /users/me without the password is refused (400)', r.status == 400 and 'password_required' in str(r.body), r)
    r = pat.get('/auth/me')
    step('the account is untouched', r.ok, r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
