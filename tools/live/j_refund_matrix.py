"""Journey: cancellation and refund, one block per service type (owner request 2026-11-02; refund policy 3.0,
docs/legal/05_CANCELLATION_REFUND.en.md and backend/src/modules/refund-policy/refund-policy.defaults.ts).

Per service: cancel before the deadline (full refund), after it (the policy's partial), a provider no-show (full refund plus the provider
deduction), and for pharmacy a COD order cancelled after dispatch. Every cell checks the three money views:
  1. the patient: refunded amount on the payment, and the refund document on the invoice (a credit note, or a refund receipt while the
     platform has no VAT number: this stack has none) with the same amount
  2. the provider ledger (GET /provider/ops/wallet/ledger): no earning for a service that was not delivered, a deduction only where one is due
  3. the platform: the commission and the VAT on it are reversed with the earning (nothing to reverse before delivery)
`python3 tools/live/j_refund_matrix.py [consultation|nursing|lab|radiology|pharmacy ...]` (all by default). Stack: see run_gate.sh.
"""
import sys, time, uuid
from lib import Client, journey, step, summary

POLICY = {'consultation': {'full_refund_min_hours': 2, 'late_refund_percent': 50, 'patient_no_show_percent': 0, 'free_reschedules': 1, 'free_reschedule_min_hours': 2},
          'home_visit': {'trip_fee_sar': 40, 'patient_absent_percent': 0}, 'pharmacy': {'refund_delivery_fee_before_dispatch': True}}
r2 = lambda x: round(float(x) + 1e-9, 2)
RESULT = {}  # cells that ran: {(service, case): True/False}


# ── the three money views ──────────────────────────────────────────────────────────────────────────────────────────────
def payment_of(pat, kind, bid, want_refunded=None):
    """The card payment of the booking, read back until the refund listener has run (refunded_amount == want_refunded)."""
    row = {}
    for _ in range(30):
        rows = pat.get(f'/payments/booking/{kind}/{bid}').items()
        row = rows[0] if rows else {}
        if not row and kind == 'pharmacy':
            # GET /payments/booking/pharmacy/:id reads the legacy orders collection and answers nothing for a governed pharmacy order (P2, listed in
            # the PR): the invoice carries the same figures
            inv = pat.get(f'/billing/invoice/{kind}/{bid}')
            if inv.ok:
                row = {'amount': inv.get('total') if not inv.get('credit_notes') else float(inv.get('total') or 0), 'refunded_amount': inv.get('refunded_total') or 0,
                       'status': {'paid': 'paid', 'partially_refunded': 'partially_refunded', 'refunded': 'refunded'}.get(inv.get('state'), inv.get('state'))}
        if want_refunded is None or r2(row.get('refunded_amount') or 0) == r2(want_refunded):
            break
        time.sleep(1)
    return row


def refund_docs(pat, kind, bid, want_total=None):
    """The patient's invoice/receipt and the refund documents on it (credit notes, or refund receipts without a VAT number)."""
    inv = {}
    for _ in range(20):
        inv = pat.get(f'/billing/invoice/{kind}/{bid}')
        notes = (inv.get('credit_notes') or []) if inv.ok else []
        if want_total is None or r2(sum(abs(float(n.get('total') or 0)) for n in notes)) == r2(want_total):
            break
        time.sleep(1)
    return inv


def provider_ledger(prov, ref, ready=None, tries=15, delay=1.0):
    """Ledger rows of this provider that belong to the booking (earnings, debits, payouts).
    The rows are written by event listeners just after the API answers (the cancellation answers first, the penalty row follows), so when the caller
    knows what it expects (`ready(rows)`), wait up to tries*delay seconds for it; the caller still asserts the exact value on what it gets."""
    rows = []
    for _ in range(tries if ready else 1):
        r = prov.get('/provider/ops/wallet/ledger?limit=200')
        rows = [x for x in ((r.get('transactions') or []) if r.ok else []) if ref in (x.get('ref_id'), x.get('order_id')) or str(x.get('ref_id', '')).endswith(ref)]
        if not ready or ready(rows):
            break
        time.sleep(delay)
    return rows


