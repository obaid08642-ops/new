"""Journey: problem orders on the admin Today screen and the orders list (issue 1236, admin-ops-monitoring#15).
  An order that waits in an in-flight state past the admin's stuck threshold (config portal -> orders-console-config)
  is listed by the Today alerts (GET /admin/ops/alerts) and by the orders list filter (GET /admin/orders?problem=stuck),
  which lists all of them and nothing fresh.
"""
import time
import uuid

from lib import Client, journey, step


def broadcast_order(pat, addr, tag):
    draft = {'items': [{'raw_name': f'دواء متابعة {tag}', 'qty': 1, 'intake_source': 'text'}],
             'delivery_address': {'label': 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                                  'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
             'prescription_attachments': []}
    key = f'mobile-problem-{uuid.uuid4()}'
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': key})
    oid = r.get('id')
    if oid:
        r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': key + '-submit'})
    step(f'patient sends a pharmacy request ({tag})', bool(oid) and r.ok, r)
    return oid


def run():
    import j_admin, j_accounts
    from j_pharmacy import patient_address
    _, admin = j_admin.login()
    journey('admin problems: the stuck threshold is an admin setting (config portal)')
    r = admin.put('/admin/config/orders-console-config', {'stuck_minutes': 1, 'reason': 'live gate: 1 minute threshold'})
    step('admin sets "stuck after 1 minute" (orders-console-config)', r.ok and r.get('stuck_minutes') == 1, r)
    step('the compensation cap is kept when only the threshold is saved', r.get('compensation_max_sar') is not None, r)

    acct = j_accounts.app_signup(label='problem-orders')
    pat = Client(acct['token'], 'patient')
    addr = patient_address(pat)
    stuck = broadcast_order(pat, addr, 'old')
    if not stuck:
        return
    time.sleep(65)  # past the 1-minute threshold
    fresh = broadcast_order(pat, addr, 'fresh')

    journey('admin problems: Today alerts and the orders list show the stuck pharmacy order')
    r = admin.get('/admin/ops/alerts')
    ids = [x.get('id') for x in (r.get('stuck_orders') or [])]
    step('Today alerts list the stuck pharmacy order', r.ok and stuck in ids, f'{r.status} {len(ids)} stuck')
    step('Today alerts do not list the fresh one', fresh not in ids, None)
    r = admin.get('/admin/orders?problem=stuck&kind=pharmacy&limit=100')
    rows = [x.get('id') for x in (r.get('data') or [])]
    step('orders list ?problem=stuck has the stuck order', r.ok and stuck in rows, f'{r.status} {len(rows)} rows')
    step('orders list ?problem=stuck leaves out the fresh order', fresh not in rows, None)
    r = admin.get('/admin/orders?problem=nonsense')
    step('an unknown problem is refused (400)', r.status == 400, r)
    admin.put('/admin/config/orders-console-config', {'stuck_minutes': 30, 'reason': 'live gate: restore the default'})


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
