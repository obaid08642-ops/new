"""Journey: insurance, patient-app insurance/* (add-policy, hub, coverage-check, benefits-summary, submit-claim, claim-tracking,
payment-split, copay) -> consultation booked on insurance (BookingConfirmForm) -> doctor decides (InsuranceRequestsScreen)
-> patient pays the copay (card) or accepts self-pay after a rejection."""
import uuid
from lib import Client, journey, step
from j_nursing import fake_pay

PATIENT_GETS = ['/insurance/companies', '/insurance/my-policy', '/insurance/benefits-summary', '/insurance/requests/my',
                '/insurance/claims', '/users/me/insurance', '/users/me/profile', '/refunds/my']


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def poll(look, tries=12, delay=1.0):
    """Notifications and the booking projection are written by events just after the call answers, so poll."""
    import time
    for _ in range(tries):
        found = look()
        if found:
            return found
        time.sleep(delay)
    return None


def patient_told(pat, rid):
    """notifications.service onInsuranceDecided: the patient's note opens the insurance request."""
    def look():
        r = pat.get('/notifications?lang=en')
        return [n for n in rows(r) if isinstance(n, dict) and isinstance(n.get('action'), dict) and n['action'].get('route') == f'/insurance/requests/{rid}']
    return poll(look)


def provider_told(provider, rid, title_en):
    """The provider bell (GET /provider/notifications) holds a note about the request with this English title."""
    def look():
        r = provider.get('/provider/notifications?limit=100')
        items = r.get('items') if isinstance(r.body, dict) else []
        return [n for n in (items or []) if n.get('related_id') == rid and n.get('title_en') == title_en]
    return poll(look)


def accept_insurance(provider, company, classes=('A',)):
    """D-30: a provider records the company AND classes it contracts (provider-app availability); an order or booking
    on insurance reaches only providers contracted for the patient's company and class."""
    r = provider.patch('/provider/profile/availability', {'accepted_insurance': [{'company_id': company.get('id'), 'classes': list(classes), 'active': True}]})
    step('the provider records its insurance contract (company and class)', r.ok, r)