def check_money(service, case, pat, prov, kind, bid, paid, refund, deduction=0.0, earned=False):
    """The three views for one cell. `refund` = what the patient gets back, `deduction` = the provider penalty, `earned` = the service was delivered first."""
    journey(f'{service}: {case}')
    ok = True
    pay = payment_of(pat, kind, bid, refund if refund > 0 else None)
    got = r2(pay.get('refunded_amount') or 0)
    ok &= step(f'{service} / {case}: the patient is refunded {refund} of {paid}', got == r2(refund), pay)
    if refund > 0:
        state = 'refunded' if r2(refund) >= r2(paid) else 'partially_refunded'
        ok &= step(f'{service} / {case}: the payment says {state}', pay.get('status') == state, pay.get('status'))
    inv = refund_docs(pat, kind, bid, refund if refund > 0 else None)
    notes = (inv.get('credit_notes') or []) if inv.ok else []
    docsum = r2(sum(abs(float(n.get('total') or 0)) for n in notes))
    if refund > 0:
        ok &= step(f'{service} / {case}: the invoice carries the refund document for {refund} ({[n.get("invoice_no") for n in notes]})', inv.ok and docsum == r2(refund) and r2(inv.get('refunded_total') or 0) == r2(refund), inv)
        ok &= step(f'{service} / {case}: the invoice says {"refunded" if r2(refund) >= r2(paid) else "partially_refunded"}', inv.get('state') == ('refunded' if r2(refund) >= r2(paid) else 'partially_refunded'), inv.get('state'))
    else:
        ok &= step(f'{service} / {case}: no refund document when nothing is refunded', docsum == 0, notes)
    debit_total = lambda rs: r2(sum(float(x.get('amount') or 0) for x in rs if x.get('type') == 'provider_debit'))
    rows = provider_ledger(prov, bid, (lambda rs: debit_total(rs) == r2(deduction)) if (not earned and deduction) else None)
    earnings = [x for x in rows if x.get('type') == 'provider_earning']
    debits = [x for x in rows if x.get('type') == 'provider_debit']
    if not earned:
        ok &= step(f'{service} / {case}: no earning was credited for a service not delivered (so no commission and no VAT to reverse)', not earnings, earnings)
        pen = r2(sum(float(x.get('amount') or 0) for x in debits))
        ok &= step(f'{service} / {case}: provider deduction {deduction}', pen == r2(deduction), debits)
    RESULT[(service, case)] = bool(ok)
    return ok


# ── helpers shared by the service blocks ───────────────────────────────────────────────────────────────────────────────
def set_policy(admin, **over):
    pol = {k: dict(v) for k, v in POLICY.items()}
    for k, v in over.items():
        pol[k].update(v)
    r = admin.req('PUT', '/admin/admin/refund-policy', pol)
    step(f'refund policy set ({over or "defaults"})', r.ok, r)


def main(only):
    import j_admin
    admin, _ = j_admin.login()
    try:
        if not only or 'consultation' in only:
            consultation(admin)
        if not only or 'nursing' in only:
            nursing(admin)
        if not only or 'lab' in only:
            lab(admin)
        if not only or 'radiology' in only:
            radiology(admin)
        if not only or 'pharmacy' in only:
            pharmacy(admin)
    finally:
        set_policy(admin)
    summary()


