"""Journey PT-08: a doctor issues a sick leave after a visit and the patient reads it.
  provider-app SickLeaveScreen -> POST /provider/:appointmentId/sick-leave (patient_id, diagnosis, duration_days, start_date) ->
  the patient's visit outcomes list it as a sick leave with its days and dates (patient-app AppointmentSections) -> the patient opens the
  report (GET /reports/:id) and marks the outcomes seen. A patient cannot issue one, and another patient cannot read it.
  The patient-side REQUEST for a sick leave does not exist in the app or the backend (docs/qa/h-scenarios-status-b-pt08-pt54.md): not covered.
  Stack: backend :8002.
"""
import datetime

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin)
    pat = Client(j_accounts.app_signup(label='sickleave-pat')['token'], 'patient')
    other = Client(j_accounts.app_signup(label='sickleave-other')['token'], 'patient')

    journey('PT-08: the patient has a visit')
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    if aid in [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('doctor accepts', r.ok, r)
    for action in ('check-in', 'start'):
        r = doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action}', r.ok, r)
    pid = doctor.get(f'/care/appointments/{aid}').get('patient_id')

    journey('PT-08: the doctor issues the sick leave')
    start = datetime.date.today().isoformat()
    body = {'patient_id': pid, 'diagnosis': 'التهاب حلق فيروسي', 'duration_days': 3, 'start_date': start, 'recommendations': 'راحة تامة'}
    r = pat.post(f'/provider/requests/{aid}/sick-leave', body)
    step('a patient cannot issue a sick leave', r.status in (401, 403), r)
    r = doctor.post(f'/provider/requests/{aid}/sick-leave', {**body, 'diagnosis': ''})
    step('a sick leave without a diagnosis is refused', r.status == 400, r)
    r = doctor.post(f'/provider/requests/{aid}/sick-leave', body)
    step('the doctor issues a 3-day sick leave', r.ok and r.get('ok') is True and r.get('days') == 3 and r.get('tracking_id'), r)
    tracking = r.get('tracking_id')
    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'التهاب حلق فيروسي', 'notes': 'راحة', 'recommendations': 'مراجعة عند الحاجة'})
    step('the doctor finishes the visit', r.ok, r)

    journey('PT-08: the patient reads the sick leave')
    r = pat.get(f'/care/appointments/{aid}/outcomes')
    leaves = r.get('sick_leaves_and_certificates') or []
    leave = next((x for x in leaves if x.get('certificate_kind') == 'sick_leave'), {})
    sl = leave.get('sick_leave') or {}
    step('the visit outcomes list the sick leave', r.ok and leave.get('id') and leave.get('tracking_id') == tracking, r)
    step('it carries the days and the dates the doctor set', sl.get('duration_days') == 3 and str(sl.get('start_date', '')).startswith(start) and sl.get('end_date'), sl)
    step('it is new until the patient has seen it', leave.get('is_new') is True and (r.get('unseen_count') or 0) >= 1, leave)
    rid = leave.get('id')
    if rid:
        rep = pat.get(f'/reports/{rid}')
        step('the patient opens the report', rep.ok and rep.get('certificate_kind') == 'sick_leave' and (rep.get('sick_leave') or {}).get('duration_days') == 3, rep)
        rep2 = other.get(f'/reports/{rid}')
        step('another patient cannot open it', rep2.status in (403, 404), rep2)
    r = pat.req('PATCH', f'/care/appointments/{aid}/outcomes/seen', {})
    step('the patient marks the outcomes seen', r.ok, r)
    r = pat.get(f'/care/appointments/{aid}/outcomes')
    leave = next((x for x in (r.get('sick_leaves_and_certificates') or []) if x.get('certificate_kind') == 'sick_leave'), {})
    step('the sick leave is no longer new', r.ok and leave.get('is_new') is False and r.get('unseen_count') == 0, leave)
    r = other.get(f'/care/appointments/{aid}/outcomes')
    step('another patient cannot read the visit outcomes', r.status in (403, 404), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
