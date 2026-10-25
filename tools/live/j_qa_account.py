"""Journey: account screens over the API (patient-web and patient-app use the same endpoints).
Notification settings, addresses (add, edit, delete) and loyalty reads. Each write is followed by a read
that must show the change, so a write that returns 2xx without persisting fails here.
Payloads copied from backend/src/modules/users/users.addresses.dto.ts, users.settings.dto.ts and loyalty.controller.ts."""
from lib import Client, journey, step
from j_accounts import app_signup


def rows_of(resp):
    b = resp.body
    return b if isinstance(b, list) else (b or {}).get('items', (b or {}).get('addresses', []))


def run():
    journey('account: notifications, addresses, loyalty (API, read-back)')
    pat = app_signup(label='qaacct')
    c = Client(pat['token'], 'patient-api')

    # Notification settings: a toggle must come back on the next read.
    r = c.get('/users/me/notification-settings')
    step('notification settings read', r.ok, r)
    r = c.req('PATCH', '/users/me/notification-settings', {'general': False})
    step('notification settings save (general off)', r.ok, r)
    r = c.get('/users/me/notification-settings')
    step('notification settings persisted', r.ok and r.get('preferences', 'general') is False, r)

    # Addresses: add, edit, read back, delete.
    r = c.post('/users/me/addresses', {'label': 'QA home', 'street': 'Test Street 1', 'city': 'Riyadh', 'is_default': True})
    addr = r.get('id') if r.ok else None
    step('address add', r.ok and bool(addr), r)
    r = c.get('/users/me/addresses')
    listed = [a for a in rows_of(r) if a.get('id') == addr]
    step('address listed after add', r.ok and bool(listed), r)
    if addr:
        r = c.req('PATCH', f'/users/me/addresses/{addr}', {'label': 'QA home (edited)'})
        step('address edit', r.ok, r)
        r = c.get('/users/me/addresses')
        rows = [a for a in rows_of(r) if a.get('id') == addr]
        step('address edit persisted', r.ok and rows and rows[0].get('label') == 'QA home (edited)', rows)
        r = c.req('DELETE', f'/users/me/addresses/{addr}')
        step('address delete', r.ok, r)
        r = c.get('/users/me/addresses')
        rows = [a for a in rows_of(r) if a.get('id') == addr]
        step('address gone after delete', r.ok and not rows, rows)

    # Loyalty reads (the account and rewards screens).
    for path in ('/loyalty/config', '/loyalty/account', '/loyalty/rewards'):
        r = c.get(path)
        step(f'loyalty read {path}', r.ok, r)


if __name__ == '__main__':
    run()
