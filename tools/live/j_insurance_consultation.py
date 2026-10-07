"""Journey: consultation insurance flow (as-is, no Nphies).
Patient saves insurance -> books consultation with insurance -> doctor receives request -> doctor submits on own system -> doctor enters outcome -> patient pays copay -> notifications.
Payloads from patient-app consultations/Insurance* screens and provider-app doctor/InsuranceRequestsScreen."""
import datetime
import uuid
from lib import Client, journey, step
from j_nursing import fake_pay

DOCTOR_SCREEN_GETS = ['/provider/profile', '/provider/profile/availability', '/provider/jobs/queue?status=incoming&kind=consultation',
                      '/provider/jobs/queue?status=active&kind=consultation', '/provider/jobs/queue?status=active', '/calls/provider/waiting-room',
                      '/provider/schedule-slots', '/provider/capabilities/doctor-sessions', '/provider/settings/pricing', '/provider/wallet',
                      '/provider/wallet/transactions', '/provider/notifications', '/provider/kyc/documents', '/provider/referrals/mine',
                      '/provider/reports/inbound', '/provider/ops/doctor/templates', '/provider/ops/doctor/diagnoses', '/provider/ops/doctor/leave',
                      '/provider/ops/doctor/blacklist', '/provider/stats/today', '/provider/stats/period?period=week', '/provider/directory',
                      '/hospital/invitations/inbox', '/provider/dashboard/stats', '/provider/crm']

def tomorrow():
    return datetime.date.today() + datetime.timedelta(days=1)

