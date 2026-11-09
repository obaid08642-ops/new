"""Journey (scenario PV-13, vacation or unavailability): a doctor adds leave for a date range, sees it in the list, and
cancels it; the leave no longer shows after the cancel.
  - POST /provider/ops/doctor/leave {start_date, end_date, type, note}: the leave is stored
  - GET  /provider/ops/doctor/leave: the leave is listed
  - DELETE /provider/ops/doctor/leave/:id: the leave is cancelled and no longer listed
  - a leave with a missing range is refused (400)
Stack: backend :8002. TEST database only; the doctor is the test doctor from j_concurrency.
"""
from lib import journey, step, summary


def rows(r):
    return r.body if isinstance(r.body, list) else (r.body or {}).get('items', []) if isinstance(r.body, dict) else []


def run():
    import j_concurrency
    j_concurrency.ensure_doctor()
    doc = j_concurrency.DOCTOR_CLIENT
    step('the test doctor is signed in', doc is not None, doc)
    if doc is None:
        return summary()

    start, end = '2027-03-10', '2027-03-12'
    journey('doctor leave: the doctor adds a vacation (PV-13)')
    r = doc.post('/provider/ops/doctor/leave', {'start_date': start, 'end_date': end, 'type': 'vacation', 'note': 'qa leave'})
    body = r.body if isinstance(r.body, dict) else {}
    leave_id = (body.get('leave') or body).get('id')
    step('the leave is stored (POST /provider/ops/doctor/leave)', r.ok and bool(leave_id), r)
    r = doc.get('/provider/ops/doctor/leave')
    listed = [x for x in rows(r) if isinstance(x, dict) and x.get('id') == leave_id]
    step('the leave is listed for the doctor', r.ok and len(listed) == 1, r)

    journey('doctor leave: the doctor cancels the leave (PV-13)')
    r = doc.delete(f'/provider/ops/doctor/leave/{leave_id}')
    step('the leave is cancelled (DELETE /provider/ops/doctor/leave/:id)', r.ok, r)
    r = doc.get('/provider/ops/doctor/leave')
    still = [x for x in rows(r) if isinstance(x, dict) and x.get('id') == leave_id and x.get('status', 'active') not in ('cancelled', 'canceled')]
    step('the cancelled leave no longer shows as active', r.ok and not still, r)

    journey('doctor leave: a leave without a range is refused (PV-13)')
    r = doc.post('/provider/ops/doctor/leave', {'type': 'vacation'})
    step('a leave with no dates is refused (400)', r.status == 400, r)
    summary()


if __name__ == '__main__':
    run()
