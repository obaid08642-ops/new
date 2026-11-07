"""Journey: provider scenarios of docs/qa/SCENARIOS.md that had no journey (PV-07, PV-12, PV-21, PV-22).
  - PV-21 the doctor cancels a booking after accepting it: a reason is required, the patient is refunded in full, the doctor is charged the penalty;
  - PV-22 the doctor marks a no-show: refused before the grace period, accepted after it, the patient sees NO_SHOW and gets no refund;
  - PV-07 a patient review is moderated, the doctor replies once it is published, the reply is public and a foreign doctor cannot answer it;
  - PV-12 the provider invites a staff member by e-mail, the invite is accepted with the mailed token, the member is listed, disabled and revoked.
Stack: backend :8002, admin BFF :3001, smtp_sink :2525, fake_moyasar :9100."""
import datetime
import re
import time

from lib import Client, journey, step, mail_to


def cancel_after_acceptance(pat, doctor):
    """PV-21."""
    import j_consultation
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    journey('PV-21: the doctor cancels after accepting')
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    incoming = [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]
    if aid in incoming:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('the doctor accepts the booking', r.ok, r)
    r = doctor.req('PATCH', f'/care/appointments/{aid}/cancel', {})
    step('cancelling without a reason is refused (cancel_reason_required)', r.status == 400 and 'cancel_reason_required' in str(r.body), r)
    r = doctor.req('PATCH', f'/care/appointments/{aid}/cancel', {'reason': 'الطبيب في حالة طارئة'})
    step('the doctor cancels with a reason', r.ok, r)
    r = pat.get(f'/care/appointments/{aid}')
    step('the patient sees the booking as CANCELLED with the doctor\'s reason',
         r.ok and str(r.get('status')).upper() == 'CANCELLED' and 'طارئة' in str(r.get('cancellation_reason')), r)
    step('the patient is refunded in full (100%) and the doctor carries the penalty', r.get('refund_percentage') == 100 and (r.get('doctor_penalty') or 0) > 0,
         {k: r.get(k) for k in ('refund_percentage', 'doctor_penalty', 'refund_destination')})
    r = doctor.req('PATCH', f'/care/appointments/{aid}/cancel', {'reason': 'مرة ثانية'})
    step('a cancelled booking cannot be cancelled again', not r.ok, r)
    r = doctor.get('/provider/jobs/queue?status=active&kind=consultation')
    step('the cancelled booking is not in the doctor\'s active queue', aid not in str(r.body), r.status)


def no_show(pat, doctor):
    """PV-22."""
    import j_consultation, db_raw
    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    journey('PV-22: the doctor marks a no-show')
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    if aid in [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]:
        r = doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
        step('the doctor accepts the booking', r.ok, r)
    r = doctor.post('/calls/provider/no-show', {'appointment_id': aid})
    step('a no-show cannot be recorded before the visit time (no_show_too_early)', r.status == 400 and 'no_show_too_early' in str(r.body), r)
    started = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=30)).isoformat()
    ended = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=0)).isoformat()
    changed = db_raw.set_raw('appointments', {'id': aid}, {'slot_start': {'$date': started}})
    moved_lock = db_raw.set_raw('slotlocks', {'booking_id': aid}, {'slot_start': {'$date': started}, 'slot_end': {'$date': ended}})   # the hold follows the visit time
    step('test data: the slot and its hold are moved to 30 minutes ago (the visit time cannot be waited for)', changed == 1 and moved_lock == 1, f'{changed} {moved_lock}')
    r = doctor.post('/calls/provider/no-show', {'appointment_id': aid})
    step('after the grace period the doctor records the no-show', r.ok, r)
    r = pat.get(f'/care/appointments/{aid}')
    step('the patient sees NO_SHOW', r.ok and str(r.get('status')).upper() == 'NO_SHOW', r)
    step('a no-show carries no refund', (r.get('refund_percentage') or 0) == 0, r.get('refund_percentage'))
    r = doctor.post('/calls/provider/no-show', {'appointment_id': aid})
    step('a second no-show is refused', r.status == 400 and 'appointment_not_no_show_eligible' in str(r.body), r)
    other = doctor.post('/calls/provider/no-show', {'appointment_id': '00000000-0000-4000-8000-00000000dead'})
    step('an appointment that is not the doctor\'s is not found', other.status == 404, other)


