"""Journey: the doctor's patient file, block list, specialty referral and visit note (audit-3 gaps 3, 4, 5, 6, 9, 10).
  - a patient the doctor served but never wrote about opens with the empty file (it used to answer 404, so the screen said "failed");
  - the two screens that edit the file (patient file and CRM hub) read and write ONE file, and a save of one field keeps the others;
  - blocking a patient is one fact: the block list (with the patient's name) and the file agree, and a blocked patient cannot book that
    doctor (403 booking_declined_by_provider) while another patient can; lifting the block from the CRM hub lets the patient book again;
  - a referral to a specialty (the doctor's screen offers specialties) is saved; an unknown specialty is refused; "request a test" is
    a referral to a lab with the chosen tests;
  - the EMR / AI copilot note is saved on the doctor's own visit, encrypted at rest; another doctor cannot write on it.
Stack: backend :8002, admin BFF :3001, smtp_sink :2525, fake_moyasar :9100."""
import uuid

from lib import Client, journey, step


def book_attempt(pat, did, day):
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    if not free:
        return None
    s0 = free[-1]
    slot = (s0.get('start') or s0.get('slot_start') or s0.get('time')) if isinstance(s0, dict) else s0
    return pat.post('/care/appointments', {'doctor_id': did, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'cash'},
                    headers={'Idempotency-Key': f'appointment-create-{did}-{slot}-{uuid.uuid4()}'})


