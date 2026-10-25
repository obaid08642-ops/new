"""Journey: account deletion (A-15) on a throwaway account, over the API.
Export works before erasure; erasure needs the password; login is refused afterwards.
Payload copied from backend/src/modules/users/users.controller.ts (DELETE /users/me, body.password)."""
from lib import Client, journey, step
from j_accounts import app_signup


def run():
    journey('account deletion: export, erase with password, login refused (API)')
    pat = app_signup(label='qadel')
    c = Client(pat['token'], 'patient-api')
    r = c.get('/users/me/data-export')
    step('data export before erasure', r.ok, r)
    r = c.req('DELETE', '/users/me', {'password': 'wrong-password-123', 'reason': 'QA test'})
    step('erasure refused with a wrong password', r.status in (400, 401, 403), r)
    r = c.req('DELETE', '/users/me', {'password': pat['password'], 'reason': 'QA test'})
    step('erasure with the right password', r.ok, r)
    r = Client(None, 'anon').post('/auth/login', {'identifier': pat['email'], 'password': pat['password']})
    step('login refused after erasure', r.status in (400, 401, 403, 404), r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
