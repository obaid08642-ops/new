"""Journey (QA D-11): guaranteed-appointment credit (owner decision 2026-10-24, loyalty/guaranteed-appointment.ts).
A clinic visit that starts more than 30 minutes after its slot, for a doctor-side reason, earns 20 points once.
  Case 1: the patient checks in on time, the doctor starts 65 minutes after the slot -> one appointment_delay_credit row.
  Case 2: the patient checks in after the doctor starts -> the delay is measured from the check-in, so no credit.
The clock is moved in the local test DB only: the slot and the check-in time are set so the delay is what the case needs
(the server measures the delay from state_history stamps and slot_start). Every write is checked in MongoDB
(appointments, loyalty_transactions) and read back through /loyalty/transactions."""
import datetime
import json
import subprocess
import time

from lib import Client, journey, step


def mongo(js):
    return subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', js],
                          capture_output=True, text=True).stdout.strip()


def iso(dt):
    return dt.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def set_clock(aid, slot, checked_in):
    """Local test DB only: the slot start and the CHECKED_IN stamp of this appointment."""
    mongo(f'db.appointments.updateOne({{id: "{aid}"}}, {{$set: {{slot_start: new Date("{iso(slot)}"), slot_end: new Date("{iso(slot + datetime.timedelta(minutes=30))}")}}}});'
          f' db.appointments.updateOne({{id: "{aid}", "state_history.state": "CHECKED_IN"}}, {{$set: {{"state_history.$.at": new Date("{iso(checked_in)}")}}}})')


def credits(patient_id, aid):
    out = mongo(f'JSON.stringify(db.loyalty_transactions.find({{user_id: "{patient_id}", reason: "appointment_delay_credit", ref_id: "{aid}"}}, {{_id: 0, points_delta: 1, reason: 1, ref_id: 1}}).toArray())')
    return json.loads(out) if out else []


def appt(aid):
    out = mongo(f'JSON.stringify(db.appointments.findOne({{id: "{aid}"}}, {{_id: 0, status: 1, slot_start: 1}}))')
    return json.loads(out) if out and out != 'null' else None


def wait_credit(patient_id, aid, want, seconds=8):
    end = time.time() + seconds
    if want == 0:
        time.sleep(3)  # the award runs on an event: give it time to show up before saying there is none
    rows = credits(patient_id, aid)
    while len(rows) < want and time.time() < end:
        time.sleep(0.5)
        rows = credits(patient_id, aid)
    return rows


def run(pat, doc, aid, patient_id, label):
    now = datetime.datetime.now(datetime.timezone.utc)
    if label == 'late doctor':
        slot = now - datetime.timedelta(minutes=70)
        checked_in = now - datetime.timedelta(minutes=65)
    else:
        slot = now - datetime.timedelta(minutes=70)
        checked_in = now + datetime.timedelta(minutes=10)
    journey(f'guaranteed appointment D-11: {label}')
    r = pat.patch(f'/care/appointments/{aid}/check-in')
    step('the patient checks in', r.ok, r)
    set_clock(aid, slot, checked_in)
    r = doc.patch(f'/care/appointments/{aid}/start')
    step('the doctor starts the visit', r.ok, r)
    a = appt(aid)
    step('MongoDB: the visit is IN_PROGRESS', bool(a) and a.get('status') == 'IN_PROGRESS', a)
    return wait_credit(patient_id, aid, 1 if label == 'late doctor' else 0)


def main():
    import j_onboarding, j_admin, j_accounts
    from j_consultation import doctor_publishes_hours, book_paid
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    doctor_publishes_hours(doc, admin)
    pat_acc = j_accounts.app_signup(label='delay-credit')
    pat = Client(pat_acc['token'], 'patient')
    patient_id = pat.get('/auth/me').get('id')

    aid = book_paid(pat, doc)
    journey('guaranteed appointment D-11: setup')
    step('a paid clinic visit exists for the first case', bool(aid), aid)
    if aid:
        rows = run(pat, doc, aid, patient_id, 'late doctor')
        step('MongoDB: one appointment_delay_credit row of 20 points (points_delta)', len(rows) == 1 and rows[0].get('points_delta') == 20, rows)
        r = pat.get('/loyalty/transactions')
        items = r.body if isinstance(r.body, list) else (r.body or {}).get('items') or (r.body or {}).get('transactions') or []
        step('patient sees the credit in the loyalty history after reload', r.ok and any(x.get('reason') == 'appointment_delay_credit' for x in items), r.status)

    aid2 = book_paid(pat, doc, index=1)
    step('a second paid clinic visit exists for the patient-late case', bool(aid2), aid2)
    if aid2:
        rows = run(pat, doc, aid2, patient_id, 'patient late')
        step('MongoDB: no credit when the patient checked in after the start', rows == [], rows)
    summary()


if __name__ == '__main__':
    main()
