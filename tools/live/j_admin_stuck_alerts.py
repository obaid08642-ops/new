"""Journey SY-06 (stuck orders): an order that sits open raises an urgent alert for the admin, once.

Through the admin BFF (backend admin/urgent-alerts), complementing j_admin_urgent_alerts (failed payments):
  1. a patient creates a real lab booking and leaves it open (NEW_REQUEST)
  2. the admin lowers the "order stuck" rule to 1 minute and, a little over a minute later, runs the evaluation
  3. an order_stuck alert for exactly that booking is in the inbox (severity high, message key, order link, params)
  4. a second evaluation does not create a second alert for the same order and state
  5. a patient may not run the evaluation
The rules are restored at the end.
"""
import time

from lib import Client, journey, step

KIND = 'order_stuck'


def stuck_alerts_for(admin, order_id, pages=10):
    hits = []
    for page in range(1, pages + 1):
        r = admin.get(f'/admin/admin/urgent-alerts?page={page}&limit=100')
        data = r.body.get('data', []) if isinstance(r.body, dict) else []
        hits += [a for a in data if a.get('kind') == KIND and a.get('entity_id') == order_id]
        if len(data) < 100:
            break
    return hits


def run(admin):
    from j_accounts import app_signup
    from j_chaos import payable_lab_booking
    journey('stuck order alert: a booking is left open')
    pat = Client(app_signup(label='stuck-alerts')['token'], 'stuck-alerts')
    if not pat.get('/labs/services').items():
        import j_lab
        j_lab.admin_publishes_tests(admin)
    bid, why = payable_lab_booking(pat)
    step('patient lab booking left open', bool(bid), why)
    if not bid:
        return

    r = admin.get('/admin/admin/urgent-alerts/rules')
    original = r.body.get('rules') if isinstance(r.body, dict) else None
    step('rules load', r.ok and isinstance(original, list), r)
    if not isinstance(original, list):
        return
    try:
        rules = [dict(x, threshold=1, enabled=True) if x.get('kind') == KIND else x for x in original]
        r = admin.put('/admin/admin/urgent-alerts/rules', {'rules': rules})
        saved = next((x for x in (r.body.get('rules') or []) if x.get('kind') == KIND), {}) if isinstance(r.body, dict) else {}
        step('order-stuck rule set to 1 minute', r.ok and saved.get('threshold') == 1 and saved.get('enabled') is True, r)

        journey('stuck order alert: the evaluation raises it')
        time.sleep(65)  # the rule's smallest threshold is one minute; the booking must be older than that
        r = admin.post('/admin/admin/urgent-alerts/evaluate', {})
        step('run now (same evaluation as the 5-minute schedule)', r.ok, r)
        hits = stuck_alerts_for(admin, bid)
        step('one order_stuck alert for exactly that booking', len(hits) == 1, f'{len(hits)} alerts')
        if len(hits) != 1:
            return
        a = hits[0]
        p = a.get('params') or {}
        step('alert carries severity, message key, params and the order link',
             a.get('severity') == 'high' and a.get('message_key') == 'admin_alerts.order_stuck'
             and p.get('order_kind') == 'lab' and p.get('order_id') == bid and a.get('link') == f'/admin/orders/lab/{bid}', a)

        journey('stuck order alert: no duplicate, patient cannot evaluate')
        r = admin.post('/admin/admin/urgent-alerts/evaluate', {})
        step('second evaluation runs', r.ok, r)
        hits = stuck_alerts_for(admin, bid)
        step('still one alert for that order and state', len(hits) == 1 and hits[0].get('id') == a.get('id'), f'{len(hits)} alerts')
        r = pat.post('/admin/urgent-alerts/evaluate', {})
        step('a patient cannot run the evaluation', r.status in (401, 403), r)
    finally:
        r = admin.put('/admin/admin/urgent-alerts/rules', {'rules': original})
        step('rules restored', r.ok, r)


if __name__ == '__main__':
    import j_admin
    from lib import summary
    admin, _ = j_admin.login()
    run(admin)
    summary()
