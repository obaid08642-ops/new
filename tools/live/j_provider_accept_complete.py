"""Journey (scenario PV-16 / provider order lifecycle, consultation side): the doctor accepts a paid consultation, the
visit is checked in and started, and the doctor completes it. A completed visit is then read back as completed.
Built on j_concurrency.completed_consultation (which runs accept, check-in, start and complete as the apps do them).
  - the paid consultation is accepted by the doctor (POST /provider/:id/accept, in the helper)
  - the doctor completes it (PATCH /care/appointments/:id/complete, in the helper)
  - the patient reads the visit as completed (GET /care/appointments/:id)
  - a second completion is refused by the state rule (400/409/422)
  Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary


def appt(r):
    b = r.body if isinstance(r.body, dict) else {}
    for inner in (b, b.get('data') or {}, b.get('appointment') or {}):
        if isinstance(inner, dict) and 'status' in inner:
            return inner
    return {}


def run():
    import j_accounts, j_concurrency
    pat = Client(j_accounts.app_signup(label='accept-complete')['token'], 'patient')
    aid = j_concurrency.completed_consultation(pat)
    step('a paid consultation is accepted, started and completed by the doctor', bool(aid), aid)
    if not aid:
        return summary()

    journey('provider accept to complete (PV-16)')
    a = appt(pat.get(f'/care/appointments/{aid}'))
    step('the patient reads the visit as completed', str(a.get('status', '')).lower() == 'completed', a.get('status'))
    doc = j_concurrency.DOCTOR_CLIENT
    r = doc.req('PATCH', f'/care/appointments/{aid}/complete', None, headers={'Idempotency-Key': __import__('uuid').uuid4().__str__()})
    step('a second completion is refused by the state rule (400/409/422)', r.status in (400, 409, 422), r)
    summary()


if __name__ == '__main__':
    run()
