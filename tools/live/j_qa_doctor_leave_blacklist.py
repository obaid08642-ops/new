"""Journey (QA V-09, doctor side): leaves and the patient blacklist, API with MongoDB and read-back.
  Cases (one check each):
  - leave: the doctor adds a vacation (POST /provider/ops/doctor/leave); it is read back (GET /provider/ops/doctor/leave) and
    stored in MongoDB doctor_leaves as active;
  - leave cancel: the doctor cancels it (DELETE /provider/ops/doctor/leave/:id); it is no longer listed;
  - blacklist: the doctor blacklists a patient (POST /provider/ops/doctor/blacklist/:patientId); it is read back
    (GET /provider/ops/doctor/blacklist) and stored in MongoDB doctor_blacklist as active;
  - unblock: the doctor unblocks the patient (DELETE /provider/ops/doctor/blacklist/:patientId); it is no longer listed.
Schedule (hours), payouts and templates are not covered here."""
import datetime
import json
import subprocess

from lib import Client, journey, step


def mongo_one(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def items(r):
    return r.body if isinstance(r.body, list) else r.items()


def main():
    import j_admin, j_onboarding, j_consultation, j_accounts
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin, ('clinic',))
    pat = j_accounts.app_signup(label='v09-blacklist')
    patient_id = Client(pat['token'], 'patient').get('/auth/me').get('id')

    start = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
    end = (datetime.date.today() + datetime.timedelta(days=32)).isoformat()

    journey('doctor V-09: leave is requested, read back, and cancelled')
    r = doc.post('/provider/ops/doctor/leave', {'start_date': start, 'end_date': end, 'type': 'vacation', 'note': 'QA leave'})
    leave_id = (r.body or {}).get('leave', {}).get('id') if isinstance(r.body, dict) else None
    step('the doctor adds a vacation (POST /provider/ops/doctor/leave)', r.ok and leave_id, r)
    row = mongo_one(f'db.doctor_leaves.findOne({{id: "{leave_id}"}}, {{_id: 0, status: 1, type: 1}})') if leave_id else None
    step('MongoDB: the leave is stored as active (doctor_leaves)', bool(row) and row.get('status') == 'active' and row.get('type') == 'vacation', row)
    r = doc.get('/provider/ops/doctor/leave')
    step('the leave is read back (GET /provider/ops/doctor/leave)', r.ok and any(x.get('id') == leave_id for x in items(r)), r.status)

    r = doc.req('DELETE', f'/provider/ops/doctor/leave/{leave_id}')
    step('the doctor cancels the leave (DELETE /provider/ops/doctor/leave/:id)', r.ok, r)
    r = doc.get('/provider/ops/doctor/leave')
    step('the cancelled leave is no longer listed', r.ok and not any(x.get('id') == leave_id for x in items(r)), r.status)

    journey('doctor V-09: a patient is blacklisted, read back, and unblocked')
    r = doc.post(f'/provider/ops/doctor/blacklist/{patient_id}', {'reason': 'QA blacklist'})
    step('the doctor blacklists the patient (POST /provider/ops/doctor/blacklist/:patientId)', r.ok, r)
    row = mongo_one(f'db.doctor_blacklist.findOne({{patient_id: "{patient_id}"}}, {{_id: 0, active: 1}})')
    step('MongoDB: the blacklist entry is active (doctor_blacklist)', bool(row) and row.get('active') is True, row)
    r = doc.get('/provider/ops/doctor/blacklist')
    step('the patient is read back on the blacklist (GET /provider/ops/doctor/blacklist)', r.ok and any(patient_id in str(x) for x in items(r)), r.status)

    r = doc.req('DELETE', f'/provider/ops/doctor/blacklist/{patient_id}')
    step('the doctor unblocks the patient (DELETE /provider/ops/doctor/blacklist/:patientId)', r.ok, r)
    r = doc.get('/provider/ops/doctor/blacklist')
    step('the unblocked patient is no longer on the blacklist', r.ok and not any(patient_id in str(x) for x in items(r)), r.status)
    summary()


if __name__ == '__main__':
    main()
