"""Journey SY-06 (SLA breach and high fraud): the other two urgent-alert rules, through the admin BFF (admin/urgent-alerts).

  1. sla_breach: a patient's real lab booking whose SLA time has passed (the test database says it was due two hours ago; no
     screen sets that time) raises one alert for exactly that booking, with the due time as its window, severity, params and
     the order link; a second evaluation does not duplicate it.
  2. fraud_high: an open fraud alert at 99 percent confidence (inserted into the test database: the detectors run on their own
     schedule) raises one alert with flag type, confidence and the fraud-monitoring link; a second evaluation does not duplicate it.
  3. A threshold above the fraud range is refused. The rules are restored at the end.
"""
import uuid
from datetime import datetime, timedelta, timezone

from lib import Client, journey, step

SLA, FRAUD = 'sla_breach', 'fraud_high'


def alerts_for(admin, kind, entity_id, pages=10):
    hits = []
    for page in range(1, pages + 1):
        r = admin.get(f'/admin/admin/urgent-alerts?page={page}&limit=100')
        data = r.body.get('data', []) if isinstance(r.body, dict) else []
        hits += [a for a in data if a.get('kind') == kind and a.get('entity_id') == entity_id]
        if len(data) < 100:
            break
    return hits


def iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z')


def run(admin):
    import db_raw
    from j_accounts import app_signup
    from j_chaos import payable_lab_booking
    r = admin.get('/admin/admin/urgent-alerts/rules')
    original = r.body.get('rules') if isinstance(r.body, dict) else None
    step('rules load', r.ok and isinstance(original, list), r)
    if not isinstance(original, list):
        return
    try:
        bad = admin.put('/admin/admin/urgent-alerts/rules', {'rules': [{'kind': FRAUD, 'threshold': 101, 'enabled': True, 'notify_email': False}]})
        step('a fraud threshold above 100 percent is refused', bad.status == 400, bad)
        rules = [dict(x, threshold=(0 if x.get('kind') == SLA else 1), enabled=True, notify_email=False) if x.get('kind') in (SLA, FRAUD) else x
                 for x in original]
        r = admin.put('/admin/admin/urgent-alerts/rules', {'rules': rules})
        step('SLA (0 minutes late) and fraud (1 percent) rules set', r.ok, r)

        journey('sla breach: a booking past its SLA time')
        pat = Client(app_signup(label='sla-alerts')['token'], 'sla-alerts')
        if not pat.get('/labs/services').items():
            import j_lab
            j_lab.admin_publishes_tests(admin)
        bid, why = payable_lab_booking(pat)
        step('patient lab booking left open', bool(bid), why)
        if bid:
            due = datetime.now(timezone.utc) - timedelta(hours=2)
            changed = db_raw.set_raw('labbookings', {'id': bid}, {'sla_due_at': {'$date': iso(due)}})
            step('test database: the booking was due two hours ago', changed == 1, f'{changed} documents')
            r = admin.post('/admin/admin/urgent-alerts/evaluate', {})
            step('run now', r.ok, r)
            hits = alerts_for(admin, SLA, bid)
            step('one sla_breach alert for exactly that booking', len(hits) == 1, f'{len(hits)} alerts')
            if len(hits) == 1:
                a, p = hits[0], hits[0].get('params') or {}
                step('alert carries severity, message key, params, due-time window and order link',
                     a.get('severity') == 'high' and a.get('message_key') == 'admin_alerts.sla_breach' and p.get('order_kind') == 'lab'
                     and p.get('order_id') == bid and str(a.get('window', '')).startswith(iso(due)[:16]) and a.get('link') == f'/admin/orders/lab/{bid}', a)
                admin.post('/admin/admin/urgent-alerts/evaluate', {})
                again = alerts_for(admin, SLA, bid)
                step('a second evaluation does not duplicate it', len(again) == 1 and again[0].get('id') == a.get('id'), f'{len(again)} alerts')

        journey('high fraud: an open fraud alert at 99 percent')
        fid = f'fa_{uuid.uuid4().hex[:12]}'
        ok = db_raw.insert_raw('fraud_alerts', {'id': fid, 'flagType': 'live_journey_check', 'confidenceScore': 0.99, 'status': 'pending',
                                                'userId': f'live-{fid}', 'createdAt': {'$date': iso(datetime.now(timezone.utc))}})
        step('test database: an open fraud alert at 99 percent', ok, '')
        if ok:
            r = admin.post('/admin/admin/urgent-alerts/evaluate', {})
            step('run now', r.ok, r)
            hits = alerts_for(admin, FRAUD, fid)
            step('one fraud_high alert for exactly that fraud alert', len(hits) == 1, f'{len(hits)} alerts')
            if len(hits) == 1:
                a, p = hits[0], hits[0].get('params') or {}
                step('alert carries severity, message key, flag type, confidence and the fraud-monitoring link',
                     a.get('severity') == 'critical' and a.get('message_key') == 'admin_alerts.fraud_high' and p.get('flag_type') == 'live_journey_check'
                     and int(p.get('confidence') or 0) == 99 and a.get('link') == '/admin/fraud-monitoring', a)
                admin.post('/admin/admin/urgent-alerts/evaluate', {})
                again = alerts_for(admin, FRAUD, fid)
                step('a second evaluation does not duplicate it', len(again) == 1 and again[0].get('id') == a.get('id'), f'{len(again)} alerts')
    finally:
        r = admin.put('/admin/admin/urgent-alerts/rules', {'rules': original})
        step('rules restored', r.ok, r)


if __name__ == '__main__':
    import j_admin
    from lib import summary
    admin, _ = j_admin.login()
    run(admin)
    summary()