def consultation(admin):
    import j_accounts, j_onboarding, j_consultation
    from datetime import timedelta
    p = j_onboarding.register_type('doctor', {'specialty': (Client(None, 'anon').get('/catalogs/specialties').items() or [{'code': 'cardiology'}])[0].get('code') or 'cardiology',
                                              'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'video']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, service_types=('clinic', 'video'))
    did = doc.get('/provider-onboarding/my-profile').get('id')
    pat = Client(j_accounts.app_signup(label='refund-consult')['token'], 'patient')
    j_consultation.accept_telehealth_consent(pat)
    day = j_consultation.tomorrow().isoformat()
    used = []

    def book(stype, idx):
        r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type={stype}')
        slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
        free = [s.get('start') or s.get('slot_start') for s in slots if isinstance(s, dict) and s.get('available', True)]
        free = [s for s in free if s not in used]
        slot = free[idx * 2] if len(free) > idx * 2 else (free[-1] if free else None)
        if not slot:
            step(f'{stype}: a free slot', False, 'none')
            return None, 0
        used.append(slot)
        lock = pat.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot}).get('id')
        r = pat.post('/care/appointments', {'doctor_id': did, 'service_type': stype, 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock},
                     headers={'Idempotency-Key': f'appointment-create-{did}-{slot}-{uuid.uuid4()}'})
        aid = r.get('id')
        step(f'{stype}: booked', r.ok and aid, r)
        if not aid or not j_consultation.pay_card(pat, aid):
            return None, 0
        paid = float(payment_of(pat, 'consultation', aid).get('amount') or 0)
        step(f'{stype}: paid {paid}', paid > 0, paid)
        return aid, paid

    for i, stype in enumerate(('clinic', 'video')):
        # before the deadline: the slot is tomorrow, far more than 2 h away
        aid, paid = book(stype, i * 3)
        if aid:
            r = pat.post(f'/unified-bookings/consultation/{aid}/cancel', {'reason': 'qa: before the deadline'}, headers={'Idempotency-Key': str(uuid.uuid4())})
            step(f'{stype}: the patient cancels before the deadline', r.ok, r)
            check_money(f'consultation {stype}', 'cancel before the deadline = 100%', pat, doc, 'consultation', aid, paid, r2(paid))
        # after the deadline: the same cancel with the admin's window widened to 1000 h, so tomorrow's slot is "less than the window away"
        aid, paid = book(stype, i * 3 + 1)
        if aid:
            set_policy(admin, consultation={'full_refund_min_hours': 1000})
            r = pat.post(f'/unified-bookings/consultation/{aid}/cancel', {'reason': 'qa: after the deadline'}, headers={'Idempotency-Key': str(uuid.uuid4())})
            set_policy(admin)
            step(f'{stype}: the patient cancels after the deadline', r.ok, r)
            check_money(f'consultation {stype}', 'cancel after the deadline = 50%', pat, doc, 'consultation', aid, paid, r2(paid * 0.5))
        # provider no-show: the doctor cancels (a reason is required): 100% to the card and the doctor's deduction of 50 SAR
        aid, paid = book(stype, i * 3 + 2)
        if aid:
            r = doc.req('PATCH', f'/care/appointments/{aid}/cancel', {'reason': 'provider_no_show: الطبيب لم يحضر'})
            step(f'{stype}: the doctor cancels / does not attend', r.ok, r)
            check_money(f'consultation {stype}', 'provider no-show = 100% + deduction 50', pat, doc, 'consultation', aid, paid, r2(paid), deduction=50.0)

    # a refund AFTER the service was delivered (the earning is credited): the platform's commission and the VAT on it are reversed with the provider's net
    journey('consultation: refund after the visit (admin, 50%): provider clawback and the platform commission and VAT reversed')
    aid, paid = book('clinic', 8)
    if aid:
        r = doc.get('/provider/jobs/queue?status=incoming&kind=consultation')
        if aid in [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]:
            step('doctor accepts', doc.post(f'/provider/jobs/consultation/{aid}/accept', {}).ok)
        for action in ('check-in', 'start'):
            step(f'appointment {action}', doc.req('PATCH', f'/care/appointments/{aid}/{action}', {}).ok)
        step('doctor finishes the visit', doc.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'متابعة', 'notes': 'راحة', 'recommendations': 'مراجعة'}).ok)
        earning = {}
        for _ in range(15):
            rows = [x for x in provider_ledger(doc, aid) if x.get('type') == 'provider_earning']
            if rows:
                earning = rows[0]
                break
            time.sleep(1)
        step('the earning is credited (gross, commission, VAT on the commission, net)', earning and r2(earning.get('commission')) + r2(earning.get('vat')) + r2(earning.get('amount')) == r2(earning.get('gross')), earning)
        gross, com, vat, net = (float(earning.get(k) or 0) for k in ('gross', 'commission', 'vat', 'amount'))
        step('VAT is on the commission only: 15% of the commission', r2(vat) == r2(com * 0.15), earning)
        summary_before = admin.get('/admin/admin/finance-engine/reports/summary?period=daily')
        half = r2(paid / 2)
        r = admin.post(f'/admin/admin/orders/consultation/{aid}/refund', {'mode': 'partial', 'amount': half, 'reason': 'qa: refund after the visit, half of the price', 'override_reason': 'qa: the visit was delivered; the admin refunds half'})
        step(f'the admin refunds {half} of {paid}', r.ok, r)
        pay = payment_of(pat, 'consultation', aid, half)
        step('the patient is refunded half to the card', r2(pay.get('refunded_amount') or 0) == half and pay.get('status') == 'partially_refunded', {k: pay.get(k) for k in ('amount', 'refunded_amount', 'status')})
        inv = refund_docs(pat, 'consultation', aid, half)
        step('the invoice carries the refund document for the half', inv.ok and r2(inv.get('refunded_total') or 0) == half and inv.get('state') == 'partially_refunded', inv)
        frac = half / paid if paid else 0  # the share of what the patient paid (the earning's gross is only the provider's own lines)
        debits = [x for x in provider_ledger(doc, aid) if x.get('type') == 'provider_debit']
        step(f'the provider is debited its net share ({r2(net * frac)})', r2(sum(float(x.get('amount') or 0) for x in debits)) == r2(net * frac), debits)
        summary_after = admin.get('/admin/admin/finance-engine/reports/summary?period=daily')
        dcom = r2(float(summary_before.get('commission') or 0) - float(summary_after.get('commission') or 0))
        dvat = r2(float(summary_before.get('vat_on_commission') or 0) - float(summary_after.get('vat_on_commission') or 0))
        step(f'the platform reverses its commission share ({r2(com * frac)}) in the finance report', dcom == r2(com * frac), (dcom, summary_before.get('commission'), summary_after.get('commission')))
        step(f'and the VAT on it ({r2(vat * frac)})', dvat == r2(vat * frac), (dvat, summary_before.get('vat_on_commission'), summary_after.get('vat_on_commission')))
        step('net share + commission share + VAT share = the provider\'s own lines of the refund (the rest is the platform\'s own fee)',
             abs(net * frac + com * frac + vat * frac - gross * frac) < 0.011 and gross * frac <= half + 0.001, (net * frac, com * frac, vat * frac, gross * frac, half))