def doctor_publishes_hours(doctor, admin):
    journey('consultation insurance: doctor opens clinic hours')
    d = tomorrow()
    dow = (d.weekday() + 1) % 7
    for st in ('clinic', 'video', 'home'):
        r = doctor.post('/provider/schedule-slots', {'day_of_week': dow, 'start_time': '08:00', 'end_time': '18:00', 'service_type': st})
        step(f'doctor submits {st} hours', r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    pend = [x for x in r.items() if x.get('status') == 'pending']
    step('admin sees pending schedule change', r.ok and pend, f'{r.status} {[x.get("target") for x in pend][:5]}')
    for x in pend:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/approve", {'reason': 'ساعات العيادة معتمدة'})
        step(f'admin approves {x.get("target")}', r.ok, r)
    r = doctor.get('/provider/schedule-slots')
    step('hours are live', r.ok and len(r.items() if not isinstance(r.body, list) else r.body) > 0, r)

def patient_adds_insurance(pat, admin, prof_id):
    journey('insurance: patient adds policy (consultation flow)')
    r = pat.get('/insurance/companies')
    comps = r.body if isinstance(r.body, list) else r.items()
    step('insurance companies load', r.ok and len(comps) > 0, r)
    c = comps[0]
    net_code = f'net{uuid.uuid4().hex[:5]}'
    if c.get('id'):
        rn = admin.post(f"/insurance/companies/{c.get('id')}/networks",
                        {'code': net_code, 'name_ar': f'شبكة {net_code}', 'name_en': f'Net {net_code}', 'tier_level': 1})
        step('admin creates network', rn.ok, rn)
        net_id = (rn.body or {}).get('id') if isinstance(rn.body, dict) else None
        if net_id and prof_id:
            ra = admin.post(f"/insurance/providers/{prof_id}/insurance-contract",
                            {'company_id': c.get('id'), 'network_id': net_id,
                             'covered_classes': ['A', 'B', 'VIP'], 'copay_percent': 10})
            step('provider accepts network', ra.ok, ra)

    r = pat.post('/insurance/save-policy', {'provider': c.get('name_ar') or c.get('name_en') or c.get('code'), 'company_id': c.get('code'),
                                            'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}', 'expiry_date': '2027-12-31',
                                            'member_name': 'مريض تأمين استشارة', 'national_id': '1098765432', 'verified': False, 'ocr_extracted': False,
                                            'network': net_code, 'class': 'A'})
    step('save-policy', r.ok, r)
    r = pat.get('/insurance/my-policy')
    pol = r.get('policy') or {}
    step('my policy saved', r.ok and r.get('has_policy'), r)
    return c

def run(pat, doctor, admin):
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    company = patient_adds_insurance(pat, admin, prof_id)
    doctor_publishes_hours(doctor, admin)

    journey('consultation insurance: patient books with insurance')
    doc_id = doctor.get('/provider/me').get('account', 'id')
    r = pat.get('/care/specialties')
    step('specialties load', r.ok and len(r.items() if not isinstance(r.body, list) else r.body) > 0, r.status)
    prof = doctor.get('/provider/profile')
    spec = prof.get('specialty') or 'cardiology'
    r = pat.get(f'/care/doctors?specialty={spec}&limit=50')
    docs = r.body if isinstance(r.body, list) else r.items()
    hit = next((x for x in docs if x.get('id') in (prof_id, doc_id)), None)
    step('doctor search lists approved doctor', r.ok and hit, f'{r.status} {len(docs)} want {doc_id}')
    did = (hit or {}).get('id') or doc_id
    r = pat.get(f'/care/doctors/{did}')
    step('doctor profile opens', r.ok, r)
    day = tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('free clinic slots tomorrow', r.ok and free, r)
    if not free:
        return
    s0 = free[0]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0

    ins = pat.get('/users/me/profile').get('insurance') or {}
    r = pat.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    step('slot held (10 min lock)', r.ok and lock, r)
    body = {'doctor_id': did, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'insurance',
            'insurance_provider': ins.get('provider_id') or ins.get('company_id'),
            'insurance_member_id': ins.get('policy_number') or ins.get('member_id'), 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'appt-ins-{did}-{slot}-{uuid.uuid4()}'})
    aid = r.get('id')
    rid = r.get('insurance_request_id')
    step('appointment created with insurance request', r.ok and aid and rid, r)
    if not aid or not rid:
        return

    journey('consultation insurance: insurance request reaches doctor')
    r = pat.get(f'/insurance/requests/{rid}')
    step('payment-split opens request (pending review)', r.ok, r)
    r = doctor.get('/insurance/requests/provider/queue')
    step('request reaches doctor (InsuranceRequestsScreen)', r.ok and rid in str(r.body), r)

    journey('consultation insurance: doctor submits on external system -> records outcome')
    r = doctor.post(f'/insurance/requests/{rid}/decide',
                    {'decision': 'approve_partial', 'copay_percent': 20})
    step('doctor decides: approve_partial with 20% copay', r.ok, r)

    journey('consultation insurance: patient sees decision and pays copay')
    r = pat.get(f'/insurance/requests/{rid}')
    req = r.body if isinstance(r.body, dict) else {}
    step('patient sees decision', r.ok and req.get('state') not in (None, 'PENDING', 'pending'), r)
    kind = 'copay'
    caps = f'/insurance/requests/{rid}/capabilities'
    r = pat.get(caps)
    step(f'{kind}: card is offered', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)
    r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-ins-{rid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step(f'{kind}: checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = pat.post(f"/payments/verify/{txn['id']}", {})
        step(f'{kind}: paid', r.ok and r.get('status') == 'paid', r)

    import time as _time
    paid_state = None
    for _ in range(10):
        r = pat.get(f'/insurance/requests/{rid}')
        paid_state = r.get('state')
        if paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'):
            break
        _time.sleep(1.5)
    step(f'request shows {kind} paid', paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'), paid_state)

    r = pat.get(f'/care/appointments/{aid}')
    step('appointment confirmed once paid', r.ok and str(r.get('status')).upper() == 'CONFIRMED', r)

    journey('consultation insurance: doctor runs the visit')
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    inc = [j.get('id') for j in r.items()] if not isinstance(r.body, list) else [j.get('id') for j in r.body]
    r_act = doctor.get('/provider/jobs/queue?status=active&kind=consultation')
    act = [j.get('id') for j in (r_act.body if isinstance(r_act.body, list) else r_act.items())]
    step('appointment reaches doctor', aid in inc or aid in act, f'incoming={inc[:3]} active={act[:3]}')
    if aid in inc:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('doctor accepts', r.ok, r)
    for action in ('check-in', 'start'):
        r = doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action}', r.ok, r)

    pid = doctor.get(f'/care/appointments/{aid}').get('patient_id')
    r = doctor.post('/prescriptions/create', {'patient_id': pid, 'appointment_id': aid, 'diagnosis': 'التهاب حلق فيروسي', 'notes': 'التهاب حلق فيروسي',
                                              'erx': [{'manual_name_en': 'Paracetamol 500mg', 'manual_name_ar': 'Paracetamol 500mg', 'dose': '500mg',
                                                       'duration_days': 5, 'instructions': 'كل 8 ساعات. بعد الأكل'}], 'labs': [], 'radiology': []})
    step('doctor writes prescription', r.ok, r)
    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'التهاب حلق فيروسي', 'notes': 'راحة وسوائل', 'recommendations': 'مراجعة بعد أسبوع إذا لم يتحسن'})
    step('doctor finishes with summary', r.ok, r)

    journey('consultation insurance: patient after visit')
    r = pat.get(f'/care/appointments/{aid}')
    step('appointment COMPLETED', r.ok and str(r.get('status')).upper() == 'COMPLETED', r)
    r = pat.get(f'/care/appointments/{aid}/summary')
    step('visit summary opens', r.ok, r)
    r = pat.get('/prescriptions/active')
    step('prescription lists the prescription', r.ok and 'Paracetamol' in str(r.body), r)

    journey('consultation insurance: notifications')
    r = pat.post('/patient-ux/review', {'booking_kind': 'consultation', 'booking_id': aid, 'rating': 5, 'comment': 'طبيب ممتاز مع التأمين', 'aspects': {}, 'anonymous': False})
    step('patient rates the doctor', r.ok, r)

    journey('consultation insurance: admin console')
    r = admin.get('/admin/admin/orders?kind=consultation&limit=25')
    row = next((x for x in r.items() if x.get('id') == aid), None)
    step('admin lists insurance consultation', r.ok and row and str(row.get('status')).upper() == 'COMPLETED' and row.get('amount', 0) > 0, row or r.status)

    journey('doctor screens: every tab loads')
    for path in DOCTOR_SCREEN_GETS:
        r = doctor.get(path)
        step(f'GET {path}', r.ok, r)

    return aid

