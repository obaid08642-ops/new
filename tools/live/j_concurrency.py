"""Journey: concurrency on the booking path (two patients, one slot; one patient, one key, many submits).

  DOCTOR_ID=<public doctor id with free clinic slots tomorrow> python3 tools/live/j_concurrency.py

Real backend, real DB, new test patients (app signup with OTP). Requests are fired at the same instant from threads
(a barrier releases them together), so the server, not the client, has to serialise them:
  A. two patients reserve the same slot           -> exactly one lock
  B. both try to book it (one with the lock)      -> exactly one appointment for that slot
  C. one patient sends the same booking 6 times with ONE idempotency key -> one appointment, every 2xx answer
     carries that same id
  D. one patient books 4 different slots with different keys at once     -> each succeeds once (no false conflicts)
"""
import os, threading, uuid
from datetime import date, timedelta
from lib import Client, journey, step, summary
from j_accounts import app_signup

DOCTOR = os.environ.get('DOCTOR_ID', '262d226e-ffed-41a5-b8e3-d4af2b8d4aa3')


def at_once(calls):
    """Run the callables together (barrier start); return their results in order."""
    out = [None] * len(calls)
    gate = threading.Barrier(len(calls))

    def run(i, fn):
        gate.wait()
        out[i] = fn()
    ts = [threading.Thread(target=run, args=(i, fn)) for i, fn in enumerate(calls)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    return out


def free_slots(pat, n):
    """n available clinic slots whose neighbours are free too, spaced 2 apart (so the doctor's buffer around one
    booking cannot block the next: Q37 shows the slot list does not apply that buffer). Searches the next 7 days."""
    for d in range(1, 8):
        day = (date.today() + timedelta(days=d)).isoformat()
        r = pat.get(f'/care/doctors/{DOCTOR}/slots?date={day}&service_type=clinic')
        slots = r.body if isinstance(r.body, list) else (r.get('slots') or [])
        av = [bool(x.get('available', True)) for x in slots if isinstance(x, dict)]
        clean = [slots[i]['start'] for i in range(1, len(av) - 1) if av[i - 1] and av[i] and av[i + 1]]
        spaced, last = [], None
        for st in clean:
            idx = [x['start'] for x in slots].index(st)
            if last is None or idx - last >= 2:
                spaced.append(st); last = idx
        if len(spaced) >= n:
            step(f'{n} buffer-safe free clinic slots found ({day})', True, '')
            return spaced, slots
    step(f'{n} buffer-safe free clinic slots in the next 7 days', False, 'not enough free slots')
    return [], []


def book(pat, slot, lock=None, key=None):
    body = {'doctor_id': DOCTOR, 'service_type': 'clinic', 'slot_start': slot, 'payment_method': 'card'}
    if lock:
        body['slot_lock_id'] = lock
    return pat.post('/care/appointments', body, headers={'Idempotency-Key': key or f'appointment-create-{DOCTOR}-{slot}-{uuid.uuid4()}'})


def run():
    p1 = Client(app_signup(label='race-a')['token'], 'race-a')
    p2 = Client(app_signup(label='race-b')['token'], 'race-b')
    free, day_slots = free_slots(p1, 7)
    if len(free) < 7:
        return

    journey('concurrency A: two patients reserve the same slot at the same instant')
    slot = free[0]
    ra, rb = at_once([lambda: p1.post('/slot-locks/reserve', {'provider_id': DOCTOR, 'booking_kind': 'consultation', 'slot_start': slot}),
                      lambda: p2.post('/slot-locks/reserve', {'provider_id': DOCTOR, 'booking_kind': 'consultation', 'slot_start': slot})])
    oks = [r for r in (ra, rb) if r.ok and r.get('id')]
    step('exactly one lock is granted', len(oks) == 1, f'{ra.status} {str(ra.body)[:80]} | {rb.status} {str(rb.body)[:80]}')
    loser = rb if oks and oks[0] is ra else ra
    step('the other gets a clear conflict (4xx)', 400 <= loser.status < 500, loser)

    journey('concurrency B: both book that slot at the same instant (only one holds the lock)')
    winner, other = (p1, p2) if ra.ok else (p2, p1)
    lock = (ra if ra.ok else rb).get('id')
    r1, r2 = at_once([lambda: book(winner, slot, lock), lambda: book(other, slot)])
    made = [r for r in (r1, r2) if r.ok and r.get('id')]
    step('exactly one appointment for the slot', len(made) == 1, f'{r1.status} {str(r1.body)[:80]} | {r2.status} {str(r2.body)[:80]}')
    step('the lock holder is the one who got it', bool(made) and made[0] is r1, f'{r1.status} / {r2.status}')

    journey('concurrency C: one patient double-submits one booking (same idempotency key, 6 at once)')
    slot_c = free[1]
    key = f'appointment-create-{DOCTOR}-{slot_c}-{uuid.uuid4()}'
    rs = at_once([lambda: book(p1, slot_c, key=key) for _ in range(6)])
    ids = {r.get('id') for r in rs if r.ok and r.get('id')}
    step('every success returns the same appointment id', len(ids) == 1, [f'{r.status}:{str(r.get("id") or r.body)[:40]}' for r in rs])
    mine = p1.get('/care/appointments')
    rows = mine.body if isinstance(mine.body, list) else (mine.get('data') or mine.get('items') or [])
    n = sum(1 for a in rows if isinstance(a, dict) and a.get('slot_start', '').startswith(slot_c[:16]) and a.get('status') not in ('CANCELLED', 'cancelled'))
    step('the patient holds exactly one appointment at that time', n == 1, f'{n} rows')
    step('no 5xx under the burst', all(r.status < 500 for r in rs), [r.status for r in rs])

    journey('concurrency D: one patient books 4 different slots at once (different keys)')
    targets = free[2:6]   # spaced apart: any refusal here is a concurrency fault, not the buffer
    rs = at_once([lambda s=s: book(p2, s) for s in targets])
    step('each distinct slot is booked once, none refused as a conflict', all(r.ok and r.get('id') for r in rs), [r.status for r in rs])
    step('four distinct appointments', len({r.get('id') for r in rs if r.ok}) == 4, len({r.get('id') for r in rs if r.ok}))

    journey('Q37: the slot just before a booked slot is either not offered or bookable (5-min buffer)')
    base = free[6]
    starts = [x['start'] for x in day_slots]
    prev = starts[starts.index(base) - 1]
    r = book(p1, base)
    step('book a slot', r.ok and r.get('id'), r)
    lst = p1.get(f"/care/doctors/{DOCTOR}/slots?date={base[:10]}&service_type=clinic")
    rows = lst.body if isinstance(lst.body, list) else (lst.get('slots') or [])
    listed = next((x.get('available') for x in rows if isinstance(x, dict) and x.get('start') == prev), None)
    r2 = book(p2, prev)
    step('the previous slot is either not listed as available or bookable', (listed is False) or r2.ok, f'listed available={listed}; booking -> {r2.status} {str(r2.body)[:80]}')

if __name__ == '__main__':
    run()
    summary()
