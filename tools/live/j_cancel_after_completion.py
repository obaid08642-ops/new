"""Journey (scenario PT-47, the walk's P0): a patient cancels a consultation that the doctor has already finished. The
cancel is refused, the visit stays completed, and no refund is booked for it (main: the state change comes first in
appointments.service.ts cancel(), so an illegal move throws before any refund figure or refund event).
  - patient: POST /unified-bookings/consultation/:id/cancel (the one patient cancel route) on a completed visit -> refused (4xx), not 2xx
  - patient: GET /care/appointments/:id -> still `completed`, no refund percentage stored
  - the same visit cannot be cancelled a second time either
  Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary


def appt(r):
    """The appointment's fields, whether the read answers them at the top level or wrapped."""
    b = r.body if isinstance(r.body, dict) else {}
    for inner in (b, b.get('data') or {}, b.get('appointment') or {}):
        if isinstance(inner, dict) and 'status' in inner:
            return inner
    return {}


def run():
    import j_accounts, j_concurrency
    pat = Client(j_accounts.app_signup(label='cancel-after-completion')['token'], 'patient')
    aid = j_concurrency.completed_consultation(pat)
    step('a paid consultation the doctor finished exists', bool(aid), aid)
    if not aid:
        return summary()

    journey('cancel after completion: the cancel is refused (PT-47)')
    before = appt(pat.get(f'/care/appointments/{aid}'))
    step('the visit is completed before the cancel', str(before.get('status', '')).lower() == 'completed', before.get('status'))
    r = pat.post(f'/unified-bookings/consultation/{aid}/cancel', {'reason': 'qa: after the visit'}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('the patient cancel after completion is refused by the state rule (400/409/422, not a missing route)', r.status in (400, 409, 422), r)
    after = appt(pat.get(f'/care/appointments/{aid}'))
    step('the visit is still completed', str(after.get('status', '')).lower() == 'completed', after.get('status'))
    step('no refund figure is stored for the refused cancel', after.get('refund_percentage') in (None, 0), after.get('refund_percentage'))
    step('the cancellation reason is not stored', not after.get('cancellation_reason'), after.get('cancellation_reason'))

    journey('cancel after completion: a second attempt is refused too (PT-47)')
    r = pat.post(f'/unified-bookings/consultation/{aid}/cancel', {'reason': 'qa: second try'}, headers={'Idempotency-Key': str(uuid.uuid4())})
    step('a second cancel is refused by the state rule (400/409/422, not a missing route)', r.status in (400, 409, 422), r)
    summary()


if __name__ == '__main__':
    run()
