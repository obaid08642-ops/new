"""Journey 21.1: the guest is a real server-side account, found by device id and nothing else.
  - a reopen (the same device id) keeps the same guest; a reinstall (a new device id) is a new guest;
  - no device id -> refused (the IP address is never an identity);
  - a phone sent in the body is not identity: it cannot reach a registered patient's session or another guest's."""
import j_accounts
from lib import Client, journey, step, uniq


def guest(device, body=None):
    return Client(None, 'anon').post('/auth/guest', body or {}, headers={'x-device-id': device} if device else {})


def main():
    d1, d2 = f'live-device-{uniq("a")}-0001', f'live-device-{uniq("b")}-0002'
    journey('21.1 guest identity: the device is the identity')
    a = guest(d1)
    ga = a.get('user', 'id')
    step('a guest is created for a new device', a.ok and a.get('user', 'is_guest') is True and bool(ga), a)
    token = a.get('token', 'accessToken') or a.get('token')
    step('its token is a real session', a.ok and bool(token), a)
    again = guest(d1)
    step('a reopen (same device id) keeps the same guest', again.ok and again.get('user', 'id') == ga, again)
    other = guest(d2)
    step('a reinstall (a new device id) is a new guest', other.ok and other.get('user', 'id') not in (None, ga), other)
    none = guest(None)
    step('no device id is refused', none.status == 400, none)
    bad = guest('x')
    step('a malformed device id is refused', bad.status == 400, bad)

    journey('21.1 a phone is not identity')
    patient = j_accounts.app_signup(label='guest-phone')
    victim_id = patient['user'].get('id')
    d3 = f'live-device-{uniq("c")}-0003'
    t = guest(d3, {'phone': patient['phone']})
    step('a guest call with a registered patient\'s phone does not return that patient',
         t.ok and t.get('user', 'id') != victim_id and t.get('user', 'phone') != patient['phone'], t)
    gp = Client(t.get('token', 'accessToken') or t.get('token'), 'guest').get('/auth/me')
    gp_id = gp.get('id') or gp.get('user', 'id')
    step('the session it did get is a guest, not the patient', gp.ok and gp_id and gp_id != victim_id and (gp.get('is_guest') or gp.get('user', 'is_guest')), gp)
    reg = Client(None, 'anon').post('/auth/login', {'identifier': patient['email'], 'password': patient['password']})
    step('and the patient can still sign in', reg.ok, reg)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
