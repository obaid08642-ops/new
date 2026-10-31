"""Journey (chat receipts): the patient sends a message in the appointment conversation; the doctor's device reports
delivery and reading through POST /chat/threads/:id/delivered and /read; the sender's view carries the receipts.
  - sent: a new message has no delivered and no read receipt from the other side;
  - delivered: after the doctor's delivered call, the message lists the doctor in delivered_to and not yet in read_by;
  - seen: after the doctor's read call, the message lists the doctor in read_by (read implies delivered);
  - the patient's own read call does not mark the patient's own message as read by anyone else;
  - a stranger who is not in the conversation cannot report receipts for the thread (refused: 403 or 404).
The receipts are stored server-side; the tick text is computed by the clients (patient-app src/chat/chatState.ts)."""
import uuid

from lib import Client, journey, step, summary


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def msg_by_id(pat, tid, mid):
    r = pat.get(f'/chat/threads/{tid}/messages')
    body = r.body if isinstance(r.body, dict) else {}
    for m in (body.get('messages') or rows(r)):
        if isinstance(m, dict) and m.get('id') == mid:
            return m
    return None


def main():
    import j_accounts, j_concurrency
    pat = Client(j_accounts.app_signup(label='chat-receipts-patient')['token'], 'patient')
    aid = j_concurrency.completed_consultation(pat)
    doctor = j_concurrency.DOCTOR_CLIENT
    step('a completed consultation exists for the receipts journey', bool(aid), aid)
    if not aid:
        summary()
        return

    journey('chat receipts: the patient sends a message in the appointment conversation')
    r = pat.post('/chat/threads/booking', {'booking_kind': 'consultation', 'booking_id': aid})
    tid = (r.body.get('data') or r.body).get('id') if isinstance(r.body, dict) else None
    step('the appointment conversation opens for the patient', r.ok and bool(tid), r)
    if not tid:
        summary()
        return
    cmid = str(uuid.uuid4())
    r = pat.post(f'/chat/threads/{tid}/messages', {'body': 'رسالة اختبار للإيصالات', 'type': 'text', 'client_message_id': cmid},
                 headers={'Idempotency-Key': str(uuid.uuid4())})
    mid = (r.body.get('data') or r.body).get('id') if isinstance(r.body, dict) else None
    step('the patient sends a message', r.ok and bool(mid), r)
    if not mid:
        summary()
        return
    m = msg_by_id(pat, tid, mid)
    pat_id = pat.get('/auth/me').get('id')
    # the server records the sender as delivered and read on its own message at send; no other participant yet
    others = [x for x in (m.get('delivered_to') or []) + (m.get('read_by') or []) if x != pat_id] if m else None
    step('sent: no receipt from anyone but the sender yet', m is not None and others == [], m)

    journey('chat receipts: the doctor reports delivery and reading')
    r = doctor.post(f'/chat/threads/{tid}/delivered', {})
    step('the doctor reports delivery (POST /chat/threads/:id/delivered)', r.ok, r)
    m = msg_by_id(pat, tid, mid)
    me_doc = doctor.get('/auth/me')
    doc_id = me_doc.get('id') if isinstance(me_doc.body, dict) else None
    step('delivered: the doctor is in delivered_to', m is not None and doc_id in (m.get('delivered_to') or []), m)
    step('delivered: the doctor is not yet in read_by', m is not None and doc_id not in (m.get('read_by') or []), m)

    r = doctor.post(f'/chat/threads/{tid}/read', {'up_to_message_id': mid})
    step('the doctor reports reading (POST /chat/threads/:id/read)', r.ok, r)
    m = msg_by_id(pat, tid, mid)
    step('seen: the doctor is in read_by', m is not None and doc_id in (m.get('read_by') or []), m)

    journey('chat receipts: the patient cannot mark the patient\'s own message as read by someone else, and a stranger is refused')
    r = pat.post(f'/chat/threads/{tid}/read', {})
    step('the patient\'s own read call is accepted (POST /chat/threads/:id/read)', r.ok, r)
    m = msg_by_id(pat, tid, mid)
    readers = set(m.get('read_by') or []) if m else None
    step('the patient\'s own read adds no one else: read_by holds only the sender and the doctor', m is not None and readers <= {pat_id, doc_id}, m)
    stranger = Client(j_accounts.app_signup(label='chat-receipts-stranger')['token'], 'patient')
    r = stranger.post(f'/chat/threads/{tid}/read', {})
    # 404 thread_not_found is the server's answer for a stranger (the thread's existence is not revealed); 403 is also a refusal
    step('a stranger who is not in the conversation is refused (403, or 404 thread_not_found)', r.status in (403, 404), r)
    summary()


if __name__ == '__main__':
    main()