def test_rejection_flow(pat, doctor, admin):
    """Test insurance rejection -> self-pay flow"""
    journey('consultation insurance: rejection -> self-pay')
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    patient_adds_insurance(pat, admin, prof_id)
    doctor_publishes_hours(doctor, admin)

    doc_id = doctor.get('/provider/me').get('account', 'id')
    prof = doctor.get('/provider/profile')
    spec = prof.get('specialty') or 'cardiology'
    r = pat.get(f'/care/doctors?specialty={spec}&limit=50')
    docs = r.body if isinstance(r.body, list) else r.items()
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    hit = next((x for x in docs if x.get('id') in (prof_id, doc_id)), None)
    did = (hit or {}).get('id') or doc_id
    day = tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    if not free:
        return
    s0 = free[-1]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0

    ins = pat.get('/users/me/profile').get('insurance') or {}
    r = pat.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    body = {'doctor_id': did, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'insurance',
            'insurance_provider': ins.get('provider_id') or ins.get('company_id'),
            'insurance_member_id': ins.get('policy_number') or ins.get('member_id'), 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'appt-reject-{did}-{slot}-{uuid.uuid4()}'})
    aid = r.get('id')
    rid = r.get('insurance_request_id')
    step('appointment created with insurance request', r.ok and aid and rid, r)
    if not rid:
        return

    r = doctor.post(f'/insurance/requests/{rid}/decide', {'decision': 'reject', 'reason': 'الخدمة غير مشمولة في فئة الوثيقة'})
    step('doctor decides: reject', r.ok, r)

    r = pat.get(f'/insurance/requests/{rid}')
    req = r.body if isinstance(r.body, dict) else {}
    step('patient sees rejection', r.ok and req.get('state') not in (None, 'PENDING', 'pending'), r)

    r = pat.post(f'/insurance/requests/{rid}/accept-self-pay', {}, headers={'Idempotency-Key': f'ins-selfpay-{rid}-{uuid.uuid4()}'})
    step('patient accepts self-pay (100% copay)', r.ok and r.get('state') == 'COPAY_PENDING' and r.get('copay_percent') == 100, r)

    caps = f'/insurance/requests/{rid}/self-pay-capabilities'
    r = pat.get(caps)
    step('self-pay: card is offered', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)

    r = pat.post(f'/payments/intent/insurance/{rid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-selfpay-{rid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('self-pay: checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = pat.post(f"/payments/verify/{txn['id']}", {})
        step('self-pay: paid', r.ok and r.get('status') == 'paid', r)

    import time as _time
    paid_state = None
    for _ in range(10):
        r = pat.get(f'/insurance/requests/{rid}')
        paid_state = r.get('state')
        if paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'):
            break
        _time.sleep(1.5)
    step('request shows self-pay paid', paid_state in ('COPAY_PAID', 'SELF_PAY_PAID'), paid_state)

    r = pat.get(f'/care/appointments/{aid}')
    step('appointment confirmed after self-pay', r.ok and str(r.get('status')).upper() == 'CONFIRMED', r)

if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'video', 'home']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    pat = j_accounts.app_signup(label='consult-ins-patient')
    run(Client(pat['token'], 'patient'), doc, admin)
    test_rejection_flow(Client(pat['token'], 'patient'), doc, admin)
    summary()