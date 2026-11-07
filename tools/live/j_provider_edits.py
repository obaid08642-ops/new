"""Journey: a provider edits its hours, prices and service area; nothing goes live until the admin approves (SCENARIOS PV-10 / PV-11).
  - working hours (PUT /provider/working-hours), pricing (PUT /provider/settings/pricing) and the delivery area and fee
    (PATCH /provider/profile) each become a pending change: the live value is unchanged until an admin approves it;
  - an approved change shows on the provider's own screens; a refused one (with a reason) changes nothing and is listed as rejected;
  - a week with more than 7 days is refused.
Stack: backend :8002, admin BFF :3001, smtp_sink :2525."""
from lib import Client, journey, step

# the provider app sends the whole week with full day names (WorkingDayDto)
DAYS = ('saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday')
WEEK = lambda open_, close: [{'day': d, 'open': open_, 'close': close, 'closed': d == 'friday'} for d in DAYS]


def pending_for(admin, provider_id, target=None):
    r = admin.get('/admin/admin/providers/provider-deltas')
    return [x for x in r.items() if x.get('status') == 'pending' and x.get('provider_id') == provider_id and (target is None or x.get('target') == target)]


def hours(pharm, admin, pid):
    journey('PV-10: working hours')
    r = pharm.get('/provider/working-hours')
    before = r.body
    r = pharm.put('/provider/working-hours', {'hours': WEEK('08:00', '23:00')})
    step('the pharmacy sends its hours for review', r.ok and r.get('pending_review') is True, r)
    r = pharm.get('/provider/working-hours')
    step('the live hours are unchanged until approval', r.ok and r.body == before, r)
    rows = pending_for(admin, pid, 'settings')
    step('the admin sees the pending hours change from this provider', len(rows) == 1, len(rows))
    mine = pharm.get('/provider-deltas')
    step('the provider lists its own change as pending', mine.ok and any(x.get('status') == 'pending' for x in mine.items()), mine)
    if rows:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{rows[0]['id']}/approve", {'reason': 'ساعات العمل معتمدة'})
        step('the admin approves the hours', r.ok, r)
    r = pharm.get('/provider/working-hours')
    live = r.body if isinstance(r.body, list) else (r.get('hours') or r.body)
    step('the approved hours are live (08:00 to 23:00, Friday closed)', r.ok and '23:00' in str(live) and any(d.get('day') == 'friday' and d.get('closed') for d in live if isinstance(d, dict)), r)
    r = pharm.put('/provider/working-hours', {'hours': WEEK('09:00', '17:00') + WEEK('09:00', '17:00')})
    step('a week of more than 7 days is refused', r.status == 400, r)
    r = pharm.put('/provider/working-hours', {'hours': WEEK('10:00', '14:00')})
    step('the pharmacy sends a second change', r.ok, r)
    rows = pending_for(admin, pid, 'settings')
    if rows:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{rows[0]['id']}/reject", {'reason': 'ساعات العمل غير منطقية'})
        step('the admin refuses it with a reason', r.ok, r)
    r = pharm.get('/provider/working-hours')
    step('a refused change leaves the live hours as they were', r.ok and '23:00' in str(r.body) and '14:00' not in str(r.body), r)
    mine = pharm.get('/provider-deltas')
    step('the provider sees the refused change as rejected', mine.ok and any(x.get('status') == 'rejected' for x in mine.items()), mine)


def pricing(pharm, admin, pid):
    journey('PV-10: prices')
    value = {'min_order_sar': 35, 'express_fee': 15}
    r = pharm.put('/provider/settings/pricing', {'pricing': value})
    step('the pharmacy sends its prices for review', r.ok and r.get('pending_review') is True, r)
    r = pharm.get('/provider/settings/pricing')
    step('the live prices are unchanged until approval', r.ok and r.get('pricing') != value, r)
    rows = pending_for(admin, pid, 'settings')
    if rows:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{rows[0]['id']}/approve", {'reason': 'الأسعار معتمدة'})
        step('the admin approves the prices', r.ok, r)
    r = pharm.get('/provider/settings/pricing')
    step('the approved prices are live', r.ok and r.get('pricing') == value, r)


def area(pharm, admin, pid):
    journey('PV-10: the delivery area and fee')
    r = pharm.patch('/provider/profile', {'max_delivery_radius_km': 7, 'delivery_fee': 12})
    step('the pharmacy sends a new delivery radius and fee for review', r.ok and r.get('pending_review') is True, r)
    rows = pending_for(admin, pid, 'profile')
    step('the admin sees the pending profile change', len(rows) == 1, len(rows))
    r = pharm.get('/provider/profile')
    step('the live radius is not 7 until approval', r.ok and r.get('max_delivery_radius_km') != 7, r.get('max_delivery_radius_km'))
    if rows:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{rows[0]['id']}/approve", {'reason': 'نطاق التوصيل معتمد'})
        step('the admin approves the area', r.ok, r)
    r = pharm.get('/provider/profile')
    step('the approved radius and fee are live', r.ok and r.get('max_delivery_radius_km') == 7 and r.get('delivery_fee') == 12, {k: r.get(k) for k in ('max_delivery_radius_km', 'delivery_fee')})


if __name__ == '__main__':
    import j_admin, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pharm = Client(p['token'], 'pharmacy')
    pid = pharm.get('/provider/me').get('account', 'id')
    hours(pharm, admin, pid)
    pricing(pharm, admin, pid)
    area(pharm, admin, pid)
    summary()
