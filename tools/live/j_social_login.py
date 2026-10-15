"""Journey: social sign-in cannot be forged (issue 412, patient-app /login, POST /auth/social-login).
  An Apple identity token is accepted only with Apple's signature, issuer and audience; X and Snapchat tokens cannot be
  verified and are refused. A forged token never gets a session, for a patient's email or a staff one.
"""
import base64
import json
import uuid

from lib import Client, journey, step

anon = Client()


def b64(o):
    return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')


def forged_apple(email, alg='none', kid=None):
    head = {'alg': alg, **({'kid': kid} if kid else {})}
    claims = {'iss': 'https://appleid.apple.com', 'aud': 'plus.nabd.app', 'sub': uuid.uuid4().hex, 'email': email,
              'email_verified': 'true', 'exp': 4102444800}
    return f'{b64(head)}.{b64(claims)}.' + ('' if alg == 'none' else base64.urlsafe_b64encode(b'x' * 256).decode().rstrip('='))


def no_session(r):
    return not r.ok and not (isinstance(r.body, dict) and (r.body.get('token') or r.body.get('access_token')))


def run():
    import j_accounts
    journey('social sign-in: forged provider tokens get no session (issue 412)')
    acct = j_accounts.app_signup(label='social-target')
    for name, token in (('unsigned Apple token (alg none)', forged_apple(acct['email'])),
                        ('Apple token signed with an unknown key', forged_apple(acct['email'], 'RS256', 'not-an-apple-key'))):
        r = anon.post('/auth/social-login', {'provider': 'apple', 'token': token})
        step(f"{name} for an existing patient's email gets no session", no_session(r), r)
    r = anon.post('/auth/social-login', {'provider': 'apple', 'token': forged_apple('admin@nabd.test')})
    step('forged Apple token for a staff email gets no session', no_session(r), r)
    for provider in ('x', 'snapchat'):
        r = anon.post('/auth/social-login', {'provider': provider, 'token': uuid.uuid4().hex})
        step(f'{provider}: an unverifiable access token gets no session', no_session(r), r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
