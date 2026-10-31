"""Journey (PDPL, scenarios PT-36 account deletion and PT-37 data export): a patient downloads a copy of their data, then
erases the account, and the account is then unusable.
  1. GET /users/me/data-export answers with the patient's own record (their user id) and no password hash.
  2. DELETE /users/me with the wrong password is refused (erasure needs the password).
  3. DELETE /users/me with the right password succeeds.
  4. The old access token is refused (401) and signing in again with the same e-mail and password is refused.
  Stack: backend :8002. TEST database only; the account is created for this run.
"""
from lib import Client, journey, step, summary


def run():
    import j_accounts
    acct = j_accounts.app_signup(label='pdpl-export-erase')
    pat = Client(acct['token'], 'patient')
    uid = (acct.get('user') or {}).get('id') or pat.get('/auth/me').get('id')
    step('the patient has a user id', bool(uid), uid)

    journey('PDPL export: the patient downloads a copy of their data (PT-37)')
    r = pat.get('/users/me/data-export')
    body = r.body if isinstance(r.body, dict) else {}
    step('the export answers 200 with a JSON object', r.ok and isinstance(r.body, dict), r)
    step('the export holds the patient\'s own user id', uid is not None and uid in str(body), r)
    step('the export holds no password hash', '$2a$' not in str(body) and '$2b$' not in str(body) and 'password_hash' not in str(body), 'checked for bcrypt markers and the field name')

    journey('PDPL erasure: erasure needs the password (PT-36)')
    r = pat.req('DELETE', '/users/me', {'password': 'Wrong-Pass-123!', 'reason': 'qa'})
    step('a wrong password refuses the erasure (not 2xx)', not r.ok, r)
    r = pat.req('DELETE', '/users/me', {'password': acct['password'], 'reason': 'qa-journey'})
    step('the right password erases the account', r.ok, r)

    journey('PDPL erasure: the account is unusable afterwards (PT-36)')
    r = pat.get('/auth/me')
    step('the old access token is refused (401)', r.status == 401, r)
    r = Client(None, 'anon').post('/auth/login', {'identifier': acct['email'], 'password': acct['password']})
    step('signing in again with the same e-mail and password is refused', not r.ok, r)
    summary()


if __name__ == '__main__':
    run()
