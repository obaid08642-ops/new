"""Journey PT-05: a doctor's referral from a visit becomes a lab booking.
  provider-app visit -> POST /provider/doctor-referrals/issue-referrals-and-prescription with the apps' UUID ids (appointment, patient, doctor)
  -> the patient's visit outcomes list the referred tests (GET /care/appointments/:id/outcomes) -> the patient books exactly those tests at an
  approved lab. Another doctor cannot issue a referral for this doctor's visit, and a patient cannot call the route.
  Stack: backend :8002.
"""
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation, j_lab
    admin, _ = j_admin.login()
    j_lab.admin_publishes_tests(admin)
    catalog = [x['id'] for x in Client(None, 'anon').get('/labs/services').items()]
    lp = j_onboarding.register_type('lab', {'test_categories': catalog})
    j_onboarding.admin_review(admin, lp)
    j_onboarding.provider_after_approval(lp)
    lab = Client(lp['token'], 'lab')
    lab_id = lab.get('/provider/me').get('account', 'id')

    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin)
    d2 = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, d2)
    j_onboarding.provider_after_approval(d2)
    other_doctor = Client(d2['token'], 'doctor')

    pat = Client(j_accounts.app_signup(label='referral-pat')['token'], 'patient')

    journey('PT-05: the patient has a visit with the doctor')
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    inc = [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]
    if aid in inc:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('doctor accepts', r.ok, r)
    for action in ('check-in', 'start'):
        r = doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action}', r.ok, r)

    journey('PT-05: the doctor refers the patient to lab tests (uuid ids, as the apps hold them)')
    pid = doctor.get(f'/care/appointments/{aid}').get('patient_id')
    doc_uid = doctor.get('/auth/me').get('id')
    tests = catalog[:2]
    body = {'appointmentId': aid, 'patientId': pid, 'doctorId': doc_uid, 'labTests': tests, 'radScans': [], 'homeCareNotes': 'صيام 8 ساعات قبل الفحص'}
    url = '/provider/doctor-referrals/issue-referrals-and-prescription'
    r = pat.post(url, body)
    step('a patient cannot issue a referral', r.status in (401, 403), r)
    r = other_doctor.post(url, {**body, 'doctorId': other_doctor.get('/auth/me').get('id')})
    step('another doctor cannot issue a referral for this doctor\'s visit', r.status == 403, r)
    r = doctor.post(url, {**body, 'appointmentId': 'not-an-id'})
    step('a malformed id is a 400', r.status == 400, r)
    r = doctor.post(url, body)
    step('the doctor issues the referral with uuid ids', r.ok and r.get('success') is True and r.get('referral_id'), r)

    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'تحليل دوري', 'notes': 'فحوصات مخبرية', 'recommendations': 'مراجعة بعد النتائج'})
    step('the doctor finishes the visit', r.ok, r)

    journey('PT-05: the patient sees the referral and books the tests')
    r = pat.get(f'/care/appointments/{aid}/outcomes')
    ref = r.get('referral') or r.get('instructions') or r.body
    listed = r.get('lab_tests') or (ref.get('lab_tests') if isinstance(ref, dict) else None) or []
    ids = [(t.get('id') or t.get('code')) if isinstance(t, dict) else t for t in listed]
    step('the visit outcomes list the referred tests', r.ok and all(t in ids for t in tests), f'{r.status} want {tests} got {ids}')
    r = pat.post('/labs/bookings', {'items': [{'service_id': t} for t in tests], 'scheduled_at': j_lab.tomorrow_at(11), 'location_type': 'facility',
                                    'payment_method': 'cash', 'provider_account_id': lab_id})
    bid = r.get('id')
    step('the patient books the referred tests at the lab', r.ok and bid, r)
    r = pat.get(f'/labs/bookings/{bid}') if bid else None
    step('the booking holds the referred tests', bool(r) and r.ok and all(t in str(r.body) for t in tests), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
