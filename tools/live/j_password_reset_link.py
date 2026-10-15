"""Journey: the password-reset e-mail and the notification routes (issues 435, 416).
  - patient-web /forgot-password -> POST /auth/password/forgot: the e-mail carries a link to /{locale}/password-reset?token=...
    (not a bare token), the link still works after a minute (it lasted 60 s before), the reset page opens with the token
    filled in, the new password signs in and the link works only once.
  - A paid consultation's "payment received" notification opens the booking (/tracking/consultation/<id>), not /wallet/hub,
    which no app has.
  Stack: backend :8002, patient-web :3100.
"""
import os
import re
import time
import urllib.request

from lib import Client, journey, mail_to, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_accounts
    acct = j_accounts.app_signup(label='reset-link')
    anon = Client(None, 'anon')

    journey('issue 435: the reset e-mail carries a link that lasts')
    t0 = time.time()
    r = anon.post('/auth/password/forgot', {'identifier': acct['email']})
    step('the reset is requested', r.ok and r.get('requested') is True, r)
    mails = mail_to(acct['email'], t0, timeout=20)
    text = ' '.join(f"{m.get('subject', '')} {m.get('body', '')}" for m in mails)
    link = re.search(r'https?://[^\s"<>]+/password-reset\?token=([A-Za-z0-9_%-]+)', text)
    step('the e-mail has a link to the reset page with the token', link, text[:400])
    if not link:
        return
    token = urllib.request.unquote(link.group(1))
    step('the link is in the account\'s language (/ar/)', '/ar/password-reset' in link.group(0), link.group(0))
    try:
        html = urllib.request.urlopen(f'{WEB}/ar/password-reset?token={link.group(1)}', timeout=60).read().decode('utf8')
        step('the reset page opens with the token filled in', f'value="{token}"' in html, html[:200])
    except OSError as e:
        step('the reset page opens with the token filled in', False, f'website not reachable: {e}')
    time.sleep(65)
    new_pw = 'Reset-' + acct['password'][-6:] + 'q9!'
    r = anon.post('/auth/password/reset', {'reset_token': token, 'new_password': new_pw})
    step('the link still works after a minute', r.ok and r.get('reset') is True, r)
    r = anon.post('/auth/login', {'identifier': acct['email'], 'password': new_pw})
    step('the new password signs in', r.ok, r)
    r = anon.post('/auth/password/reset', {'reset_token': token, 'new_password': new_pw + 'x'})
    step('the link works only once', r.status == 401, r)

    journey('issue 416: "payment received" opens what was paid for')
    import j_admin, j_onboarding, j_consultation
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin)
    pat = Client(j_accounts.app_signup(label='paid-notif')['token'], 'patient')
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    rows, end = [], time.time() + 15
    while time.time() < end:
        r = pat.get('/notifications')
        body = r.body if isinstance(r.body, (list, dict)) else {}
        rows = body if isinstance(body, list) else (body.get('notifications') or body.get('items') or [])
        if any((x.get('title_key') or '').startswith('notif.payment_received') for x in rows):
            break
        time.sleep(1)
    paid = [x for x in rows if (x.get('title_key') or '').startswith('notif.payment_received')]
    routes = [((x.get('action') or {}).get('route')) for x in paid]
    step('the payment notification opens the booking, not a wallet', paid and all(rt == f'/tracking/consultation/{aid}' for rt in routes), routes or str(rows)[:300])


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
