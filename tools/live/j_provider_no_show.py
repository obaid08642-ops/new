"""Journey PV-23 (owner decision 7, 2026-11-10): a provider who did not come. The patient reports it once the visit is 10 minutes late and it never started.
  - a CLINIC visit is HELD: nothing is refunded and the doctor has 24 hours to dispute it; the doctor disputes, an admin upholds the patient's report, and the refund (100%) follows;
  - a VIDEO visit is refunded at once, but only twice per patient in 30 days: the third report waits for an admin, who refunds it.
  Test data: the visit time cannot be waited for, so the slot and its hold are moved to 30 minutes ago in the test database (db_raw refuses a database that is not a test one).
  Stack: backend :8002, admin BFF :3001, fake_moyasar :9100."""
import datetime
import time
import uuid

from lib import Client, journey, step


def _accept(doctor, aid):
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    if aid in [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('the doctor accepts the booking', r.ok, r)


def _move_into_the_past(aid):
    import db_raw
    start = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=30)).isoformat()
    end = datetime.datetime.now(datetime.timezone.utc).isoformat()
    a = db_raw.set_raw('appointments', {'id': aid}, {'slot_start': {'$date': start}})
    b = db_raw.set_raw('slotlocks', {'booking_id': aid}, {'slot_start': {'$date': start}, 'slot_end': {'$date': end}})
    step('test data: the slot and its hold are moved to 30 minutes ago', a == 1 and b == 1, f'{a} {b}')


def _book(pat, doctor_profile_id, stype, used):
    import j_consultation
    day = j_consultation.tomorrow().isoformat()
    r = pat.get(f'/care/doctors/{doctor_profile_id}/slots?date={day}&service_type={stype}')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s.get('start') or s.get('slot_start') for s in slots if isinstance(s, dict) and s.get('available', True)]
    free = [s for s in free if s not in used]
    step(f'{stype}: a free slot', bool(free), r)
    if not free:
        return None
    slot = free[0]
    used.append(slot)
    lock = pat.post('/slot-locks/reserve', {'provider_id': doctor_profile_id, 'booking_kind': 'consultation', 'slot_start': slot}).get('id')
    r = pat.post('/care/appointments', {'doctor_id': doctor_profile_id, 'service_type': stype, 'slot_start': slot, 'payment_method': 'card', 'slot_lock_id': lock},
                 headers={'Idempotency-Key': f'appointment-create-{doctor_profile_id}-{slot}-{uuid.uuid4()}'})
    aid = r.get('id')
    step(f'{stype}: booked', r.ok and aid, r)
    if not aid or not j_consultation.pay_card(pat, aid):
        return None
    return aid


