"""Journey PT-08: a doctor issues a MEDICAL REPORT with a recommended rest period (never called "sick leave": that is the official Seha document); the patient reads,
  downloads and shows it; anyone can verify it; the doctor adds the Seha number or revokes it.
  Owner decisions 2026-11-09: serial + verify code, no back-dating (the rest cannot start before the consultation day), 1-30 days with an inclusive end,
  the reason in the doctor's words (the diagnosis only if the doctor shows it, both encrypted at rest), a PDF, a public verify page that shows only
  valid / revoked, initials and dates, a revoke with a reason. Other patients get 404; a patient and another doctor cannot issue or revoke.
  Stack: backend :8002.
"""
import datetime

from lib import Client, journey, step


def main():
    import health_db, j_admin, j_accounts, j_onboarding, j_consultation
    admin, _ = j_admin.login()
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

    journey('PT-08: the doctor issues the sick leave certificate')
    start = j_consultation.tomorrow().isoformat()              # the consultation day: the leave cannot start before it
    body = {'patient_id': pid, 'diagnosis': 'التهاب حلق فيروسي', 'reason': 'مرض حاد يحتاج راحة', 'duration_days': 3, 'start_date': start, 'recommendations': 'راحة تامة'}
    r = pat.post(f'/provider/requests/{aid}/sick-leave', body)
    step('a patient cannot issue a sick leave', r.status in (401, 403), r)
    r = doctor.post(f'/provider/requests/{aid}/sick-leave', {**body, 'diagnosis': ''})
    step('a sick leave without a diagnosis is refused', r.status == 400, r)
    back = (j_consultation.tomorrow() - datetime.timedelta(days=1)).isoformat()
    r = doctor.post(f'/provider/requests/{aid}/sick-leave', {**body, 'start_date': back})
    step('NO BACK-DATING: a start before the consultation day is refused', r.status == 400 and 'before_consultation' in str(r.body), r)
    r = doctor.post(f'/provider/requests/{aid}/sick-leave', {**body, 'duration_days': 31})
    step('more than 30 days is refused', r.status == 400, r)
    r = doctor.post(f'/provider/requests/new/sick-leave', body)
    step('without a consultation there is no certificate', r.status == 400, r)
    r = doctor.post(f'/provider/requests/{aid}/sick-leave', body)
    step('the doctor issues a 3-day sick leave', r.ok and r.get('ok') is True and r.get('days') == 3 and r.get('tracking_id') and r.get('serial') and r.get('code'), r)
    cert_id, serial, code = r.get('id'), r.get('serial'), r.get('code')
    step('the serial and the code have their shape', str(serial).startswith('MED-') and len(str(code)) == 8, f'{serial} {code}')
    step('the doctor is told the Seha registration is pending', r.get('seha_registration') == 'pending', r)
    raw = health_db.find_raw('medicalreports', {'id': cert_id}) or {}
    step('the doctor\'s wording of the reason and the diagnosis are ciphertext in the database', health_db.is_cipher(raw.get('reason')) and health_db.is_cipher(raw.get('diagnosis')), raw.get('reason'))
    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'التهاب حلق فيروسي', 'notes': 'راحة', 'recommendations': 'مراجعة عند الحاجة'})
    step('the doctor finishes the visit', r.ok, r)
    r = doctor.get('/provider/sick-leaves')
    step('the doctor lists the certificates they issued', r.ok and serial in str(r.body), r)

    journey('PT-08: the patient reads the certificate')
    r = pat.get(f'/care/appointments/{aid}/outcomes')
    leaves = r.get('sick_leaves_and_certificates') or []
    leave = next((x for x in leaves if x.get('certificate_kind') == 'sick_leave'), {})
    sl = leave.get('sick_leave') or {}
    step('the visit outcomes list the sick leave with its serial and status', r.ok and leave.get('id') and leave.get('serial') == serial and leave.get('status') == 'issued', leave)
    end = (j_consultation.tomorrow() + datetime.timedelta(days=2)).isoformat()
    step('it carries the days and the dates (the end is the last day off)', sl.get('duration_days') == 3 and str(sl.get('start_date', '')).startswith(start) and str(sl.get('end_date', '')).startswith(end), sl)
    step('it is new until the patient has seen it', leave.get('is_new') is True and (r.get('unseen_count') or 0) >= 1, leave)
    r = pat.get('/care/sick-leaves')
    step('the patient lists their certificates', r.ok and serial in [x.get('serial') for x in r.items()], r)
    r = pat.get(f'/care/sick-leaves/{cert_id}')
    step('the certificate in full: the reason, the consultation, the booking reference; no diagnosis (the doctor did not show it)',
         r.ok and r.get('reason') == 'مرض حاد يحتاج راحة' and r.get('booking_ref') and r.get('consultation_at') and r.get('diagnosis') is None and r.get('days') == 3, r)
    r = pat.get(f'/care/sick-leaves/{cert_id}/pdf')
    ctype = next((v for k, v in r.headers.items() if k.lower() == 'content-type'), '')
    step('the certificate downloads as a PDF', r.ok and 'application/pdf' in ctype and isinstance(r.body, str) and r.body.startswith('%PDF'), f'{r.status} {ctype} {str(r.body)[:12]!r}')
    rep = pat.get(f'/reports/{cert_id}')
    step('the patient opens the report', rep.ok and rep.get('certificate_kind') == 'sick_leave' and (rep.get('sick_leave') or {}).get('duration_days') == 3, rep)
    r = other.get(f'/care/sick-leaves/{cert_id}')
    step('another patient gets 404 on the certificate', r.status == 404, r)
    r = other.get(f'/care/sick-leaves/{cert_id}/pdf')
    step('and on its PDF', r.status == 404, r)
    r = other.get(f'/reports/{cert_id}')
    step('another patient cannot open the report', r.status in (403, 404), r)
    r = pat.req('PATCH', f'/care/appointments/{aid}/outcomes/seen', {})
    step('the patient marks the outcomes seen', r.ok, r)

    journey('PT-08: the Seha number')
    r = pat.get(f'/care/sick-leaves/{cert_id}')
    step('the report says Seha registration is pending', r.ok and r.get('seha_status') == 'pending' and r.get('seha_number') is None, r)
    r = admin.get('/admin/admin/medical-reports/without-seha-number?days=0')
    step('the admin list (reached through the admin panel proxy) shows the report that has no number yet', r.ok and serial in str(r.body), r)
    r = pat.req('PUT', f'/provider/sick-leaves/{cert_id}/seha-number', {'seha_number': 'PGB-12345678'})
    step('a patient cannot set the Seha number', r.status in (401, 403), r)
    r = other_doctor.req('PUT', f'/provider/sick-leaves/{cert_id}/seha-number', {'seha_number': 'PGB-12345678'})
    step('another doctor cannot (404)', r.status == 404, r)
    r = doctor.req('PUT', f'/provider/sick-leaves/{cert_id}/seha-number', {'seha_number': 'no'})
    step('a number of the wrong shape is refused', r.status == 400, r)
    r = doctor.req('PUT', f'/provider/sick-leaves/{cert_id}/seha-number', {'seha_number': 'pgb-12345678'})
    step('the issuing doctor adds the number (kept in capitals)', r.ok and r.get('seha_status') == 'registered' and r.get('seha_number') == 'PGB-12345678', r)
    r = pat.get(f'/care/sick-leaves/{cert_id}')
    step('the report now shows "registered on Seha" with the number', r.ok and r.get('seha_status') == 'registered' and r.get('seha_number') == 'PGB-12345678', r)
    r = pat.get(f'/care/sick-leaves/{cert_id}/pdf')
    step('and its PDF is regenerated', r.ok and isinstance(r.body, str) and r.body.startswith('%PDF'), r.status)
    r = pat.get('/notifications')
    step('the patient was notified of the Seha number', 'seha_added' in str(r.body), 'no seha_added notification')
    r = admin.get('/admin/admin/medical-reports/without-seha-number?days=0')
    step('the admin list does not contain a report that has its number', r.ok and serial not in str(r.body), r)

    journey('PT-08: the public verify page (the QR)')
    anon = Client(None, 'anon')
    r = anon.get(f'/verify/sick-leave/{code}')
    step('anyone with the code sees valid, the dates and the initials', r.ok and r.get('valid') is True and r.get('status') == 'issued' and r.get('days') == 3 and r.get('initials') and r.get('serial') == serial and r.get('seha_registered') is True, r)
    text = str(r.body)
    step('and nothing else: no diagnosis, no reason, no name, no ID, no doctor, not even the Seha number', 'التهاب' not in text and 'مرض حاد' not in text and pid not in text and 'PGB-12345678' not in text and 'doctor' not in text.lower().replace('doctor_id', ''), text)
    r = anon.get('/verify/sick-leave/ABCDEFGH')
    step('an unknown code is 404', r.status == 404, r)

    journey('PT-08: revoking')
    r = pat.post(f'/provider/sick-leaves/{cert_id}/revoke', {'reason': 'x'})
    step('a patient cannot revoke', r.status in (401, 403), r)
    r = other_doctor.post(f'/provider/sick-leaves/{cert_id}/revoke', {'reason': 'x'})
    step('another doctor cannot revoke it (404)', r.status == 404, r)
    r = doctor.post(f'/provider/sick-leaves/{cert_id}/revoke', {'reason': ''})
    step('a revoke needs a reason', r.status == 400, r)
    r = doctor.post(f'/provider/sick-leaves/{cert_id}/revoke', {'reason': 'issued by mistake'})
    step('the doctor revokes it with a reason', r.ok and r.get('status') == 'revoked', r)
    r = doctor.post(f'/provider/sick-leaves/{cert_id}/revoke', {'reason': 'again'})
    step('a second revoke is a conflict', r.status == 409, r)
    r = anon.get(f'/verify/sick-leave/{code}')
    step('the verify page now says revoked', r.ok and r.get('valid') is False and r.get('status') == 'revoked', r)
    r = pat.get(f'/care/sick-leaves/{cert_id}')
    step('the patient sees it as revoked, with the reason', r.ok and r.get('status') == 'revoked' and r.get('revoke_reason') == 'issued by mistake', r)
    r = pat.get(f'/care/appointments/{aid}/outcomes')
    leave = next((x for x in (r.get('sick_leaves_and_certificates') or []) if x.get('certificate_kind') == 'sick_leave'), {})
    step('the outcomes show it revoked and no longer new', r.ok and leave.get('status') == 'revoked' and leave.get('is_new') is False and r.get('unseen_count') == 0, leave)
    r = other.get(f'/care/appointments/{aid}/outcomes')
    step('another patient cannot read the visit outcomes', r.status in (403, 404), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
