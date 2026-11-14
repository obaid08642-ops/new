"""Journey PT-54: the patient hides a finished visit from their own history and shows it again.
  Only the owner can; only a COMPLETED or CANCELLED visit can be hidden (400 visit_not_finished otherwise); the visit itself (invoice, record) is untouched;
  the timeline leaves it out unless include_hidden=1, then every row says `hidden`. Idempotent. Stack: backend :8002."""
import uuid

from lib import Client, journey, step


def _rows(r):
    b = r.body
    return b if isinstance(b, list) else (b.get('data') or b.get('items') or []) if isinstance(b, dict) else []


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
    pat = Client(j_accounts.app_signup(label='hide-pat')['token'], 'patient')
    other = Client(j_accounts.app_signup(label='hide-other')['token'], 'patient')

    aid = j_consultation.book_paid(pat, doctor)
    if not aid:
        return
    journey('PT-54: an open visit cannot be hidden')
    r = pat.post(f'/unified-bookings/consultation/{aid}/hide', {})
    step('hiding a visit that is still open is refused (visit_not_finished)', r.status == 400 and 'visit_not_finished' in str(r.body), r)

    journey('PT-54: the patient cancels, then hides and shows the visit again')
    r = pat.post(f'/unified-bookings/consultation/{aid}/cancel', {'reason': 'qa: hide journey'}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('the patient cancels the visit', r.ok, r)
    r = other.post(f'/unified-bookings/consultation/{aid}/hide', {})
    step('another patient cannot hide it', r.status in (403, 404), r)
    r = pat.get('/unified-bookings/mine?kind=consultation')
    step('the cancelled visit is in the timeline before it is hidden', r.ok and any(x.get('id') == aid for x in _rows(r)), r.status)
    r = pat.post(f'/unified-bookings/consultation/{aid}/hide', {})
    step('the patient hides the cancelled visit', r.ok and r.get('hidden') is True, r)
    r = pat.post(f'/unified-bookings/consultation/{aid}/hide', {})
    step('hiding twice is harmless (idempotent)', r.ok and r.get('hidden') is True, r)
    r = pat.get('/unified-bookings/mine?kind=consultation')
    step('the timeline leaves it out', r.ok and not any(x.get('id') == aid for x in _rows(r)), r.status)
    r = pat.get('/unified-bookings/mine?kind=consultation&include_hidden=1')
    row = next((x for x in _rows(r) if x.get('id') == aid), None)
    step('with include_hidden=1 it is back and says hidden', r.ok and bool(row) and row.get('hidden') is True, row or r.status)
    r = pat.get(f'/care/appointments/{aid}')
    step('the visit itself is untouched (still cancelled, still readable)', r.ok and str(r.get('status')).upper() == 'CANCELLED', r.get('status'))
    r = pat.post(f'/unified-bookings/consultation/{aid}/unhide', {})
    step('the patient shows it again', r.ok and r.get('hidden') is False, r)
    r = pat.get('/unified-bookings/mine?kind=consultation')
    row = next((x for x in _rows(r) if x.get('id') == aid), None)
    step('it is back in the timeline, not hidden', r.ok and bool(row) and not row.get('hidden'), row or r.status)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