def pay_request(pat, rid, label):
    """Copay or full self-pay of an insurance request by card (payment-split -> hosted checkout -> verify)."""
    r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-insurance-{rid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step(f'{label}: checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if not txn.get('gateway_intent_id'):
        return False
    fake_pay(txn['gateway_intent_id'])
    r = pat.post(f"/payments/verify/{txn['id']}", {})
    step(f'{label}: paid', r.ok and r.get('status') == 'paid', r)
    return bool(r.ok and r.get('status') == 'paid')


def engine_flow(pat, provider, kind, bid, decision, continues, label):
    """19.11 for one booking of any service: the provider receives the request (and is notified), decides it on its own
    system's outcome, the patient is notified, pays the copay (or the full price after a rejection), the provider is
    notified, and the service continues. `continues()` is true once the booking shows it can go on."""
    journey(f'insurance: {label} on insurance ({decision})')
    r = pat.post('/insurance/requests', {'booking_kind': kind, 'booking_id': bid})
    rid = r.get('id')
    step(f'{label}: the insurance request is open', r.ok and rid, r)
    if not rid:
        return None
    r = provider.get('/insurance/requests/provider/queue')
    step(f'{label}: the request reaches the provider with the patient\'s insurance details', r.ok and rid in str(r.body), r)
    step(f'{label}: the provider is notified of the new request', bool(provider_told(provider, rid, 'New insurance request to review')), rid)
    body = {'decision': decision}
    if decision in ('approve_full', 'approve_partial'):
        body['approval_ref'] = f'APR-{rid[:8]}'  # D-37: the insurer's approval number from the provider's own system
    if decision == 'approve_partial':
        body['copay_percent'] = 20
    if decision == 'reject':
        body['reason'] = 'الخدمة غير مشمولة في فئة الوثيقة'
    r = provider.post(f'/insurance/requests/{rid}/decide', body)
    step(f'{label}: provider enters the outcome ({decision})', r.ok, r)
    step(f'{label}: the patient is notified of the outcome', bool(patient_told(pat, rid)), rid)
    if decision == 'approve_full':
        r = pat.get(f'/insurance/requests/{rid}')
        step(f'{label}: nothing is owed (APPROVED_FULL, copay 0)', r.ok and r.get('state') == 'APPROVED_FULL' and not r.get('copay_amount'), r)
        step(f'{label}: the provider is told the insurer covers it in full', bool(provider_told(provider, rid, 'Insurance covers the service in full')), rid)
    else:
        if decision == 'reject':
            r = pat.post(f'/insurance/requests/{rid}/accept-self-pay', {}, headers={'Idempotency-Key': f'insurance-self-pay-{rid}-{uuid.uuid4()}'})
            step(f'{label}: the patient accepts to pay in full after the rejection', r.ok and r.get('state') == 'COPAY_PENDING' and r.get('copay_percent') == 100, r)
        step(f'{label}: the patient pays', pay_request(pat, rid, label), rid)
        paid = poll(lambda: pat.get(f'/insurance/requests/{rid}').get('state') == 'COPAY_PAID')
        step(f'{label}: the request shows the payment settled', bool(paid), rid)
        step(f'{label}: the provider is notified that the patient paid', bool(provider_told(provider, rid, 'The patient paid the copay')), rid)
    step(f'{label}: the service continues', bool(poll(continues)), rid)
    return rid


def admin_adds_company(admin):
    journey('insurance: admin adds a company (insurance-companies.tsx)')
    code = f'ins{uuid.uuid4().hex[:5]}'
    r = admin.post('/insurance/companies', {'code': code, 'name_ar': f'تأمين {code}', 'name_en': f'Insure {code}'})
    step('admin creates the company', r.ok, r)
    r = admin.get('/insurance/companies/all')
    c = next((x for x in rows(r) if x.get('code') == code), {})
    step('admin list shows it', r.ok and c, r)
    if c and not c.get('is_active'):
        r = admin.patch(f"/insurance/companies/{c.get('id') or c.get('_id')}", {'is_active': True})
        step('admin activates it', r.ok, r)
    return code


def add_policy(pat, code=None):
    journey('insurance: patient adds a policy (add-policy.tsx)')
    r = pat.get('/insurance/companies')
    comps = rows(r)
    step('insurance companies load', r.ok and comps, r)
    comps = [x for x in comps if x.get('code') == code] or comps
    step('the company the admin just activated is listed', any(x.get('code') == code for x in comps), r)
    if not comps:
        return None
    c = comps[0]
    # add-policy.tsx sends company_id: compObj.code and provider: the localized name
    r = pat.post('/insurance/save-policy', {'provider': c.get('name_ar') or c.get('name_en') or c.get('code'), 'company_id': c.get('code'),
                                            'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}', 'expiry_date': '2027-12-31',
                                            'member_name': 'مريض تأمين', 'national_id': '1098765432', 'verified': False, 'ocr_extracted': False})
    step('save-policy with the add-policy payload', r.ok, r)
    r = pat.get('/insurance/my-policy')
    pol = r.get('policy') or {}
    step('my policy is saved', r.ok and r.get('has_policy'), r)
    step('policy keeps expiry and national id from the form', pol.get('expiry_date') and pol.get('national_id'), pol)
    step('the client cannot mark its own policy verified', not pol.get('verified'), pol)
    r = pat.get('/users/me/profile')
    step('profile.insurance is what BookingConfirmForm reads', r.ok and (r.get('insurance') or {}).get('policy_number'), r)
    r = pat.get('/users/me/insurance')
    step('hub shows the policy', r.ok and 'POL-' in str(r.body), r)
    r = pat.get('/insurance/coverage-check?service_type=consultation')
    step('coverage-check answers for the policy', r.ok and r.get('eligible'), r)
    return c


def claims(pat, booking_kind=None, booking_id=None):
    journey('insurance: submit-claim -> claim-tracking')
    if booking_kind and booking_id:
        r = pat.post('/insurance/claims/submit', {'booking_kind': booking_kind, 'booking_id': booking_id,
                                                  'claim_type': 'reimbursement', 'note': 'live claim'})
        cid = r.get('claim_id') or r.get('id')
        step('submit a reimbursement claim for a paid booking', r.ok and cid, r)
        r = pat.get('/insurance/claims')
        step('claim-tracking lists the submitted claim', r.ok and cid and cid in str(r.body), r)
    else:
        r = pat.get('/insurance/claims')
        step('claims list loads', r.ok, r)


def insured_consultation(pat, doctor, decision='approve_partial'):
    import j_consultation
    journey(f'insurance: consultation booked on insurance ({decision})')
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    day = j_consultation.tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{prof_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('a free clinic slot', r.ok and free, r)
    if not free:
        return None
    s0 = free[-1] if decision == 'reject' else free[0]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0
    ins = pat.get('/users/me/profile').get('insurance') or {}
    r = pat.post('/slot-locks/reserve', {'provider_id': prof_id, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    r = pat.post('/care/appointments', {'doctor_id': prof_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'insurance',
                                        'insurance_provider': ins.get('provider_id') or ins.get('company_id'),
                                        'insurance_member_id': ins.get('policy_number') or ins.get('member_id'), 'slot_lock_id': lock},
                 headers={'Idempotency-Key': f'appointment-create-{prof_id}-{slot}-{uuid.uuid4()}'})
    aid, rid = r.get('id'), r.get('insurance_request_id')
    step('appointment created with an insurance review request', r.ok and aid and rid, r)
    if not rid:
        return None
    r = pat.get(f'/insurance/requests/{rid}')
    step('payment-split opens the request (pending review)', r.ok, r)
    r = doctor.get('/insurance/requests/provider/queue')
    step('the request reaches the doctor (InsuranceRequestsScreen)', r.ok and rid in str(r.body), r)
    body = {'decision': decision}
    if decision in ('approve_full', 'approve_partial'):
        body['approval_ref'] = f'APR-{rid[:8]}'  # D-37: the insurer's approval number, from the provider's system
    if decision == 'approve_partial':
        body['copay_percent'] = 20
    if decision == 'reject':
        body['reason'] = 'الخدمة غير مشمولة في فئة الوثيقة'
    r = doctor.post(f'/insurance/requests/{rid}/decide', body)
    step(f'doctor decides: {decision}', r.ok, r)
    r = pat.get(f'/insurance/requests/{rid}')
    req = r.body if isinstance(r.body, dict) else {}
    step('patient sees the decision', r.ok and req.get('state') not in (None, 'PENDING', 'pending'), r)
    step('the doctor is notified of the new request', bool(provider_told(doctor, rid, 'New insurance request to review')), rid)
    step('the patient is notified of the decision', bool(patient_told(pat, rid)), rid)
    if decision == 'approve_full':
        step('full approval: nothing is owed', req.get('state') == 'APPROVED_FULL' and not req.get('copay_amount'), req)
        step('the doctor is told the insurer covers it in full', bool(provider_told(doctor, rid, 'Insurance covers the service in full')), rid)
        r = pat.get(f'/care/appointments/{aid}')
        step('full approval: the appointment continues (CONFIRMED) without a payment', r.ok and str(r.get('status')).upper() == 'CONFIRMED', r)
        return aid, rid
    kind = 'copay' if decision == 'approve_partial' else 'self-pay'
    if decision == 'reject':
        r = pat.post(f'/insurance/requests/{rid}/accept-self-pay', {}, headers={'Idempotency-Key': f'insurance-self-pay-{rid}-{uuid.uuid4()}'})
        step('patient accepts to pay in full (server: COPAY_PENDING at 100%)', r.ok and r.get('state') == 'COPAY_PENDING' and r.get('copay_percent') == 100, r)
    caps = f'/insurance/requests/{rid}/capabilities' if kind == 'copay' else f'/insurance/requests/{rid}/self-pay-capabilities'  # payment-split.tsx
    r = pat.get(caps)
    step(f'{kind}: card is offered', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)
    r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-insurance-{rid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step(f'{kind}: checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = pat.post(f"/payments/verify/{txn['id']}", {})
        step(f'{kind}: paid', r.ok and r.get('status') == 'paid', r)
    # Copay settlement is event-driven (payment.completed → engine), so poll.
    import time as _time2
    paid_state = None
    for _ in range(10):
        r = pat.get(f'/insurance/requests/{rid}')
        paid_state = r.get('state')
        if paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'):
            break
        _time2.sleep(1.5)
    step(f'request shows {kind} paid', paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'), paid_state)
    step('the doctor is notified that the patient paid', bool(provider_told(doctor, rid, 'The patient paid the copay')), rid)
    r = pat.get(f'/care/appointments/{aid}')
    step('appointment confirmed once paid', r.ok and str(r.get('status')).upper() == 'CONFIRMED', r)
    return aid, rid


def insured_lab(pat, lab, other_lab, location='facility'):
    import j_lab
    journey(f'insurance: lab booking on insurance ({location}) (insurance-upload -> lab decides -> insurance-approval)')
    lab_id = lab.get('/provider/me').get('account', 'id')
    docs = j_lab.home_insurance_proof() if location == 'home' else None
    bid, picks = j_lab.patient_books(pat, lab_id, location, 'insurance', documents=docs, offset=6,
                                     hour=13 if location == 'home' else 10)
    if not bid:
        return
    r = other_lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'approved', 'totalCopay': 0, 'items': []})
    step('another lab cannot decide this booking\'s insurance', r.status in (403, 404), r)
    items = [{'service_id': p['id'], 'isCovered': i == 0, 'rejectReason': None if i == 0 else 'غير مشمول', 'cashPrice': p.get('price')} for i, p in enumerate(picks)]
    r = lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'partial_approval', 'totalCopay': 20, 'items': items, 'approval_ref': f'APR-{bid[:8]}'})
    step('the assigned lab records a partial approval', r.ok and r.get('insurance_status') == 'partial_approval', r)
    rid = r.get('insurance_request_id')
    r = pat.get(f'/labs/bookings/{bid}')
    step('insurance-approval shows covered/uncovered items', r.ok and r.get('insurance_status') == 'partial_approval', r)
    rid = rid or r.get('insurance_request_id')
    step('the booking links to the insurance request engine', bool(rid), r)
    if len(picks) > 1:
        r = pat.patch(f"/labs/bookings/{bid}/items/{picks[1]['id']}/opt-in-cash", {'optInCash': True})
        step('patient opts to pay cash for the uncovered test', r.ok, r)
    if rid:
        r = pat.get(f'/insurance/requests/{rid}')
        step('the lab decision is a real insurance request (COPAY_PENDING)', r.ok and r.get('state') == 'COPAY_PENDING', r)
        r = pat.get(f'/insurance/requests/{rid}/capabilities')
        step('copay: card is offered', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)
        r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-insurance-{rid}-{uuid.uuid4()}'})
        txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
        step('copay: checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
        if txn.get('gateway_intent_id'):
            fake_pay(txn['gateway_intent_id'])
            r = pat.post(f"/payments/verify/{txn['id']}", {})
            step('copay: paid', r.ok and r.get('status') == 'paid', r)
        # Copay settlement is event-driven (payment.completed → engine), so poll.
        import time as _time
        req_state, booking_state = None, None
        for _ in range(10):
            r = pat.get(f'/insurance/requests/{rid}')
            req_state = r.get('state')
            b = pat.get(f'/labs/bookings/{bid}')
            booking_state = str(b.get('state')).upper()
            if req_state == 'COPAY_PAID' and booking_state == 'CONFIRMED':
                break
            _time.sleep(1.5)
        step('request shows the copay paid', req_state == 'COPAY_PAID', req_state)
        step('the lab is notified that the patient paid the copay', bool(provider_told(lab, rid, 'The patient paid the copay')), rid)
        step('the lab booking reaches CONFIRMED once the copay is paid', booking_state == 'CONFIRMED', booking_state)


def insured_lab_outcome(pat, lab, outcome):
    """19.11 for a lab booking: full approval (nothing owed) or rejection (the patient pays in full), with both notifications.
    The lab enters the outcome the way LabDashboard does (PATCH /labs/bookings/:id/insurance)."""
    import j_lab
    label = f'lab {outcome}'
    journey(f'insurance: {label} (lab decides -> notifications -> service continues)')
    lab_id = lab.get('/provider/me').get('account', 'id')
    bid, picks = j_lab.patient_books(pat, lab_id, 'facility', 'insurance', offset=8 if outcome == 'approved' else 10, hour=14 if outcome == 'approved' else 15)
    if not bid:
        return
    if outcome == 'approved':
        items = [{'service_id': p['id'], 'isCovered': True, 'cashPrice': p.get('price')} for p in picks]
        r = lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'approved', 'totalCopay': 0, 'items': items, 'approval_ref': f'APR-{bid[:8]}'})
    else:
        items = [{'service_id': p['id'], 'isCovered': False, 'rejectReason': 'غير مشمول', 'cashPrice': p.get('price')} for p in picks]
        r = lab.patch(f'/labs/bookings/{bid}/insurance', {'status': 'rejected', 'reason': 'الخدمة غير مشمولة في فئة الوثيقة', 'items': items})
    step(f'{label}: the lab records the outcome', r.ok, r)
    rid = r.get('insurance_request_id')
    step(f'{label}: the booking links to the insurance request engine', bool(rid), r)
    if not rid:
        return
    step(f'{label}: the lab was notified of the request', bool(provider_told(lab, rid, 'New insurance request to review')), rid)
    step(f'{label}: the patient is notified of the outcome', bool(patient_told(pat, rid)), rid)
    state = pat.get(f'/insurance/requests/{rid}').get('state')
    step(f'{label}: the request state is {"APPROVED_FULL" if outcome == "approved" else "REJECTED"}', state == ('APPROVED_FULL' if outcome == 'approved' else 'REJECTED'), state)
    if outcome == 'approved':
        step(f'{label}: the lab is told the insurer covers it in full', bool(provider_told(lab, rid, 'Insurance covers the service in full')), rid)
    else:
        r = pat.post(f'/insurance/requests/{rid}/accept-self-pay', {}, headers={'Idempotency-Key': f'insurance-self-pay-{rid}-{uuid.uuid4()}'})
        step(f'{label}: the patient accepts to pay in full', r.ok and r.get('state') == 'COPAY_PENDING' and r.get('copay_percent') == 100, r)
        step(f'{label}: the patient pays', pay_request(pat, rid, label), rid)
        step(f'{label}: the request shows the payment settled', bool(poll(lambda: pat.get(f'/insurance/requests/{rid}').get('state') == 'COPAY_PAID')), rid)
        step(f'{label}: the lab is notified that the patient paid', bool(provider_told(lab, rid, 'The patient paid the copay')), rid)
    step(f'{label}: the booking reaches CONFIRMED', bool(poll(lambda: str(pat.get(f'/labs/bookings/{bid}').get('state')).upper() == 'CONFIRMED')), bid)


def run(pat, doctor, admin, labs=None):
    add_policy(pat, admin_adds_company(admin))
    for path in PATIENT_GETS:
        r = pat.get(path)
        step(f'GET {path}', r.ok, r)
    claims(pat)
    reject_out = insured_consultation(pat, doctor, 'reject')
    if reject_out and reject_out[0]:
        claims(pat, 'consultation', reject_out[0])
    insured_consultation(pat, doctor, 'approve_partial')
    insured_consultation(pat, doctor, 'approve_full')
    if labs:
        insured_lab(pat, labs[0], labs[1])
        insured_lab_outcome(pat, labs[0], 'approved')
        insured_lab_outcome(pat, labs[0], 'rejected')
    journey('insurance: admin view')
    r = admin.get('/admin/admin/insurance/requests?limit=25')
    step('admin insurance requests console loads', r.ok, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin)
    import j_lab
    j_lab.admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    labs = []
    for _ in range(2):
        lp = j_onboarding.register_type('lab', {'test_categories': catalog})
        j_onboarding.admin_review(admin, lp)
        j_onboarding.provider_after_approval(lp)
        labs.append(Client(lp['token'], 'lab'))
    pat = j_accounts.app_signup(label='insured-patient')
    run(Client(pat['token'], 'patient'), doc, admin, labs)
    summary()
