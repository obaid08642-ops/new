"""Journey: the doctor on the way to a home visit, on the patient's map (needs-review 2-app#3, issue 385).
  - The doctor's app moves a home visit to EN_ROUTE and sends its position (POST /care/appointments/:id/position); the
    patient's appointment then carries doctor_position, which the home-visit tracking screen draws on a map.
  - Only the visit's own doctor, only while en route: before setting off, after arriving, from a patient or another doctor
    the position is refused; once the doctor arrives the patient no longer sees a position.
"""
from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation, j_pharmacy
    admin, _ = j_admin.login()
    d = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic', 'home']})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin, ('home',))
    other_d = j_onboarding.register_type('doctor')
    j_onboarding.admin_review(admin, other_d)
    j_onboarding.provider_after_approval(other_d)
    other = Client(other_d['token'], 'doctor')
    pat = Client(j_accounts.app_signup(label='home-pos')['token'], 'patient')
    j_pharmacy.patient_address(pat)
    aid = j_consultation.book_variant(pat, doctor, 'home', 'card')
    step('a paid home visit is booked', aid, aid)
    if not aid:
        return

    journey('2-app#3: the doctor sets off and the patient sees the position')
    r = doctor.post(f'/care/appointments/{aid}/position', {'lat': 24.7, 'lng': 46.7})
    step('no position before setting off', r.status == 400, r)
    appt = doctor.get(f'/care/appointments/{aid}')
    if str(appt.get('status')).upper() == 'PENDING':
        doctor.req('PATCH', f'/care/appointments/{aid}/confirm', {})
    r = doctor.req('PATCH', f'/care/appointments/{aid}/en-route', {})
    step('the doctor is on the way', r.ok, r)
    r = doctor.post(f'/care/appointments/{aid}/position', {'lat': 24.7123, 'lng': 46.6789})
    step('the doctor\'s app sends its position', r.ok, r)
    r = pat.post(f'/care/appointments/{aid}/position', {'lat': 1, 'lng': 1})
    step('a patient cannot send one', r.status in (401, 403), r.status)
    r = other.post(f'/care/appointments/{aid}/position', {'lat': 1, 'lng': 1})
    step('nor another doctor', r.status == 403, r.status)
    r = doctor.post(f'/care/appointments/{aid}/position', {'lat': 123, 'lng': 1})
    step('an impossible point is refused', r.status == 400, r.status)
    a = pat.get(f'/care/appointments/{aid}')
    pos = (a.body.get('data', a.body) if isinstance(a.body, dict) else {}).get('doctor_position') or {}
    step('the patient\'s appointment carries the doctor\'s position', pos.get('lat') == 24.7123 and pos.get('lng') == 46.6789 and pos.get('at'), pos)

    journey('2-app#3: after arriving the position is no longer shared')
    r = doctor.req('PATCH', f'/care/appointments/{aid}/arrive', {})
    step('the doctor arrives', r.ok, r)
    a = pat.get(f'/care/appointments/{aid}')
    body = a.body.get('data', a.body) if isinstance(a.body, dict) else {}
    step('the patient no longer sees a position', 'doctor_position' not in body, list(body)[:30])
    r = doctor.post(f'/care/appointments/{aid}/position', {'lat': 24.7, 'lng': 46.7})
    step('and the doctor cannot send one', r.status == 400, r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
