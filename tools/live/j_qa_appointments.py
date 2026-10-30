"""Journey (QA D-08, D-09): a paid clinic booking is rescheduled by the patient (one free reschedule, then refused),
and the doctor marks the rescheduled visit as no-show. Every write is checked in MongoDB (appointments collection).
Routes: PATCH /care/appointments/:id/reschedule (appointments.controller.ts), POST /calls/provider/no-show (livekit.controller.ts)."""
import subprocess
from j_consultation import book_paid, doctor_publishes_hours, tomorrow
from lib import Client, journey, step


def mongo(js):
    return subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', js],
                          capture_output=True, text=True).stdout.strip()


def appt_row(aid):
    out = mongo(f'JSON.stringify(db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, id: 1, status: 1, slot_start: 1, '
                f'rescheduled_from_id: 1, refund_percentage: 1, refund_destination: 1, cancellation_reason: 1, '
                f'state_history: 1}}))')
    try:
        import json
        return json.loads(out) if out and out != 'null' else None
    except ValueError:
        return None


def free_slots(pat, did, day):
    r = pat.get(f'/care/doctors/{did}/slots?date={day}&service_type=clinic')
    slots = r.body if isinstance(r.body, list) else (r.get('slots') or r.items())
    return r, [s for s in slots if (s.get('available', True) if isinstance(s, dict) else True)]


def slot_value(s):
    return (s.get('start') or s.get('slot_start') or s.get('time')) if isinstance(s, dict) else s


def run(pat, doc, aid, did):
    journey('appointments: patient reschedules the paid visit to another slot')
    before = appt_row(aid)
    step('original booking is CONFIRMED in MongoDB', bool(before) and before.get('status') == 'CONFIRMED', before)
    r, free = free_slots(pat, did, tomorrow().isoformat())
    cur = before.get('slot_start') if before else None
    other = [slot_value(s) for s in free if slot_value(s) and str(slot_value(s))[:16] != str(cur)[:16]]
    step('a second free clinic slot is offered', r.ok and bool(other), r.status)
    if not other:
        return
    new_slot = other[0]
    r = pat.patch(f'/care/appointments/{aid}/reschedule', {'slot_start': new_slot})
    new_id = r.get('id')
    step('reschedule returns the new appointment', r.ok and new_id and new_id != aid, r)
    if not new_id:
        return
    old = appt_row(aid)
    new = appt_row(new_id)
    step('old booking is RESCHEDULED in MongoDB', bool(old) and old.get('status') == 'RESCHEDULED', old)
    step('new booking is CONFIRMED and points back to the old one in MongoDB',
         bool(new) and new.get('status') == 'CONFIRMED' and new.get('rescheduled_from_id') == aid, new)
    r = pat.get(f'/care/appointments/{new_id}')
    step('patient sees the new booking as CONFIRMED', r.ok and r.get('status') == 'CONFIRMED', r)
    r = pat.get('/care/appointments')
    rows = r.body if isinstance(r.body, list) else r.items()
    step('appointments list shows the new booking', r.ok and any(x.get('id') == new_id for x in rows), r.status)

    journey('appointments: second reschedule is refused (one free reschedule per visit)')
    _, free2 = free_slots(pat, did, tomorrow().isoformat())
    more = [slot_value(s) for s in free2 if slot_value(s) and str(slot_value(s))[:16] not in (str(cur)[:16], str(new_slot)[:16])]
    if more:
        r = pat.patch(f'/care/appointments/{new_id}/reschedule', {'slot_start': more[0]})
        step('second free reschedule is refused', not r.ok and 'no_free_reschedules_left' in str(r.body), r)
    else:
        step('a third clinic slot is offered for the refusal check', False, 'no third slot tomorrow')
    after = appt_row(new_id)
    step('refused reschedule leaves the new booking CONFIRMED in MongoDB', bool(after) and after.get('status') == 'CONFIRMED', after)

    journey('appointments: doctor marks the visit as no-show')
    r = doc.post('/calls/provider/no-show', {'appointment_id': new_id})
    step('doctor marks no-show', r.ok and r.get('success') is True, r)
    row = appt_row(new_id)
    last = (row or {}).get('state_history', [{}])[-1] if row else {}
    step('MongoDB: NO_SHOW, 0% refund, no-show history entry',
         bool(row) and row.get('status') == 'NO_SHOW' and row.get('refund_percentage') == 0
         and row.get('refund_destination') == 'none' and last.get('note') == 'no_show', row)
    r = pat.get(f'/care/appointments/{new_id}')
    step('patient sees NO_SHOW after reload', r.ok and r.get('status') == 'NO_SHOW', r)
    r = doc.post('/calls/provider/no-show', {'appointment_id': new_id})
    step('a second no-show is refused', not r.ok and 'appointment_not_no_show_eligible' in str(r.body), r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant',
                                              'consultation_modes': ['clinic', 'video', 'home']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    doctor_publishes_hours(doc, admin)
    pat_acc = j_accounts.app_signup(label='appt-patient')
    pat = Client(pat_acc['token'], 'patient')
    aid = book_paid(pat, doc)
    if aid:
        profile_id = doc.get('/provider-onboarding/my-profile').get('id')
        run(pat, doc, aid, profile_id)
    else:
        journey('appointments: setup')
        step('a paid clinic booking exists to reschedule', False, 'book_paid returned no appointment')
    summary()
