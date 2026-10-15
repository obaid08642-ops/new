"""Journey: book and pay a consultation for a family member (issue 684).
  patient-app FamilyMemberView "book" -> the doctor's slots -> BookingConfirmForm sends for_member_id: the appointment is the
  member's (patient_id) and booked by the owner (booked_by_user_id); the owner pays it by card (capabilities -> intent ->
  verify) and the transaction records the payer. Someone outside the family cannot book for the member.
  Stack: backend :8002.
"""
import uuid

from lib import Client, journey, step


def main():
    import j_admin, j_accounts, j_onboarding, j_consultation
    from j_nursing import fake_pay
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    d = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, d)
    j_onboarding.provider_after_approval(d)
    doctor = Client(d['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doctor, admin)

    owner = Client(j_accounts.app_signup(label='fam-booker')['token'], 'patient')
    member_acct = j_accounts.app_signup(label='fam-member')
    member = Client(member_acct['token'], 'patient')
    stranger = Client(j_accounts.app_signup(label='fam-stranger')['token'], 'patient')
    member_id = (member_acct.get('user') or {}).get('id') or member.get('/auth/me').get('id')

    journey('issue 684: the member is in the owner\'s family')
    r = owner.post('/family/create', {'name': 'عائلة الحجز'})
    step('the owner creates the family', r.ok, r)
    code = owner.post('/family/invite', {}).get('invite_code')
    r = member.post('/family/join', {'invite_code': code or '', 'relation': 'child'})
    step('the member joins with the invite code', r.ok, r)

    journey('issue 684: the owner books for the member')
    prof_id = doctor.get('/provider-onboarding/my-profile').get('id')
    day = j_consultation.tomorrow().isoformat()
    r = owner.get(f'/care/doctors/{prof_id}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    free = [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]
    step('the doctor has free clinic slots tomorrow', r.ok and free, r)
    if not free:
        return
    s0 = free[0]
    slot = (s0.get('start') or s0.get('slot_start') or s0.get('time')) if isinstance(s0, dict) else s0
    body = {'doctor_id': prof_id, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card', 'for_member_id': member_id}
    r = stranger.post('/care/appointments', body, headers={'Idempotency-Key': f'appt-stranger-{uuid.uuid4()}'})
    step('someone outside the family cannot book for the member', r.status == 403, r)
    lock = owner.post('/slot-locks/reserve', {'provider_id': prof_id, 'booking_kind': 'consultation', 'slot_start': slot}).get('id')
    r = owner.post('/care/appointments', {**body, 'slot_lock_id': lock}, headers={'Idempotency-Key': f'appt-member-{uuid.uuid4()}'})
    aid = r.get('id')
    step('the appointment is created', r.ok and aid, r)
    if not aid:
        return
    a = owner.get(f'/care/appointments/{aid}')
    step('the appointment is the member\'s, booked by the owner', a.get('patient_id') == member_id and a.get('booked_by_user_id') not in (None, member_id), a)

    journey('issue 684: the owner pays for the member\'s visit')
    r = owner.get(f'/payments/consultation/{aid}/capabilities')
    step('card is offered to the owner for this booking', r.ok and any(m.get('id') == 'card' for m in (r.get('methods') or [])), r)
    r = owner.post(f'/payments/intent/consultation/{aid}', {'method': 'card'}, headers={'Idempotency-Key': f'payment-consultation-{aid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('the owner gets an https checkout link', r.ok and str(txn.get('checkout_url', '')).startswith('https://'), r)
    if txn.get('gateway_intent_id'):
        fake_pay(txn['gateway_intent_id'])
        r = owner.post(f"/payments/verify/{txn['id']}", {})
        step('the payment is verified', r.ok and r.get('status') == 'paid', r)
    r = member.get(f'/care/appointments/{aid}')
    step('the member sees the visit paid', r.ok and r.get('payment_status') == 'paid', r)
    r = stranger.get(f'/payments/consultation/{aid}/capabilities')
    step('a stranger cannot pay for it', r.status in (403, 404), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
