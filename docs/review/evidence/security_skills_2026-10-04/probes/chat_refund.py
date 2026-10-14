import sys, json, seclib
from lib import Client
name, api = sys.argv[1], sys.argv[2]
seclib.use(api)
A = seclib.signup('stranger'); B = seclib.signup('target')
a, b = Client(A['token']), Client(B['token'])
d = a.post('/chat/threads/direct', {'other_user_id': B['user']['id']})
print(f'[{name}] chat: stranger A -> direct thread to unrelated B: {d.status} {str(d.body)[:100]}')
g = a.post('/chat/threads/group', {'name': 'hello', 'participant_ids': [B['user']['id']]})
tid = g.get('id')
print(f'[{name}] chat: stranger A -> group thread with B: {g.status} id={tid}')
m = a.post(f'/chat/threads/{tid}/messages', {'body': 'synthetic unsolicited message'})
print(f'[{name}] chat: A sends message: {m.status}')
t = b.get('/chat/threads'); found = tid in json.dumps(t.body)
print(f'[{name}] chat: thread appears in B inbox: {t.status} {found}')
# refunds: ownership of booking_id never checked; dedupe returns another patient's request
bid = 'booking-of-A-' + A['user']['id'][:8]
r1 = a.post('/refunds/request', {'booking_id': bid, 'amount_paid': 250, 'reason': 'synthetic A reason (private)', 'booking_kind': 'consultation'})
print(f'[{name}] refund: A requests refund for {bid}: {r1.status} patient_id={r1.get("patient_id")}')
r2 = b.post('/refunds/request', {'booking_id': bid, 'amount_paid': 1, 'reason': 'x'})
print(f'[{name}] refund: B requests same booking id: {r2.status} -> returns patient_id={r2.get("patient_id")} reason={r2.get("reason")!r} amount_paid={r2.get("amount_paid")}')
r3 = b.post('/refunds/request', {'booking_id': 'not-a-real-booking-' + B['user']['id'][:6], 'amount_paid': 99999, 'reason': 'x', 'scheduled_at': '2099-01-01T00:00:00Z', 'booking_kind': 'zz'})
print(f'[{name}] refund: B files for a booking that does not exist: {r3.status} refund_percent={r3.get("refund_percent")} refund_amount={r3.get("refund_amount")}')
