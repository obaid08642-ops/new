"""Journey #1235: urgent admin alerts reach an admin who has the today screen closed.

admin/src/pages/admin/alerts.tsx + the bell in AdminGuard, through the admin BFF (backend admin/urgent-alerts):
  1. the admin lowers the "failed payments in one hour" rule to 1 with e-mail on (PUT rules, audited)
  2. a real failed payment: a patient's lab booking, card intent, the hosted checkout declines (fake_moyasar
     /__pay?status=failed) and verify records it failed
  3. "run now" (the same evaluation the 5-minute schedule runs) raises the alert
  4. the alert is in the inbox (unread first) and the unread count; marking it read lowers the count
  5. a second evaluation in the same hour does not duplicate it and sends no second e-mail
  6. the e-mail reached the admin in the mail sink (smtp_sink.py)
The rules are restored at the end.
"""
import time, uuid
from datetime import datetime, timezone

from lib import Client, journey, step, mail_to

PAY_KIND = 'payment_failures'


def rows(r):
    return r.body.get('data', []) if isinstance(r.body, dict) else []


def payment_alerts(admin, window):
    r = admin.get('/admin/admin/urgent-alerts?page=1&limit=100')
    return r, [a for a in rows(r) if a.get('kind') == PAY_KIND and a.get('window') == window]


def unread(admin):
    r = admin.get('/admin/admin/urgent-alerts/unread-count')
    return r, (r.body.get('unread') if isinstance(r.body, dict) else None)


def alert_mails(to, since, timeout=10):
    return [m for m in mail_to(to, since, timeout) if 'تنبيه عاجل' in m.get('subject', '') and 'مدفوعات فاشلة' in m.get('body', '')]


def failed_payment():
    """A real declined card payment on a patient's lab booking (same path as j_app_killed_payment)."""
    from j_accounts import app_signup
    from j_chaos import payable_lab_booking
    from j_nursing import fake_pay
    pat = Client(app_signup(label='urgent-alerts')['token'], 'urgent-alerts')
    bid, why = payable_lab_booking(pat)
    step('patient lab booking to pay for', bool(bid), why)
    if not bid:
        return False
    r = pat.post(f'/payments/intent/lab/{bid}', {'method': 'card'}, headers={'Idempotency-Key': f'alerts-{bid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('card payment intent created', r.ok and txn.get('id'), r)
    if not txn.get('id'):
        return False
    fake_pay(txn.get('gateway_intent_id'), 'failed')
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step('the declined checkout is recorded as a failed payment', r.ok and r.get('status') == 'failed', r)
    return r.ok and r.get('status') == 'failed'


def run(admin, admin_email):
    journey('urgent alerts: the admin sets a rule (alerts.tsx rules section)')
    r = admin.get('/admin/admin/urgent-alerts/rules')
    original = r.body.get('rules') if isinstance(r.body, dict) else None
    step('rules load with defaults from the business rules', r.ok and isinstance(original, list) and len(original) == 4, r)
    if not isinstance(original, list):
        return
    bad = admin.put('/admin/admin/urgent-alerts/rules', {'rules': [{'kind': 'fraud_high', 'threshold': 500, 'enabled': True, 'notify_email': True}]})
    step('an out-of-range threshold is refused', bad.status == 400, bad)
    rules = [dict(x, threshold=1, enabled=True, notify_email=True) if x.get('kind') == PAY_KIND else x for x in original]
    r = admin.put('/admin/admin/urgent-alerts/rules', {'rules': rules})
    saved = next((x for x in (r.body.get('rules') or []) if x.get('kind') == PAY_KIND), {}) if isinstance(r.body, dict) else {}
    step('failed-payments rule lowered to 1 per hour with e-mail on', r.ok and saved.get('threshold') == 1 and saved.get('notify_email') is True, r)

    try:
        journey('urgent alerts: a real failed payment')
        if not failed_payment():
            return

        journey('urgent alerts: the evaluator raises it while no screen is open')
        _, before = unread(admin)
        t0 = time.time()
        window = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H')
        r = admin.post('/admin/admin/urgent-alerts/evaluate', {})
        step('run now (same evaluation as the 5-minute schedule)', r.ok, r)
        r, hits = payment_alerts(admin, window)
        step('the failed-payments alert is in the inbox for this hour', r.ok and len(hits) == 1, r)
        if len(hits) != 1:
            return
        alert = hits[0]
        created = datetime.fromisoformat(str(alert.get('created_at')).replace('Z', '+00:00')).timestamp()
        fresh = created >= t0 - 2
        step('alert carries kind, severity, message key + params and the finance link',
             alert.get('severity') == 'critical' and alert.get('message_key') == 'admin_alerts.payment_failures'
             and int((alert.get('params') or {}).get('count') or 0) >= 1 and alert.get('link') == '/admin/finance-suite', alert)
        if fresh:
            _, now_unread = unread(admin)
            step('it is unread and counted on the bell', alert.get('read') is False and isinstance(now_unread, int) and now_unread >= 1
                 and (before is None or now_unread >= before + 1), f'before={before} now={now_unread} alert={alert}')
            step('unread alerts are listed first', rows(admin.get('/admin/admin/urgent-alerts?page=1&limit=100'))[0].get('read') is False, '')
        else:
            step('alert for this hour already raised by an earlier run (same window, de-duplicated)', True, alert.get('created_at'))

        journey('urgent alerts: mark read')
        _, u1 = unread(admin)
        was_unread = payment_alerts(admin, window)[1][0].get('read') is False
        r = admin.post(f"/admin/admin/urgent-alerts/{alert['id']}/read", {})
        step('admin marks it read', r.ok and r.get('ok') is True, r)
        _, u2 = unread(admin)
        # Other admins' activity never changes this admin's count; new alerts from other rules could, so <= when
        # nothing was unread, exactly one less when it was.
        step('the unread count drops by one', isinstance(u1, int) and isinstance(u2, int) and (u2 == u1 - 1 if was_unread else u2 <= u1), f'{u1} -> {u2} (was_unread={was_unread})')
        r, hits = payment_alerts(admin, window)
        step('the inbox shows it read', len(hits) == 1 and hits[0].get('read') is True, r)

        journey('urgent alerts: e-mail once, no duplicate on the next evaluation')
        if fresh:
            mails = alert_mails(admin_email, t0, timeout=20)
            step('the alert e-mail reached the admin (mail sink)', len(mails) >= 1, f'{len(mails)} mails')
        t1 = time.time()
        r = admin.post('/admin/admin/urgent-alerts/evaluate', {})
        step('second evaluation runs', r.ok, r)
        r, hits = payment_alerts(admin, window)
        step('still one failed-payments alert for this hour (no duplicate)', len(hits) == 1 and hits[0].get('id') == alert['id'], r)
        step('no second e-mail for the same alert', len(alert_mails(admin_email, t1, timeout=6)) == 0, 'second mail found')
    finally:
        journey('urgent alerts: restore the rules')
        r = admin.put('/admin/admin/urgent-alerts/rules', {'rules': original})
        step('rules restored', r.ok, r)


if __name__ == '__main__':
    import j_admin
    from lib import summary
    admin, _ = j_admin.login()
    run(admin, j_admin.EMAIL)
    summary()