def review_reply(pat, doctor, other_doctor):
    """PV-07: the patient's review exists (j_consultation.run rated the doctor 5 stars through POST /patient-ux/review)."""
    journey('PV-07: the doctor answers a published review')
    r = doctor.get('/provider/reviews')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('the doctor lists the reviews received', r.ok, r)
    mine = next((x for x in rows if 'طبيب ممتاز' in str(x.get('comment'))), None)
    step('the review the patient wrote in the app is listed, published, with its stars', bool(mine) and mine.get('status') == 'published' and mine.get('score') == 5, mine or len(rows))
    if not mine:
        return
    rid = mine.get('id')
    r = other_doctor.post(f'/provider/reviews/{rid}/reply', {'reply': 'ليست مراجعتي'})
    step('another doctor cannot answer it (404)', r.status == 404, r)
    r = doctor.post(f'/provider/reviews/{rid}/reply', {'reply': '  '})
    step('an empty reply is refused', r.status == 400, r)
    r = doctor.post(f'/provider/reviews/{rid}/reply', {'reply': 'س' * 1001})
    step('a reply over 1000 characters is refused', r.status == 400, r)
    reply = 'شكراً لثقتكم، نتمنى لكم الشفاء العاجل'
    r = doctor.post(f'/provider/reviews/{rid}/reply', {'reply': reply})
    step('the doctor answers the published review', r.ok, r)
    r = doctor.get('/provider/reviews')
    row = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('id') == rid), {})
    step('the doctor sees the reply on the review', row.get('reply') == reply and row.get('reply_at'), row)
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    page = pat.get(f'/care/doctors/{prof_id}')
    shown = next((x for x in (page.get('reviews_data') or []) if x.get('id') == rid), {})
    step('the doctor\'s public page shows the reply under the review', page.ok and shown.get('reply') == reply, shown or page.status)


def low_star_moderation(pat, doctor, admin):
    """PV-07 (the part the apps hit): a review under 3 stars waits for a moderator, and only then can the doctor answer it."""
    import j_consultation
    aid = j_consultation.book_paid(pat, doctor, slot_index=3)   # the first slots are used by the visits before
    if not aid:
        return
    journey('PV-07: a low-star review is moderated before the doctor can answer it')
    r = doctor.get('/provider/jobs/queue?status=incoming&kind=consultation')
    if aid in [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]:
        doctor.post(f'/provider/jobs/consultation/{aid}/accept', {})
    for action in ('check-in', 'start'):
        doctor.req('PATCH', f'/care/appointments/{aid}/{action}', {})
    r = doctor.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'متابعة', 'notes': 'راحة', 'recommendations': 'مراجعة عند الحاجة'})
    step('the second visit is finished', r.ok, r)
    comment = 'الانتظار كان طويلاً جداً'
    r = pat.post('/patient-ux/review', {'booking_kind': 'consultation', 'booking_id': aid, 'rating': 2, 'comment': comment, 'aspects': {}, 'anonymous': False})
    rid = r.get('id')
    step('the patient rates the visit 2 stars', r.ok and rid and r.get('status') == 'pending_review', r)
    r = doctor.get('/provider/reviews')
    row = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('id') == rid), {})
    step('the doctor sees it as waiting for moderation', r.ok and row.get('score') == 2 and row.get('status') == 'pending', row)
    r = doctor.post(f'/provider/reviews/{rid}/reply', {'reply': 'نعتذر عن الانتظار'})
    step('and cannot answer it yet (review_not_published)', r.status == 400 and 'review_not_published' in str(r.body), r)
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    page = pat.get(f'/care/doctors/{prof_id}')
    step('it is not on the doctor\'s public page', page.ok and not any(x.get('id') == rid for x in (page.get('reviews_data') or [])), page.status)
    r = admin.get('/admin/admin/ratings/pending')
    pend = (r.body.get('data') if isinstance(r.body, dict) else r.items()) or []
    queued = next((x for x in pend if x.get('id') == rid), {})
    step('the admin moderation queue holds it, with the reviewer\'s name', r.ok and queued.get('score') == 2 and queued.get('user_name') and queued.get('comment') == comment, queued or r.status)
    r = admin.post(f'/admin/admin/ratings/{rid}/approve', {})
    step('the admin approves it', r.ok and r.get('status') == 'published', r)
    r = admin.get('/admin/admin/ratings/pending')
    pend = (r.body.get('data') if isinstance(r.body, dict) else r.items()) or []
    step('it leaves the queue', r.ok and not any(x.get('id') == rid for x in pend), r.status)
    r = admin.post(f'/admin/admin/ratings/{rid}/approve', {})
    step('approving it again is refused (review_not_pending)', r.status == 404, r)
    r = doctor.post(f'/provider/reviews/{rid}/reply', {'reply': 'نعتذر عن الانتظار ونعمل على تقليله'})
    step('now the doctor answers it', r.ok, r)
    page = pat.get(f'/care/doctors/{prof_id}')
    shown = next((x for x in (page.get('reviews_data') or []) if x.get('id') == rid), {})
    step('the public page shows the review with the reply', page.ok and shown.get('rating') == 2 and 'نعتذر' in str(shown.get('reply')), shown or page.status)