def run(doc, other_doc, pat, pat2, aid, pid):
    import j_consultation, health_db
    doc_pid = pid
    journey('audit-3 gap 9: a served patient opens with the empty file')
    r = doc.get(f'/provider/crm/{doc_pid}')
    step('the CRM of a patient with no file answers 200 with the empty file (not 404)',
         r.ok and r.get('tags') == [] and r.get('notes') == [] and r.get('vip') is False and r.get('blocked') is False, r)

    journey('audit-3 gap 5: one patient file for both screens')
    r = doc.put(f'/provider/ops/doctor/patient-crm/{doc_pid}', {'tags': ['متابعة'], 'notes': [{'text': 'ضغط مرتفع'}], 'vip': True})
    step('the patient-file screen saves tags, a note and VIP', r.ok, r)
    r = doc.put(f'/provider/crm/{doc_pid}', {'favorite': True})
    step('the CRM hub saves one field (favourite)', r.ok and r.get('favorite') is True, r)
    r = doc.get(f'/provider/ops/doctor/patient-crm/{doc_pid}')
    step('the patient-file screen reads one file: tags, note and VIP kept, favourite added',
         r.ok and r.get('tags') == ['متابعة'] and len(r.get('notes') or []) == 1 and r.get('vip') is True and r.get('favorite') is True, r)
    r = doc.put(f'/provider/ops/doctor/patient-crm/{doc_pid}', {'vip': False})
    step('a partial save from the patient-file screen no longer wipes the rest',
         r.ok and r.get('tags') == ['متابعة'] and len(r.get('notes') or []) == 1 and r.get('favorite') is True and r.get('vip') is False, r)

    journey('audit-3 gap 6: a blocked patient cannot book the doctor')
    did = doc.get('/provider-onboarding/my-profile').get('id')
    day = j_consultation.tomorrow().isoformat()
    r = doc.post(f'/provider/ops/doctor/blacklist/{doc_pid}', {'reason': 'عدم الحضور المتكرر'})
    step('the doctor blocks the patient', r.ok, r)
    r = doc.get('/provider/ops/doctor/blacklist')
    row = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('patient_id') == doc_pid), {})
    step('the block list shows the patient\'s name and the reason', r.ok and row.get('patient_name') and row.get('reason') == 'عدم الحضور المتكرر', row)
    r = doc.get(f'/provider/crm/{doc_pid}')
    step('and the patient file says blocked, with the same reason', r.ok and r.get('blocked') is True and r.get('blocked_reason') == 'عدم الحضور المتكرر', r)
    r = book_attempt(pat, did, day)
    step('the blocked patient cannot book this doctor (403 booking_declined_by_provider)', r is not None and r.status == 403 and 'booking_declined_by_provider' in str(r.body), r)
    r = book_attempt(pat2, did, day)
    step('another patient can book the same doctor', r is not None and r.ok, r)
    r = doc.put(f'/provider/crm/{doc_pid}', {'blocked': False})
    step('the CRM hub lifts the block', r.ok and r.get('blocked') is False, r)
    r = doc.get('/provider/ops/doctor/blacklist')
    step('the block list no longer holds the patient', r.ok and not any(x.get('patient_id') == doc_pid for x in (r.body if isinstance(r.body, list) else r.items())), r)
    r = doc.put(f'/provider/crm/{doc_pid}', {'blocked': True, 'blocked_reason': 'من شاشة العملاء'})
    r2 = book_attempt(pat, did, day)
    step('blocking from the CRM hub blocks booking too', r.ok and r2 is not None and r2.status == 403, r2)
    r = doc.put(f'/provider/crm/{doc_pid}', {'blocked': False})
    r = book_attempt(pat, did, day)
    step('after the block is lifted the patient can book again', r is not None and r.ok, r)

    journey('audit-3 gaps 3 and 4: referral to a specialty, and "request a test"')
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), None)
    r = doc.post('/provider/referrals', {'patient_id': doc_pid, 'target_type': 'specialty', 'target_specialty': spec, 'notes': 'تحويل لمتابعة القلب', 'appointment_id': aid})
    step('the doctor refers the patient to a specialty', r.ok and r.get('target_type') == 'specialty' and r.get('target_specialty') == spec, r)
    r = doc.post('/provider/referrals', {'patient_id': doc_pid, 'target_type': 'specialty', 'target_specialty': 'no-such-specialty', 'notes': 'x'})
    step('an unknown specialty is refused', r.status == 400 and 'unknown_specialty' in str(r.body), r)
    r = doc.post('/provider/referrals', {'patient_id': doc_pid, 'target_type': 'specialty', 'notes': 'x'})
    step('a specialty referral without a specialty is refused', r.status == 400, r)
    tests = Client(None, 'anon').get('/labs/services')
    ids = [x['id'] for x in (tests.body if isinstance(tests.body, list) else tests.items())][:2]
    r = doc.post('/provider/referrals', {'patient_id': doc_pid, 'target_type': 'lab', 'requested_tests': ids, 'notes': 'فحوصات مطلوبة', 'appointment_id': aid})
    step('"request a test" is a referral to a lab with the chosen tests', r.ok and r.get('requested_tests') == ids, r)
    r = doc.get('/provider/referrals/mine')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('both referrals are in the doctor\'s list', r.ok and {x.get('target_type') for x in rows} >= {'specialty', 'lab'}, [x.get('target_type') for x in rows])

    journey('audit-3 gap 10: the doctor saves a note on their own visit')
    r = doc.post('/provider/ops/doctor/notes', {'patient_id': doc_pid, 'appointment_id': aid, 'note': 'S: صداع منذ يومين\nO: ضغط 120/80\nA: صداع توتري\nP: راحة وسوائل'})
    step('the doctor saves the SOAP note on the visit', r.ok, r)
    raw = health_db.find_raw('consultationnotes', {'appointment_id': aid}) or {}
    step('16.9: the stored note is ciphertext', health_db.is_cipher(raw.get('notes')), raw.get('notes'))
    r = other_doc.post('/provider/ops/doctor/notes', {'patient_id': doc_pid, 'appointment_id': aid, 'note': 'x'})
    step('another doctor cannot write on this visit (403)', r.status == 403, r)
    r = doc.post('/provider/ops/doctor/notes', {'patient_id': 'someone-else', 'appointment_id': aid, 'note': 'x'})
    step('a note for another patient than the visit\'s is refused', r.status == 400, r)
    r = doc.post('/provider/ops/doctor/notes', {'patient_id': doc_pid, 'appointment_id': aid, 'note': '   '})
    step('an empty note is refused', r.status == 400, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')

    def doctor_account():
        p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        return Client(p['token'], 'doctor')

    doc = doctor_account()
    j_consultation.doctor_publishes_hours(doc, admin)
    pa = j_accounts.app_signup(label='crm-patient')
    pat = Client(pa['token'], 'patient')
    pat2 = Client(j_accounts.app_signup(label='crm-patient-2')['token'], 'patient')
    aid = j_consultation.book_paid(pat, doc)
    if aid:
        r = doc.get('/provider/jobs/queue?status=incoming&kind=consultation')
        if aid in [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]:
            doc.post(f'/provider/jobs/consultation/{aid}/accept', {})
        run(doc, doctor_account(), pat, pat2, aid, (pa.get('user') or {}).get('id'))
    summary()
