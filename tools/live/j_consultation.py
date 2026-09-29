"""Journey: clinic consultation, patient-app consultations -> doctor (provider-app DoctorDashboard) -> summary/prescription.
Payloads copied from patient-app consultations/specialty-select, DoctorSearchView, consultations/doctor/[id].tsx (slots),
src/components/BookingConfirmForm.tsx (slot lock + appointment + card checkout), provider-app screens/doctor/DoctorDashboard.tsx."""
import datetime, uuid
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


def doctor_publishes_hours(doctor, admin, service_types=('clinic',)):
    journey('consultation: doctor opens clinic hours (admin approves)')
    d = tomorrow()
    dow = (d.weekday() + 1) % 7  # JS getDay(): Sunday=0
    for st in service_types:
        # Wide window: the matrix books 4 spaced appointments in one day.
        r = doctor.post('/provider/schedule-slots', {'day_of_week': dow, 'start_time': '08:00', 'end_time': '18:00', 'service_type': st})
        step(f'doctor submits {st} hours', r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    pend = [x for x in r.items() if x.get('status') == 'pending']
    step('admin sees the pending schedule change', r.ok and pend, f'{r.status} {[x.get("target") for x in pend][:5]}')
    for x in pend:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/approve", {'reason': 'ساعات العيادة معتمدة'})
        step(f"admin approves the {x.get('target')} change", r.ok, r)
    r = doctor.get('/provider/schedule-slots')
    step('the hours are live on the doctor schedule', r.ok and len(r.items() if not isinstance(r.body, list) else r.body) > 0, r)


def book_paid(pat, doctor):
    """patient finds the doctor, holds a clinic slot tomorrow, books and pays by card; returns the appointment id."""
    doc_id = doctor.get('/provider/me').get('account', 'id')
    journey('consultation: patient finds the doctor and a slot')
    r = pat.get('/care/specialties')
    step('specialties load', r.ok and len(r.items() if not isinstance(r.body, list) else r.body) > 0, r.status)
    prof = doctor.get('/provider/profile')
    spec = prof.get('specialty') or 'cardiology'
    r = pat.get(f'/care/doctors?specialty={spec}&limit=50')
    docs = r.body if isinstance(r.body, list) else r.items()
    profile_id = doctor.get('/provider-onboarding/my-profile').get('id')  # public doctor id = profile id
    hit = next((x for x in docs if x.get('id') in (profile_id, doc_id)), None)
    step('doctor search lists the approved doctor', r.ok and hit, f'{r.status} {len(docs)} want {doc_id}')
    did = (hit or {}).get('id') or doc_id
    r = pat.get(f'/care/doctors/{did}')
    step('doctor profile opens', r.ok, r)
    day = tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor has free clinic slots tomorrow', r.ok and free, r)
    if not free:
        return None
    s0 = free[0]
    slot = s0.get('start') or s0.get('slot_start') or s0.get('time') if isinstance(s0, dict) else s0

    journey('consultation: patient books and pays by card')
    r = pat.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    step('slot held (10 min lock)', r.ok and lock, r)
    body = {'doctor_id': did, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'appointment-create-{did}-{slot}-{uuid.uuid4()}'})
    aid = r.get('id')
    step('appointment created', r.ok and aid, r)
    if not aid:
        return None
    r2 = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'appointment-create-{did}-{slot}-{uuid.uuid4()}'})
    step('the same slot cannot be booked twice', not r2.ok, r2)
    r = pat.get(f'/payments/consultation/{aid}/capabilities')
    step('card is offered for this consultation', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = pat.post(f"/payments/verify/{txn['id']}", {})
        step('payment verified', r.ok and r.get('status') == 'paid', r)
    r = pat.get(f'/care/appointments/{aid}')
    step('booking-status shows it paid', r.ok and r.get('payment_status') == 'paid', r)

    return aid


def pay_card(pat, aid):
    """Card checkout for a consultation booking: capabilities -> intent -> verify."""
    r = pat.get(f'/payments/consultation/{aid}/capabilities')
    step('card is offered for this consultation', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)
    if not r.ok:
        return False
    r = pat.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('checkout link is https', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = pat.post(f"/payments/verify/{txn['id']}", {})
        step('payment verified', r.ok and r.get('status') == 'paid', r)
        return r.ok
    return False


def book_variant(pat, doctor, service_type, payment, provider=None):
    """P8 matrix: book one visit-type × payment combo (card flows pay fully)."""
    doc_id = doctor.get('/provider/me').get('account', 'id')
    prof = doctor.get('/provider/profile')
    spec = prof.get('specialty') or 'cardiology'
    r = pat.get(f'/care/doctors?specialty={spec}&limit=50')
    docs = r.body if isinstance(r.body, list) else r.items()
    profile_id = doctor.get('/provider-onboarding/my-profile').get('id')
    hit = next((x for x in docs if x.get('id') in (profile_id, doc_id)), None)
    if not hit:
        step(f'matrix {service_type}+{payment}: doctor listed', False, r.status)
        return None
    did = hit.get('id') or doc_id
    day = tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type={service_type}')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    used = getattr(book_variant, '_used_slots', set())
    import datetime as _dt

    def _slot_time(s):
        v = (s.get('start') or s.get('slot_start') or s.get('time')) if isinstance(s, dict) else s
        try:
            return _dt.datetime.fromisoformat(str(v).replace('Z', '+00:00')), v
        except Exception:
            return None, v

    free = [(t, v, s) for s in free for t, v in [_slot_time(s)] if t is not None]
    def _far_enough(t):
        for u in used:
            if not isinstance(u, _dt.datetime):
                continue
            try:
                if abs((t - u).total_seconds()) < 2400:
                    return False
            except Exception:
                continue
        return True

    free = [(t, v, s) for t, v, s in free if v not in used and _far_enough(t)]
    if not free:
        step(f'matrix {service_type}+{payment}: free slot', False, r.status)
        return None
    free.sort(key=lambda x: x[0])
    t0, slot, s0 = free[-1]
    used.add(slot)
    used.add(t0)
    book_variant._used_slots = used
    journey(f'consultation matrix: {service_type} x {payment}')
    r = pat.post('/slot-locks/reserve', {'provider_id': did, 'booking_kind': 'consultation', 'slot_start': slot})
    lock = r.get('id')
    body = {'doctor_id': did, 'service_type': service_type, 'slot_start': slot, 'payment_method': payment, 'slot_lock_id': lock}
    r = pat.post('/care/appointments', body, headers={'Idempotency-Key': f'appt-{service_type}-{payment}-{uuid.uuid4().hex[:12]}'})
    aid = r.get('id')
    step(f'matrix {service_type}+{payment}: appointment created', r.ok and aid, r)
    if not aid:
        return None
    if payment == 'card':
        if pay_card(pat, aid):
            r = pat.get(f'/care/appointments/{aid}')
            step(f'matrix {service_type}+{payment}: paid', r.ok and r.get('payment_status') == 'paid', r)
    elif payment == 'insurance':
        r = pat.post('/insurance/requests', {'booking_kind': 'consultation', 'booking_id': aid})
        rid = r.get('id')
        step(f'matrix {service_type}+{payment}: insurance request opened', r.ok and rid, r)
        if rid and provider is not None:
            d = provider.post(f'/insurance/requests/{rid}/decide', {'decision': 'approve_partial', 'copay_percent': 20})
            step(f'matrix {service_type}+{payment}: provider decides partial', d.ok, d)
            import time as _time
            state = None
            for _ in range(10):
                q = pat.get(f'/insurance/requests/{rid}')
                state = q.get('state')
                if state not in (None, 'PENDING_PROVIDER_REVIEW'):
                    break
                _time.sleep(3)
            step(f'matrix {service_type}+{payment}: decision visible', state not in (None, 'PENDING_PROVIDER_REVIEW'), state)
    else:
        r = pat.get(f'/care/appointments/{aid}')
        step(f'matrix {service_type}+{payment}: cash booking recorded', r.ok and r.get('payment_method') == 'cash', r)
    return aid


def matrix_visit_types(pat, doctor, admin):
    """P8 matrix (R7-5): every visit type x payment path the backend allows."""
    import j_insurance
    j_insurance.add_policy(pat, j_insurance.admin_adds_company(admin))
    doctor_publishes_hours(doctor, admin, ('video', 'home'))
    book_variant(pat, doctor, 'video', 'card')
    book_variant(pat, doctor, 'home', 'card')
    book_variant(pat, doctor, 'clinic', 'cash')
    book_variant(pat, doctor, 'home', 'insurance', provider=doctor)


def run(pat, doctor, admin):
    aid = book_paid(pat, doctor)
    if not aid:
        return
    journey('consultation: the doctor runs the visit')
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    inc = [j.get('id') for j in r.items()] if not isinstance(r.body, list) else [j.get('id') for j in r.body]
    r_act = doctor.get('/provider/jobs/queue?status=active&kind=consultation')
    act = [j.get('id') for j in (r_act.body if isinstance(r_act.body, list) else r_act.items())]
    step('the appointment reaches the doctor (incoming or already confirmed)', aid in inc or aid in act, f'incoming={inc[:3]} active={act[:3]}')
    if aid in inc:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('doctor accepts', r.ok, r)
    for action in ('check-in', 'start'):
        r = doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action}', r.ok, r)
    # LiveConsultationScreen: prescription (EPrescriptionScreen payload) during the visit, then finish with the summary
    pid = doctor.get(f'/care/appointments/{aid}').get('patient_id')  # EPrescriptionScreen: apt.patient_id
    r = doctor.post('/prescriptions/create', {'patient_id': pid, 'appointment_id': aid, 'diagnosis': 'التهاب حلق فيروسي', 'notes': 'التهاب حلق فيروسي',
                                              'erx': [{'manual_name_en': 'Paracetamol 500mg', 'manual_name_ar': 'Paracetamol 500mg', 'dose': '500mg',
                                                       'duration_days': 5, 'instructions': 'كل 8 ساعات. بعد الأكل'}], 'labs': [], 'radiology': []})
    step('doctor writes a prescription during the visit', r.ok, r)
    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'التهاب حلق فيروسي', 'notes': 'راحة وسوائل', 'recommendations': 'مراجعة بعد أسبوع إذا لم يتحسن'})
    step('doctor finishes the visit with the summary', r.ok, r)

    journey('consultation: the patient after the visit')
    r = pat.get(f'/care/appointments/{aid}')
    step('appointment COMPLETED', r.ok and str(r.get('status')).upper() == 'COMPLETED', r)
    r = pat.get(f'/care/appointments/{aid}/summary')
    step('visit summary opens', r.ok, r)
    r = pat.get('/prescriptions/active')
    step('prescription-from-doctor lists the prescription', r.ok and 'Paracetamol' in str(r.body), r)
    rx = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('appointment_id') == aid), {})
    it = (rx.get('items') or [{}])[0]
    # prescription-from-doctor "add to reminders" (src/utils/prescription-view reminderPayload)
    r = pat.post('/health/reminders', {'medication_name': it.get('medicine_name_ar'), 'medicine_name_en': it.get('medicine_name_en'), 'dose': it.get('dose'),
                                       'frequency': 'daily', 'duration_days': it.get('duration_days'), 'instructions_ar': it.get('instructions'),
                                       'prescription_id': rx.get('id'), 'source': 'doctor', 'times': ['00:00', '08:00', '16:00'], 'time_zone': 'Asia/Riyadh'})
    step('add to reminders creates the reminder', r.ok, r)
    r = pat.get('/health/reminders')
    step('the reminder shows in my reminders', r.ok and rx.get('id', '?') in str(r.body), r)
    r = pat.post('/patient-ux/review', {'booking_kind': 'consultation', 'booking_id': aid, 'rating': 5, 'comment': 'طبيب ممتاز', 'aspects': {}, 'anonymous': False})
    step('patient rates the doctor', r.ok, r)

    journey('doctor screens: every tab loads')
    for path in DOCTOR_SCREEN_GETS:
        r = doctor.get(path)
        step(f'GET {path}', r.ok, r)

    journey('consultation: admin orders console')
    r = admin.get('/admin/admin/orders?kind=consultation&limit=25')
    row = next((x for x in r.items() if x.get('id') == aid), None)
    step('console lists it with status and amount', r.ok and row and str(row.get('status')).upper() == 'COMPLETED' and row.get('amount', 0) > 0, row or r.status)
    return aid


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    # DoctorRegistration: specialty chosen from the specialties catalog (code)
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant',
                                              'consultation_modes': ['clinic', 'video', 'home']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    doctor_publishes_hours(doc, admin)
    pat = j_accounts.app_signup(label='consult-patient')
    run(Client(pat['token'], 'patient'), doc, admin)
    matrix_visit_types(Client(pat['token'], 'patient'), doc, admin)
    summary()