def nursing(admin):
    import j_accounts, j_onboarding
    from j_nursing import admin_publishes_nursing, card_payment
    from j_lab import tomorrow_at
    admin_publishes_nursing(admin)
    catalog = Client(None, 'anon').get('/nursing/catalog')
    services = [{'key': x['id'], 'name_ar': x.get('name_ar'), 'price': x.get('price') or 50} for x in (catalog.body if isinstance(catalog.body, list) else catalog.items())]
    p = j_onboarding.register_type('home_care', {'nursing_services': services})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    nurse = Client(p['token'], 'nurse')
    nurse_id = nurse.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='refund-nursing')['token'], 'patient')
    pat.post('/users/me/addresses', {'label': 'المنزل', 'street': 'شارع الملك فهد 3', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001, 'is_default': True})
    svc = (pat.get('/home-care/services').items() or [{}])[0]
    addr = {'address': 'شارع الملك فهد 3، الرياض', 'city': 'الرياض', 'lat': 24.7001, 'lng': 46.7001}

    def book(hour, accept=True, transit=False):
        r = pat.post('/nursing/bookings', {'provider_id': nurse_id, 'service_id': svc.get('id'), 'service_name_ar': svc.get('name_ar'), 'scheduled_at': tomorrow_at(hour), 'address': addr, 'payment_method': 'card'})
        bid = r.get('id')
        step(f'nursing: booked ({hour}h)', r.ok and bid, r)
        if not bid:
            return None, 0
        txn = card_payment(pat, 'nursing', bid)
        paid = float((txn or {}).get('amount') or 0)
        step(f'nursing: paid {paid}', paid > 0, txn)
        if accept:
            step('nursing: the nurse accepts', nurse.post(f'/provider/jobs/nursing/{bid}/accept', {}).ok)
        if transit:
            step('nursing: the nurse is on the way', nurse.post(f'/nursing/visits/{bid}/transit', {}).ok)
        return bid, paid

    trip = POLICY['home_visit']['trip_fee_sar']
    bid, paid = book(9)
    if bid:
        r = pat.post(f'/nursing/bookings/{bid}/cancel', {})
        step('nursing: the patient cancels before the nurse sets off', r.ok, r)
        check_money('nursing', 'cancel before the nurse sets off = 100%', pat, nurse, 'nursing', bid, paid, r2(paid))
    bid, paid = book(11, transit=True)
    if bid:
        r = pat.post(f'/nursing/bookings/{bid}/cancel', {})
        step('nursing: the patient cancels after the nurse set off', r.ok, r)
        check_money('nursing', f'cancel after the nurse set off = 100% minus the trip fee {trip}', pat, nurse, 'nursing', bid, paid, r2(max(0, paid - trip)))
    bid, paid = book(13, transit=True)
    if bid:
        r = nurse.post(f'/provider/jobs/nursing/{bid}/reject', {'reason': 'provider_no_show: الممرضة لم تحضر'})
        step('nursing: the nurse cancels / does not attend', r.ok, r)
        check_money('nursing', 'provider no-show = 100%', pat, nurse, 'nursing', bid, paid, r2(paid))