def staff_invite(doctor):
    """PV-12."""
    journey('PV-12: the provider invites a staff member')
    email = f'{__import__("lib").uniq("staff")}@example.test'
    t0 = time.time()
    r = doctor.post('/provider/operators/invite', {'email': email, 'role': 'cashier', 'permissions': [], 'full_name': 'موظف الاستقبال'})
    step('the provider invites a cashier by e-mail', r.ok and r.get('status') == 'invited', r)
    oid = r.get('id')
    r = doctor.post('/provider/operators/invite', {'email': email, 'role': 'cashier', 'permissions': []})
    step('inviting the same e-mail twice is refused (409)', r.status == 409, r)
    r = doctor.post('/provider/operators/invite', {'email': f'{__import__("lib").uniq("o")}@example.test', 'role': 'owner', 'permissions': []})
    step('nobody can be invited as the owner', r.status == 400, r)
    mails = mail_to(email, t0)
    step('the invite is mailed to the member', bool(mails), email)
    token = None
    if mails:
        m = re.search(r'token=([0-9a-f]{64})', mails[-1]['body'])
        token = m.group(1) if m else None
    step('the mail carries the accept link with its token', bool(token), (mails[-1]['body'][:120] if mails else ''))
    anon = Client(None, 'anon')
    r = anon.post('/provider/operators/accept-invite', {'token': '0' * 64, 'email': email, 'password': 'Staff!Pass-2026x'})
    step('a wrong token is refused', r.status in (400, 404), r)
    if token:
        r = anon.post('/provider/operators/accept-invite', {'token': token, 'email': email, 'full_name': 'موظف الاستقبال', 'password': 'Staff!Pass-2026x'})
        step('the member accepts the invite with the mailed token', r.ok and r.get('status') == 'active', r)
        r = anon.post('/provider/operators/accept-invite', {'token': token, 'email': email, 'password': 'Staff!Pass-2026x'})
        step('the token works once', r.status in (400, 404), r)
    r = doctor.get('/provider/operators')
    rows = r.body if isinstance(r.body, list) else r.items()
    row = next((x for x in rows if x.get('id') == oid), {})
    step('the member is listed as active', r.ok and row.get('status') == 'active' and row.get('role') == 'cashier', row)
    r = doctor.post(f'/provider/operators/{oid}/disable', {'reason': 'journey check'})
    step('the provider disables the member', r.ok and r.get('status') == 'disabled', r)
    r = doctor.post(f'/provider/operators/{oid}/enable', {})
    step('and enables the member again', r.ok and r.get('status') == 'active', r)
    r = doctor.delete(f'/provider/operators/{oid}')
    step('the provider revokes the member', r.ok, r)
    r = doctor.get('/provider/operators')
    row = next((x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('id') == oid), {})
    step('a revoked member is no longer active', row.get('status') != 'active', row)


def licence_expiry(admin, doctor):
    """PV-08 / PV-09: a licence close to its end warns the provider; an expired one suspends the account and its login."""
    import datetime, db_raw
    journey('PV-08/PV-09: licence expiry warning, then suspension')
    me = doctor.get('/auth/me')
    uid = me.get('id') or me.get('user', 'id')
    step('the provider account is known', me.ok and uid, me)
    flt = {'$or': [{'account_id': uid}, {'user_id': uid}]}
    soon = (datetime.datetime.utcnow() + datetime.timedelta(days=20)).strftime('%Y-%m-%dT00:00:00Z')
    # TEST DATABASE ONLY: a licence cannot reach its end in real time, so its stored expiry date is moved.
    step('test setup: licence ends in 20 days', db_raw.set_raw('provider_profiles', flt, {'license_expiry_date': {'$date': soon}}) == 1)
    r = admin.post('/admin/providers/license-monitor/run', {})
    step('admin runs the licence monitor', r.ok, r)
    r = doctor.get('/notifications')
    items = r.body if isinstance(r.body, list) else r.items()
    warned = [n for n in items if 'license_expiring' in str(n)]
    step('PV-08: the provider got a licence-expiring warning', r.ok and warned, r)
    r = doctor.get('/auth/me')
    step('PV-08: the account is still active after the warning', r.ok, r)
    past = (datetime.datetime.utcnow() - datetime.timedelta(days=1)).strftime('%Y-%m-%dT00:00:00Z')
    step('test setup: licence ended yesterday', db_raw.set_raw('provider_profiles', flt, {'license_expiry_date': {'$date': past}}) == 1)
    r = admin.post('/admin/providers/license-monitor/run', {})
    step('admin runs the licence monitor again', r.ok, r)
    r = doctor.get('/provider/profile')
    step('PV-09: the provider profile is suspended', (not r.ok) or r.get('status') == 'suspended', r)
    r = doctor.get('/auth/me')
    step('PV-09: the login no longer works', not r.ok, r)


if __name__ == '__main__':
    import os
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
    pa = j_accounts.app_signup(label='scenario-patient')
    pat = Client(pa['token'], 'patient')
    cancel_after_acceptance(pat, doc)
    no_show(pat, doc)
    j_consultation.run(pat, doc, admin)   # a completed visit with the patient's 5-star review
    review_reply(pat, doc, doctor_account())
    low_star_moderation(pat, doc, admin)
    staff_invite(doc)
    licence_expiry(admin, doctor_account())
    summary()
