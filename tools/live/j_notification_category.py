"""Journey (scenario PT-28, notification preferences, category toggle): the patient turns the chat category off and on
(PATCH /users/me/notification-settings {categories: {chat}}) and each change reads back on the same settings.
  - chat off is stored; the other categories are unchanged
  - chat on is stored
  Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary


def cats(r):
    b = r.body if isinstance(r.body, dict) else {}
    return b.get('categories') or {}


def run():
    import j_accounts
    pat = Client(j_accounts.app_signup(label='notif-category')['token'], 'patient')
    before = cats(pat.get('/users/me/notification-settings'))

    journey('notification category: chat off and on (PT-28)')
    r = pat.req('PATCH', '/users/me/notification-settings', {'categories': {'chat': False}}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('the patient turns the chat category off (PATCH)', r.ok, r)
    after = cats(pat.get('/users/me/notification-settings'))
    step('chat reads back off', after.get('chat') is False, after)
    step('the other categories are unchanged', all(after.get(k) == v for k, v in before.items() if k != 'chat'), (before, after))

    r = pat.req('PATCH', '/users/me/notification-settings', {'categories': {'chat': True}}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('the patient turns the chat category back on (PATCH)', r.ok, r)
    step('chat reads back on', cats(pat.get('/users/me/notification-settings')).get('chat') is True, '')
    summary()


if __name__ == '__main__':
    run()