def lab(admin):
    import j_accounts, j_onboarding, j_lab
    from j_nursing import card_payment
    j_lab.admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    prov = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, prov)
    j_onboarding.provider_after_approval(prov)
    labc = Client(prov['token'], 'lab')
    lab_id = labc.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='refund-lab')['token'], 'patient')
    trip = POLICY['home_visit']['trip_fee_sar']

    def book(offset, hour, transit=False):
        bid, _ = j_lab.patient_books(pat, lab_id, location='home', method='card', offset=offset, hour=hour)
        if not bid:
            return None, 0
        paid = float((card_payment(pat, 'lab', bid) or {}).get('amount') or 0)
        step(f'lab: paid {paid}', paid > 0, paid)
        if transit:
            step('lab: the collector is on the way', labc.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'IN_TRANSIT', 'note': 'on_the_way'}).ok)
        return bid, paid

    bid, paid = book(0, 9)
    if bid:
        step('lab: the patient cancels before the collector sets off', pat.post(f'/labs/bookings/{bid}/cancel', {}).ok)
        check_money('lab home draw', 'cancel before the collector sets off = 100%', pat, labc, 'lab', bid, paid, r2(paid))
    bid, paid = book(1, 10, transit=True)
    if bid:
        step('lab: the patient cancels after the collector set off', pat.post(f'/labs/bookings/{bid}/cancel', {}).ok)
        check_money('lab home draw', f'cancel after the collector set off = 100% minus the trip fee {trip}', pat, labc, 'lab', bid, paid, r2(max(0, paid - trip)))
    bid, paid = book(2, 11, transit=True)
    if bid:
        r = labc.req('PATCH', f'/labs/bookings/{bid}/state', {'state': 'CANCELLED', 'note': 'provider_no_show: المندوب لم يصل'})
        step('lab: the lab cancels / does not attend after setting off', r.ok, r)
        check_money('lab home draw', 'provider no-show after set off = 100% (the trip fee is the provider\'s cost)', pat, labc, 'lab', bid, paid, r2(paid))
    bid, paid = book(3, 12)
    if bid:
        r = labc.post(f'/provider/jobs/lab/{bid}/reject', {'reason': 'provider_no_show: المختبر مغلق'})
        step('lab: the lab rejects through the generic provider action', r.ok, r)
        check_money('lab home draw', 'provider cancel through /provider/jobs = 100%', pat, labc, 'lab', bid, paid, r2(paid))


def radiology(admin):
    import j_accounts, j_onboarding, j_radiology
    from j_nursing import card_payment
    from j_lab import tomorrow_at
    j_radiology.admin_publishes_scans(admin)
    scans = Client(None, 'anon').get('/radiology/services').items()
    p = j_onboarding.register_type('radiology', {'equipment_list': [x['id'] for x in scans]})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    center = Client(p['token'], 'radiology')
    center_id = center.get('/provider/me').get('account', 'id')
    pat = Client(j_accounts.app_signup(label='refund-radiology')['token'], 'patient')

    def book(hour):
        r = pat.post('/radiology/bookings', {'service_id': scans[-1]['id'], 'scheduled_at': tomorrow_at(hour), 'location_type': 'facility', 'payment_method': 'card', 'provider_account_id': center_id})
        bid = r.get('id')
        step(f'radiology: booked ({hour}h)', r.ok and bid, r)
        if not bid:
            return None, 0
        paid = float((card_payment(pat, 'radiology', bid) or {}).get('amount') or 0)
        step(f'radiology: paid {paid}', paid > 0, paid)
        return bid, paid

    bid, paid = book(9)
    if bid:
        step('radiology: the patient cancels before the scan', pat.post(f'/radiology/bookings/{bid}/cancel', {}).ok)
        check_money('radiology', 'cancel before the scan = 100%', pat, center, 'radiology', bid, paid, r2(paid))
    bid, paid = book(10)
    if bid:
        r = center.req('PATCH', f'/radiology/bookings/{bid}/state', {'state': 'CANCELLED', 'note': 'provider_no_show: الجهاز تحت الصيانة'})
        step('radiology: the centre cancels / does not attend', r.ok, r)
        check_money('radiology', 'provider no-show = 100%', pat, center, 'radiology', bid, paid, r2(paid))
    bid, paid = book(11)
    if bid:
        r = center.post(f'/provider/jobs/radiology/{bid}/reject', {'reason': 'provider_no_show: المركز مغلق'})
        step('radiology: the centre rejects through the generic provider action', r.ok, r)
        check_money('radiology', 'provider cancel through /provider/jobs = 100%', pat, center, 'radiology', bid, paid, r2(paid))


