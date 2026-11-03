"""Journey: how a pharmacy answers a patient's broadcast, and what happens when it does not (SCENARIOS PV-17).
  - accept: the pharmacy drafts and submits an offer (covered by j_pharmacy; here it is the contrast to the other answers);
  - reject: the pharmacy declines with a reason; the order stays open for the pharmacy that answers;
  - timeout of a round: nobody answers, the round is not due until its time, then the broadcast widens round by round and closes
    with the order in manual review and the patient told (the expiry command of the finance-free ops route);
  - timeout of an offer: a quote that lapses is expired and the patient cannot choose it.
Stack: backend :8002, admin BFF :3001, smtp_sink :2525."""
import datetime

from lib import Client, journey, step

PAST = lambda minutes=5: {'$date': (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=minutes)).isoformat()}


def expire_due(admin):
    return admin.post('/admin/admin/pharmacy/broadcasts/expire-due?limit=50', {})


def my_broadcast(pharm, oid):
    return next((x for x in pharm.get('/provider/pharmacy/broadcasts').items() if x.get('order_id') == oid), None)


def reject_then_other_accepts(pat, pharm_a, pharm_b, meds, addr):
    import j_pharmacy
    journey('PV-17: one pharmacy rejects, the other answers')
    oid, row_a = j_pharmacy._send_order(pat, pharm_a, meds, addr)
    row_b = my_broadcast(pharm_b, oid)
    step('both pharmacies receive the broadcast', bool(row_a) and bool(row_b), f'a={bool(row_a)} b={bool(row_b)}')
    if not (row_a and row_b):
        return
    r = pharm_a.post(f'/provider/pharmacy/broadcasts/{oid}/reject', {'reason': 'لا يتوفر الدواء حالياً'})
    step('pharmacy A rejects with a reason', r.ok, r)
    r = pharm_a.post(f'/provider/pharmacy/broadcasts/{oid}/reject', {})
    step('rejecting again is harmless', r.ok, r)
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('a rejection does not cancel the patient\'s order', r.ok and str(order.get('status') or order.get('governed_state')).lower() not in ('cancelled', 'rejected', 'manual_review'),
         order.get('status') or order.get('governed_state'))
    d, sub = j_pharmacy._quote(pharm_b, oid, row_b)
    step('pharmacy B answers with an offer', d.ok and sub.ok, f'{d} / {sub}')
    offers = pat.get(f'/patient/pharmacy/orders/{oid}/offers').items()
    step('the patient is offered B\'s quote only', len(offers) == 1, len(offers))
    r = pharm_a.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': []})
    step('pharmacy A, which rejected, cannot then offer (4xx)', not r.ok, r)


def round_timeout(admin, pat, pharm_a, meds, addr):
    import j_pharmacy, db_raw
    journey('PV-17: nobody answers: the rounds widen and the broadcast closes')
    oid, row = j_pharmacy._send_order(pat, pharm_a, meds, addr)
    step('the pharmacy receives the broadcast', bool(row), row)
    if not row:
        return
    r = expire_due(admin)
    step('before its time a round is not expired', r.ok and (r.get('advanced') or 0) == 0 and (r.get('closed') or 0) == 0 if isinstance(r.body, dict) else r.ok, r)
    closed = False
    for i in range(1, 9):
        db_raw.set_raw('pharmacy_broadcasts', {'order_id': oid, 'lock_state': 'open'}, {'round_expires_at': PAST()})
        r = expire_due(admin)
        if not r.ok:
            step(f'expire-due round {i}', False, r)
            break
        order = pat.get(f'/patient/pharmacy/orders/{oid}')
        data = order.body.get('data', order.body) if isinstance(order.body, dict) else {}
        if str(data.get('status') or '').lower() == 'manual_review' or str(data.get('governed_state') or '').lower() == 'manual_review':
            closed = True
            break
    step('after the last round the order goes to manual review', closed, data.get('status') if closed is False else '')
    bl = pharm_a.get(f'/provider/pharmacy/broadcasts/{oid}')
    step('the pharmacy can no longer answer the closed broadcast', not pharm_a.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': []}).ok, bl.status)


def offer_timeout(admin, pat, pharm, meds, addr):
    import j_pharmacy, db_raw
    journey('PV-17: a quote that lapses cannot be chosen')
    oid, row = j_pharmacy._send_order(pat, pharm, meds, addr)
    if not row:
        return step('the pharmacy receives the broadcast', False, row)
    d, sub = j_pharmacy._quote(pharm, oid, row)
    step('the pharmacy submits its quote', d.ok and sub.ok, f'{d} / {sub}')
    offer = (pat.get(f'/patient/pharmacy/orders/{oid}/offers').items() or [{}])[0]
    step('the patient sees the quote', bool(offer.get('id')), offer)
    changed = db_raw.set_raw('pharmacy_offers', {'id': offer.get('id')}, {'quote_expires_at': PAST()})
    step('test data: the quote\'s time is set to 5 minutes ago', changed == 1, changed)
    r = expire_due(admin)
    step('the expiry command runs', r.ok, r)
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{offer.get('id')}/select", {'coverage_mode': 'cash'}, headers={'Idempotency-Key': j_pharmacy.KEY('offer')})
    step('the patient cannot choose the lapsed quote (4xx)', not r.ok, r)
    mine = [o for o in pharm.get('/provider/pharmacy/offers').items() if o.get('id') == offer.get('id')]
    step('the pharmacy sees the quote as expired', bool(mine) and str(mine[0].get('status')).lower() == 'expired', mine[:1])


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    from lib import summary
    admin, _ = j_admin.login()
    accounts = []
    for _i in range(2):
        p = j_onboarding.register_pharmacy()
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        ph = Client(p['token'], 'pharmacy')
        r = ph.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
        step('the pharmacy switches to "online - ready for orders"', r.ok and r.get('instant_available') is True, r)
        accounts.append(ph)
    pa = j_accounts.app_signup(label='broadcast-buyer')
    pat = Client(pa['token'], 'patient')
    meds = j_pharmacy.admin_adds_medicines(admin)
    for ph in accounts:
        j_pharmacy.pharmacy_prices_items(ph, admin, meds)
    addr = j_pharmacy.patient_address(pat)
    reject_then_other_accepts(pat, accounts[0], accounts[1], meds, addr)
    round_timeout(admin, pat, accounts[0], meds, addr)
    offer_timeout(admin, pat, accounts[1], meds, addr)
    summary()