def _wait_cancelled(pat, aid):
    r = None
    for _ in range(20):
        r = pat.get(f'/care/appointments/{aid}')
        if r.ok and str(r.get('status')).upper() == 'CANCELLED':
            return r
        time.sleep(1.0)
    return r


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic', 'video']})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin, service_types=('clinic', 'video'))
    did = doctor.get('/provider-onboarding/my-profile').get('id')
    pat = Client(j_accounts.app_signup(label='noshow-pat')['token'], 'patient')
    j_consultation.accept_telehealth_consent(pat)
    used = []

    journey('PV-23: a clinic visit the doctor did not attend is held, then decided by an admin')
    aid = _book(pat, did, 'clinic', used)
    if not aid:
        return
    _accept(doctor, aid)
    r = pat.post(f'/care/appointments/{aid}/provider-no-show', {})
    step('before the visit time a report is refused (provider_no_show_too_early)', r.status == 400 and 'provider_no_show_too_early' in str(r.body), r)
    _move_into_the_past(aid)
    r = pat.post(f'/care/appointments/{aid}/provider-no-show', {})
    step('the patient reports it: the answer is "held" with the time the refund is due', r.ok and r.get('status') == 'held' and bool(r.get('refund_after')), r)
    r = pat.get(f'/care/appointments/{aid}')
    step('nothing is refunded yet: the booking is not cancelled', r.ok and str(r.get('status')).upper() != 'CANCELLED', r.get('status'))
    r = doctor.get('/provider/no-show-reports')
    rows = r.body.get('items') if isinstance(r.body, dict) else r.items()
    mine = next((x for x in (rows or []) if x.get('appointment_id') == aid), None)
    step('the doctor sees the report on their visit, held', r.ok and bool(mine) and mine.get('status') == 'held', mine or r)
    r = doctor.post(f'/provider/no-show-reports/{aid}/dispute', {'reason': 'x'})
    step('a dispute needs a real reason (too short is refused)', r.status == 400, r)
    r = doctor.post(f'/provider/no-show-reports/{aid}/dispute', {'reason': 'I was at the clinic, the patient did not arrive in time'})
    step('the doctor disputes it with a reason', r.ok, r)
    r = admin.get('/admin/admin/provider-no-show-reports?status=disputed')
    rows = r.body.get('items') if isinstance(r.body, dict) else r.items()
    step('the admin sees the disputed report', r.ok and any(x.get('appointment_id') == aid for x in (rows or [])), r)
    r = pat.post(f'/care/appointments/{aid}/provider-no-show', {})
    step('reporting twice does not start a second refund', not (r.ok and r.get('status') == 'refunded'), r)
    r = admin.post(f'/admin/admin/provider-no-show-reports/{aid}/decide', {'decision': 'uphold_report', 'note': 'no check-in and no call recorded by the doctor'})
    step('the admin upholds the patient\'s report', r.ok, r)
    r = _wait_cancelled(pat, aid)
    step('the visit is cancelled as a provider no-show and refunded in full', r.ok and str(r.get('status')).upper() == 'CANCELLED' and r.get('refund_percentage') == 100 and r.get('cancellation_reason') == 'provider_no_show',
         {k: r.get(k) for k in ('status', 'refund_percentage', 'cancellation_reason')})

    journey('PV-23: video visits are refunded at once, the third in 30 days waits for an admin')
    # the clinic refund above (admin-upheld) does not count toward the cap: only automatic video refunds do
    video = []
    for i in range(3):
        v = _book(pat, did, 'video', used)
        if not v:
            return
        _accept(doctor, v)
        _move_into_the_past(v)
        video.append(v)
    for i, v in enumerate(video[:2]):
        r = pat.post(f'/care/appointments/{v}/provider-no-show', {})
        step(f'video report {i + 1}: refunded at once', r.ok and r.get('status') == 'refunded', r)
        r = pat.get(f'/care/appointments/{v}')
        step(f'video report {i + 1}: cancelled with 100% back', r.ok and str(r.get('status')).upper() == 'CANCELLED' and r.get('refund_percentage') == 100, r.get('refund_percentage'))
    third = video[2]
    r = pat.post(f'/care/appointments/{third}/provider-no-show', {})
    step('video report 3: waits for an admin (pending_review), nothing refunded', r.ok and r.get('status') == 'pending_review', r)
    r = pat.get(f'/care/appointments/{third}')
    step('video report 3: the booking is not cancelled yet', r.ok and str(r.get('status')).upper() != 'CANCELLED', r.get('status'))
    r = admin.get('/admin/admin/provider-no-show-reports?status=pending_review')
    rows = r.body.get('items') if isinstance(r.body, dict) else r.items()
    step('the admin sees it waiting for review', r.ok and any(x.get('appointment_id') == third for x in (rows or [])), r)
    r = admin.post(f'/admin/admin/provider-no-show-reports/{third}/review', {'decision': 'refund', 'note': 'doctor never joined the call'})
    step('the admin refunds it', r.ok, r)
    r = _wait_cancelled(pat, third)
    step('the third visit is then cancelled and refunded in full', r.ok and str(r.get('status')).upper() == 'CANCELLED' and r.get('refund_percentage') == 100, r.get('refund_percentage'))


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
