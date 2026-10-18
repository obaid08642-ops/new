"""Journey (16.2): wrong passwords are slowed, then locked; a known and an unknown account get the same answer; the
reset flow does not tell who is registered. Its own caller address (RFC 5737 range, new each run), so the lock it
provokes is not shared with the journeys that sign in from 127.0.0.1."""
import random

import os
import time

from lib import Client, journey, step, mail_code, phone
import j_accounts

# The lock is per identifier and caller; the route throttle (10 a minute per address) is not what is under test,
# so the known and the unknown account each sign in from their own address and stay under ten calls there.
CALLER = {'X-Forwarded-For': f'203.0.113.{random.randint(1, 254)}'}
GHOST_CALLER = {'X-Forwarded-For': f'198.51.100.{random.randint(1, 254)}'}
anon = Client()


def login(identifier, password, caller=CALLER):
    return anon.post('/auth/login', headers=caller, b={'identifier': identifier, 'password': password})


def run(acct):
    # A 429 here is the thing under test: do not let the client wait it out and retry.
    os.environ['NABD_LIVE_WAIT_429'] = '0'
    ghost = f'ghost-{random.randint(10**8, 10**9)}@nabd.test'

    journey('passwords: a known and an unknown account get the same answer')
    known = login(acct['email'], 'definitely-wrong-1')
    unknown = login(ghost, 'definitely-wrong-1', GHOST_CALLER)
    step('a wrong password and an unknown e-mail are both 401 "Invalid credentials"',
         known.status == 401 and unknown.status == 401 and known.get('message') == unknown.get('message'), (known.status, known.body, unknown.status, unknown.body))

    journey('passwords: wrong passwords are slowed, then locked')
    statuses = [known.status] + [login(acct['email'], f'definitely-wrong-{i}').status for i in range(2, 9)]
    step('the first four wrong passwords are plain 401s', statuses[:4] == [401] * 4, statuses)
    step('from the fifth on the sign-in is locked (429)', all(s == 429 for s in statuses[5:]), statuses)
    locked = login(acct['email'], acct['password'])
    step('while locked even the right password is refused (login_locked, with a wait time)',
         locked.status == 429 and 'login_locked' in str(locked.body) and (locked.get('retry_after_seconds') or 0) > 0, locked)

    journey('passwords: an unknown account is locked the same way')
    ghost_seen = [login(ghost, f'definitely-wrong-{i}', GHOST_CALLER).status for i in range(2, 9)]
    step('an unknown e-mail is locked at the same point (four 401s, then 429s)', ghost_seen[:4] == [401] * 4 and all(s == 429 for s in ghost_seen[5:]), ghost_seen)
    step('and answers with the same lock message', 'login_locked' in str(login(ghost, 'x-wrong-passphrase', GHOST_CALLER).body))

    journey('passwords: the lock is per caller; the owner on another network signs in')
    other = Client().post('/auth/login', headers={'X-Forwarded-For': f'203.0.114.{random.randint(1, 254)}'}, b={'identifier': acct['email'], 'password': acct['password']})
    step('the right password from another address signs in', other.ok and (other.get('token') or other.get('user')), other)

    journey('passwords: forgot-password says the same for a real and an unknown identifier')
    a = anon.post('/auth/password/forgot', headers={'X-Forwarded-For': f'203.0.115.{random.randint(1, 254)}'}, b={'identifier': acct['email']})
    b = anon.post('/auth/password/forgot', headers={'X-Forwarded-For': f'203.0.115.{random.randint(1, 254)}'}, b={'identifier': ghost})
    step('both answer {requested: true} with the same status', a.status == b.status and a.get('requested') is True and b.get('requested') is True, (a.status, a.body, b.status, b.body))

    journey('passwords: a short or breached new password is refused (after the e-mail is proven)')
    for password, code in (('Short1!', 'password_too_short'), ('letmein123', 'password_compromised')):
        email = f'weak-{random.randint(10**8, 10**9)}@nabd.test'
        t0 = time.time()
        sent = anon.post('/auth/send-otp', {'email': email, 'purpose': 'register'})
        otp = mail_code(email, t0)
        verified = anon.post('/auth/verify-otp', {'email': email, 'code': otp})
        step(f'"{password}": the e-mail is proven first (send-otp, mail, verify-otp)', sent.ok and bool(otp) and verified.ok, (sent.status, bool(otp), verified.status, verified.body))
        r = anon.post('/auth/register', {'full_name': 'اختبار', 'phone': phone(), 'email': email, 'password': password})
        step(f'registering with "{password}" is refused ({code})', r.status == 400 and code in str(r.body), r)


if __name__ == '__main__':
    from lib import summary
    run(j_accounts.app_signup(label='lockout'))
    summary()