def pharmacy(admin):
    """Pharmacy orders with PLATFORM delivery (the only mode an offer is written with today; pharmacy_own is covered by
    pharmacy-settlement-delivery.spec.ts until the pharmacy side sets it). The delivery fee is the platform's: set to 15 SAR here."""
    import j_accounts, j_onboarding, j_pharmacy
    step('cash on delivery allowed up to 1000 SAR', admin.put('/admin/admin/payment-rules', {'pharmacy_cod_max_sar': 1000}).ok)
    r = admin.post('/admin/business-rules/config/fees', {'delivery_fee': 15, 'reason': 'qa: delivery fee for the refund journey'})
    step('platform delivery fee set to 15', r.ok, r)
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pharm = Client(p['token'], 'pharmacy')
    meds = j_pharmacy.admin_adds_medicines(admin)
    j_pharmacy.pharmacy_prices_items(pharm, admin, meds)
    pharm.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)

    def patient(label):
        pat = Client(j_accounts.app_signup(label=label)['token'], 'patient')
        return pat, j_pharmacy.patient_address(pat)

    def order(pat, addr):
        oid, alloc = j_pharmacy.open_order(pat, pharm, meds, addr)
        step('pharmacy: the order is allocated to the pharmacy', alloc, oid)
        o = pat.get(f'/patient/pharmacy/orders/{oid}')
        od = o.body.get('data', o.body) if isinstance(o.body, dict) else {}
        totals = (od.get('pricing_snapshot') or {}).get('totals') or od.get('totals') or {}
        paid = float(payment_of(pat, 'pharmacy', oid).get('amount') or 0)
        return oid, alloc, float(totals.get('total') or 0), float(totals.get('delivery_fee') or 0), paid, od

    def advance(aid, upto):
        for action in ('confirm', 'preparing', 'ready', 'out-for-delivery'):
            body = {'courier_name': 'مندوب', 'courier_phone': '+966500000555'} if action == 'out-for-delivery' else {}
            for _ in range(15):
                r = pharm.post(f'/provider/pharmacy/allocations/{aid}/{action}', body)
                if r.ok or 'payment_confirmation_required' not in str(r.body):
                    break
                time.sleep(1)
            step(f'pharmacy: {action}', r.ok, r)
            if action == upto:
                break

    # A. paid by card, cancelled by the patient before the pharmacy starts preparing (owner decision 2026-11-10): 100% including the delivery fee
    pat, addr = patient('refund-pharmacy-a')
    oid, alloc, total, fee, paid, _ = order(pat, addr)
    step(f'pharmacy: paid {paid} of which delivery fee {fee}', paid > 0 and fee == 15, (paid, fee))
    if alloc:
        advance(alloc['id'], 'confirm')
        step('pharmacy: the patient cancels before preparation', pat.post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'patient_requested'}, headers={'Idempotency-Key': str(uuid.uuid4())}).ok)
        check_money('pharmacy platform delivery', 'patient cancel before preparation = 100% incl. the delivery fee', pat, pharm, 'pharmacy', oid, paid, r2(paid))
    # B. once the pharmacy is preparing the patient can no longer cancel (400 cancel_not_allowed_after_preparation); nothing moves, at preparing or out for delivery
    pat, addr = patient('refund-pharmacy-b')
    oid, alloc, total, fee, paid, _ = order(pat, addr)
    if alloc:
        advance(alloc['id'], 'preparing')
        r = pat.post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'patient_requested'}, headers={'Idempotency-Key': str(uuid.uuid4())})
        step('pharmacy: the patient cannot cancel while it is being prepared (cancel_not_allowed_after_preparation)', r.status == 400 and 'cancel_not_allowed_after_preparation' in str(r.body), r)
        for action in ('ready', 'out-for-delivery'):
            body = {'courier_name': 'مندوب', 'courier_phone': '+966500000555'} if action == 'out-for-delivery' else {}
            step(f'pharmacy: {action}', pharm.post(f'/provider/pharmacy/allocations/{alloc["id"]}/{action}', body).ok)
        r = pat.post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'patient_requested'}, headers={'Idempotency-Key': str(uuid.uuid4())})
        step('pharmacy: nor once it is out for delivery', r.status == 400 and 'cancel_not_allowed_after_preparation' in str(r.body), r)
        check_money('pharmacy platform delivery', 'refused patient cancel after preparation = nothing refunded', pat, pharm, 'pharmacy', oid, paid, 0.0)
    # C. the pharmacy cancels (does not attend): 100%
    pat, addr = patient('refund-pharmacy-c')
    oid, alloc, total, fee, paid, _ = order(pat, addr)
    if alloc:
        advance(alloc['id'], 'preparing')
        r = pharm.post(f"/provider/pharmacy/allocations/{alloc['id']}/cancel", {'reason': 'provider_no_show: الصيدلية لا تستطيع التنفيذ'})
        step('pharmacy: the pharmacy cancels', r.ok, r)
        check_money('pharmacy platform delivery', 'provider cancels = 100%', pat, pharm, 'pharmacy', oid, paid, r2(paid))
    # D. cash on delivery cancelled before preparation: no cash was taken, so nothing to refund; the delivery fee is not collectable
    pat, addr = patient('refund-pharmacy-d')
    oid, alloc, *_ = order(pat, addr)  # the first order is card (D-25); deliver it so the next one may be COD
    if alloc:
        advance(alloc['id'], 'out-for-delivery')
        step('pharmacy: the first order is delivered', pharm.post(f"/provider/pharmacy/allocations/{alloc['id']}/delivered", {}).ok)
        # returns after delivery (owner decision 2026-11-10): only a wrong / damaged / expired item, with a photo, and an admin reviews it
        import j_returns
        r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'changed my mind', 'reason_code': 'changed_mind', 'orderId': oid, 'refundMethod': 'original'})
        step('pharmacy: a change-of-mind return is refused (pharmacy_return_needs_a_defect_reason)', r.status == 400 and 'pharmacy_return_needs_a_defect_reason' in str(r.body), r)
        r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'damaged', 'reason_code': 'damaged', 'orderId': oid, 'refundMethod': 'original'})
        step('pharmacy: a damaged-item return without a photo is refused (photo_evidence_required)', r.status == 400 and 'photo_evidence_required' in str(r.body), r)
        evidence = j_returns.upload_evidence(pat)
        r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'damaged', 'reason_code': 'damaged', 'orderId': oid, 'refundMethod': 'original', 'attachedDocs': [evidence] if evidence else []})
        step('pharmacy: a damaged-item return with a photo is filed and waits for the admin review', r.ok and bool(r.get('id')) and str(r.get('status')).lower() == 'processing', {k: r.get(k) for k in ('id', 'status')})
        oid2, alloc2 = j_pharmacy.open_order(pat, pharm, meds, addr)
        o2 = pat.get(f'/patient/pharmacy/orders/{oid2}')
        od2 = o2.body.get('data', o2.body) if isinstance(o2.body, dict) else {}
        step('pharmacy: the second order is cash on delivery', str(od2.get('payment_method')).lower() in ('cod', 'cash', 'cash_on_delivery'), od2.get('payment_method'))
        if alloc2:
            # the patient can only cancel before preparation now (owner decision 2026-11-10); the refusal after dispatch is asserted in case B
            advance(alloc2['id'], 'confirm')
            step('pharmacy: the patient cancels the COD order before preparation', pat.post(f'/patient/pharmacy/orders/{oid2}/cancel', {'reason': 'patient_requested'}, headers={'Idempotency-Key': str(uuid.uuid4())}).ok)
            time.sleep(3)
            check_money('pharmacy platform delivery', 'COD cancelled before preparation = nothing collected, nothing refunded', pat, pharm, 'pharmacy', oid2, 0, 0.0)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
