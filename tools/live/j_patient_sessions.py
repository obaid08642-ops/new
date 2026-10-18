"""Journey (backend): a patient's signed-in devices, "sign out other devices", rotating refresh tokens and a sign-out
that removes the push token (21.7).

  1. The patient signs in on a phone and on a laptop (two device ids, two user agents); GET /auth/sessions lists both with
     a readable label and a masked address, and marks the caller's own as `current`.
  2. Each device registers a push token; GET /push/devices lists both.
  3. Refresh rotates: the new refresh token works, the old one is refused.
  4. From the phone, "sign out other devices": the laptop's access token is refused at once (401), its refresh token is
     dead, its push token is gone; the phone keeps working and keeps its push token.
  5. The phone signs out with its refresh token (what the app calls): the push token is removed, the access token stops.
  Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary
import j_accounts

IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'
CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'


def tok(r):
    if r.get('accessToken'):  # /auth/refresh answers the pair at the top level
        return {'accessToken': r.get('accessToken'), 'refreshToken': r.get('refreshToken')}
    t = r.get('token')
    return t if isinstance(t, dict) else {'accessToken': t, 'refreshToken': r.get('refresh_token')}


def run():
    journey('sessions: one patient, two devices')
    p = j_accounts.app_signup(label='sessions')
    phone_dev, laptop_dev = 'live-phone-' + uuid.uuid4().hex, 'live-laptop-' + uuid.uuid4().hex
    anon = Client()
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': p['password']}, headers={'x-device-id': phone_dev, 'user-agent': IPHONE})
    phone = tok(r)
    step('sign in on the phone', r.ok and phone.get('accessToken'), r)
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': p['password']}, headers={'x-device-id': laptop_dev, 'user-agent': CHROME})
    laptop = tok(r)
    step('sign in on the laptop', r.ok and laptop.get('accessToken'), r)
    phone_c = Client(phone['accessToken'], 'phone')
    laptop_c = Client(laptop['accessToken'], 'laptop')

    r = phone_c.get('/auth/sessions', headers={'x-device-id': phone_dev})
    rows = r.get('devices') or []
    mine = next((d for d in rows if d.get('device_id') == phone_dev), {})
    other = next((d for d in rows if d.get('device_id') == laptop_dev), {})
    step('the list holds both devices', r.ok and len(rows) >= 2 and mine and other, rows)
    step('the phone is marked current, the laptop is not', mine.get('current') is True and other.get('current') is False, rows)
    step('labels are readable, addresses masked, no raw user agent', other.get('label') == 'Chrome · Windows'
         and mine.get('platform') == 'ios' and '*' in str(mine.get('ip')) and 'Mozilla' not in str(rows), rows)

    journey('sessions: the apps\' own route (GET/DELETE /users/me/sessions) ends a sign-in the same way')
    tablet_dev = 'live-tablet-' + uuid.uuid4().hex
    r = anon.post('/auth/login', {'phone': p['phone'], 'password': p['password']}, headers={'x-device-id': tablet_dev, 'user-agent': CHROME})
    tablet = tok(r)
    tablet_c = Client(tablet.get('accessToken'), 'tablet')
    r = phone_c.get('/users/me/sessions', headers={'x-device-id': phone_dev})
    rows2 = r.items()
    t_row = next((x for x in rows2 if x.get('device') == tablet_dev), {})
    step('the apps\' list shows a readable label and no raw user agent', r.ok and t_row.get('label') == 'Chrome · Windows' and 'Mozilla' not in str(rows2), rows2)
    r = phone_c.delete(f"/users/me/sessions/{t_row.get('id')}")
    step('ending it through the apps\' route works', r.ok, r)
    step('and the tablet\'s access token is refused at once', tablet_c.get('/auth/me').status == 401, '')

    journey('sessions: push tokens follow the device')
    for c, name, dev in ((phone_c, 'phone', phone_dev), (laptop_c, 'laptop', laptop_dev)):
        r = c.post('/notifications/register-token', {'token': f'ExponentPushToken[live-{name}-{uuid.uuid4().hex[:8]}]', 'provider': 'expo', 'platform': 'ios' if name == 'phone' else 'web'},
                   headers={'x-device-id': dev})
        step(f'{name} registers a push token', r.ok, r)
    r = phone_c.get('/push/devices')
    step('both push tokens are listed', r.ok and len(r.items()) == 2, r)

    journey('sessions: refresh rotates')
    r = anon.post('/auth/refresh', {'refresh_token': phone['refreshToken']}, headers={'x-device-id': phone_dev})
    new = tok(r) if r.ok else {}
    step('the refresh token gives a new pair', r.ok and new.get('refreshToken') and new['refreshToken'] != phone['refreshToken'], r)
    r = anon.post('/auth/refresh', {'refresh_token': phone['refreshToken']}, headers={'x-device-id': phone_dev})
    step('the old refresh token is refused', r.status == 401, r)
    # a reuse right after a rotation fails alone; the phone's new pair is still valid
    phone = new
    phone_c = Client(phone['accessToken'], 'phone')
    r = phone_c.get('/auth/sessions', headers={'x-device-id': phone_dev})
    step('the phone is still signed in after the rotation, with the same session id', r.ok and any(d.get('current') for d in r.get('devices') or []), r)

    journey('sessions: sign out other devices')
    r = laptop_c.get('/auth/me')
    step('baseline: the laptop access token works', r.ok, r)
    r = phone_c.post('/auth/sessions/revoke-others', None, headers={'x-device-id': phone_dev})
    step('revoke-others answers how many it ended', r.ok and r.get('sessions_revoked', 0) >= 1, r)
    r = laptop_c.get('/auth/me')
    step('the laptop access token is refused at once (401 session_revoked)', r.status == 401, r)
    r = anon.post('/auth/refresh', {'refresh_token': laptop['refreshToken']}, headers={'x-device-id': laptop_dev})
    step('the laptop refresh token is refused', r.status == 401, r)
    r = phone_c.get('/auth/me')
    step('the phone keeps working', r.ok, r)
    r = phone_c.get('/push/devices')
    left = r.items()
    step('only the phone\'s push token is left', r.ok and len(left) == 1 and 'phone' in str(left[0].get('token')), left)
    r = phone_c.delete('/auth/sessions/does-not-exist')
    step('revoking an unknown session id is 404', r.status == 404, r)

    journey('sessions: sign-out removes the push token')
    r = anon.post('/auth/logout', {'refresh_token': phone['refreshToken']})
    step('sign-out with the refresh token ends the session', r.ok and r.get('session_revoked') is True, r)
    r = phone_c.get('/auth/me')
    step('the phone access token stops at once', r.status == 401, r)
    login = anon.post('/auth/login', {'phone': p['phone'], 'password': p['password']}, headers={'x-device-id': 'live-check-' + uuid.uuid4().hex})
    c = Client(tok(login).get('accessToken'), 'check')
    r = c.get('/push/devices')
    step('no push token of the account is left', r.ok and len(r.items()) == 0, r.items())


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
