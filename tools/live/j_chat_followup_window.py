"""Journey (scenario PT-10, follow-up chat window): the consultation chat is closed before the doctor finishes the visit,
opens when the visit ends, can be closed early by the consultation's doctor (the patient can still read), and the doctor's
one extension reopens it. A second extension is refused. Decision 24 (docs/product/OWNER_DECISIONS_2026-10-06.md).
  - patient: POST /chat/threads/booking on a booked, not-yet-finished visit -> thread exists; a send is refused (403)
  - doctor finishes the visit -> patient send is accepted (201/200)
  - doctor: POST /chat/threads/:id/close -> patient send refused (403); patient GET messages still 200
  - doctor: POST /chat/threads/:id/extend -> patient send accepted again
  - doctor: a second extend is refused (400 thread_already_extended)
  Stack: backend :8002. TEST database only.
"""
import uuid

from lib import Client, journey, step, summary


def send(c, tid, text):
    return c.post(f'/chat/threads/{tid}/messages', {'body': text, 'type': 'text', 'client_message_id': str(uuid.uuid4())},
                  headers={'Idempotency-Key': str(uuid.uuid4())})


def run():
    import j_accounts, j_concurrency, j_consultation
    pat = Client(j_accounts.app_signup(label='chat-followup-window')['token'], 'patient')

    # A fresh doctor, as completed_consultation does, so this journey does not reuse slots from another drill.
    j_concurrency.DOCTOR, j_concurrency.DOCTOR_CLIENT = '', None
    j_concurrency.ensure_doctor()
    doc = j_concurrency.DOCTOR_CLIENT
    step('a doctor client exists', doc is not None, doc)
    if doc is None:
        return summary()
    aid = j_consultation.book_paid(pat, doc)
    step('a paid consultation is booked', bool(aid), aid)
    if not aid:
        return summary()

    journey('chat follow-up window: closed before the visit ends (PT-10)')
    r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid})
    tid = (r.body.get('data') or r.body).get('id') if isinstance(r.body, dict) else None
    step('the booking thread exists before the visit', r.ok and bool(tid), r)
    r = send(pat, tid, 'قبل الزيارة')
    step('a message before the visit ends is refused (403)', r.status == 403, r)

    journey('chat follow-up window: opens when the visit ends (PT-10)')
    for action in ('accept', 'check-in', 'start'):
        if action == 'accept':
            r = doc.post(f'/provider/jobs/consultation/{aid}/accept', {})
        else:
            r = doc.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action} (doctor)', r.ok, r)
    r = doc.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'متابعة', 'notes': 'راحة', 'recommendations': 'مراجعة عند الحاجة'})
    step('doctor finishes the visit', r.ok, r)
    r = send(pat, tid, 'بعد الزيارة')
    step('the patient can message after the visit (window open)', r.ok, r)

    journey('chat follow-up window: the doctor closes it early (PT-10, decision 24)')
    r = doc.post(f'/chat/threads/{tid}/close', {})
    step('the doctor closes the thread', r.ok, r)
    r = send(pat, tid, 'بعد الإغلاق')
    step('a message after the doctor closed it is refused (403)', r.status == 403, r)
    r = pat.get(f'/chat/threads/{tid}/messages')
    step('the patient can still read the thread after it is closed', r.ok, r)
    r = pat.post(f'/chat/threads/{tid}/close', {})
    step('the patient cannot close the thread (only the doctor, 403)', r.status == 403, r)

    journey('chat follow-up window: the doctor extends once (PT-10, decision 24)')
    r = doc.post(f'/chat/threads/{tid}/extend', {})
    step('the doctor extends the window once', r.ok, r)
    r = send(pat, tid, 'بعد التمديد')
    step('the patient can message again after the extension', r.ok, r)
    r = doc.post(f'/chat/threads/{tid}/extend', {})
    step('a second extension is refused (400)', r.status == 400, r)
    j_concurrency.remove_published_doctor()
    summary()


if __name__ == '__main__':
    run()
