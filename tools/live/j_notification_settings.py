"""Journey (scenario PT-28, notification preferences): the patient turns a notification category off and on, the choice is
kept across a fresh sign-in, and a value the server does not accept is refused.
  - GET /users/me/notification-settings: the defaults are readable
  - PATCH /users/me/notification-settings {offers: false}: the change is stored (read back)
  - a new sign-in on another device sees the same stored choice
  - PATCH with a non-boolean value is refused (400)
  - PATCH back to the default is stored
Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary


def offers(body):
    """The category toggle lives under `preferences` in the settings answer."""
    b = body if isinstance(body, dict) else {}
    return (b.get('preferences') or {}).get('offers')


def run():
    import j_accounts
    acct = j_accounts.app_signup(label='notif-settings')
    pat = Client(acct['token'], 'patient')

    journey('notification preferences: the patient changes a category (PT-28)')
    r = pat.get('/users/me/notification-settings')
    step('the current settings are readable (GET /users/me/notification-settings)', r.ok and isinstance(r.body, dict), r)
    r = pat.req('PATCH', '/users/me/notification-settings', {'offers': False}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('the patient turns offers off (PATCH)', r.ok, r)
    r = pat.get('/users/me/notification-settings')
    step('the offers choice is stored (read back as off)', r.ok and offers(r.body) is False, r.body)

    journey('notification preferences: the choice holds on a new sign-in (PT-28)')
    login = Client(None, 'anon').post('/auth/login', {'identifier': acct['email'], 'password': acct['password']})
    tok = (login.body or {}).get('token') if isinstance(login.body, dict) else None
    access = tok.get('accessToken') if isinstance(tok, dict) else (login.body or {}).get('accessToken')
    step('a second sign-in works', login.ok and bool(access), login)
    again = Client(access, 'patient').get('/users/me/notification-settings')
    step('the second device sees offers off', again.ok and offers(again.body) is False, again.body)

    journey('notification preferences: a bad value is refused (PT-28)')
    r = pat.req('PATCH', '/users/me/notification-settings', {'offers': 'maybe'}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('a non-boolean value is refused with 400', r.status == 400, r)
    r = pat.get('/users/me/notification-settings')
    step('the stored choice is unchanged after the refusal', offers(r.body) is False, r.body)

    journey('notification preferences: the patient turns it back on (PT-28)')
    r = pat.req('PATCH', '/users/me/notification-settings', {'offers': True}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('the patient turns offers back on', r.ok, r)
    r = pat.get('/users/me/notification-settings')
    step('offers reads back as on', offers(r.body) is True, r.body)
    summary()


if __name__ == '__main__':
    run()
