"""Journey (QA AD-01, admin rejects a provider change): a doctor submits clinic hours, the admin rejects the change,
and the hours never go live.
  - the approved doctor submits clinic hours (POST /provider/schedule-slots), which creates a pending provider change;
  - the admin sees the new pending change in the provider-deltas list (only the one this run created is rejected);
  - the admin rejects it with a reason (POST /admin/admin/providers/provider-deltas/:id/reject);
  - the change is stored as rejected (MongoDB provider_deltas; the admin list shows pending changes only), and the doctor's schedule has no live hours for it
    (the schedule view lists no rows for a change that is not approved; this check is weak and says so in the output).
Approval of a provider change is covered in j_consultation.py (doctor_publishes_hours)."""
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
    import j_admin, j_onboarding, j_consultation
    from lib import summary
    from j_consultation import tomorrow
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant', 'consultation_modes': ['clinic']})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    before = {x.get('id') for x in admin.get('/admin/admin/providers/provider-deltas').items() if x.get('status') == 'pending'}

    journey('provider change AD-01: the doctor submits clinic hours, the admin rejects the change')
    d = tomorrow()
    dow = (d.weekday() + 1) % 7
    r = doc.post('/provider/schedule-slots', {'day_of_week': dow, 'start_time': '08:00', 'end_time': '18:00', 'service_type': 'clinic'})
    step('the doctor submits clinic hours (a change waits for review)', r.ok, r)
    r = admin.get('/admin/admin/providers/provider-deltas')
    new = [x for x in r.items() if x.get('status') == 'pending' and x.get('id') not in before]
    step('the admin sees the new pending change', r.ok and len(new) > 0, f'{r.status} {len(new)} new')
    for x in new:
        r = admin.post(f"/admin/admin/providers/provider-deltas/{x['id']}/reject", {'reason': 'QA rejection: ساعات غير مطابقة'})
        step('the admin rejects the change with a reason', r.ok, r)
    rows = [mongo_one(f'db.provider_deltas.findOne({{id: "{n.get("id")}"}}, {{_id: 0, status: 1}})') for n in new]
    step('MongoDB: the change is stored as rejected (provider_deltas)', bool(rows) and all(row and row.get('status') == 'rejected' for row in rows), rows)
    sched = doc.get('/provider/schedule-slots')
    live = [s for s in items(sched) if str(s.get('status') or '').lower() in ('active', 'approved', 'live')]
    print(f'    doctor schedule rows: {len(items(sched))}, live: {len(live)}, sample keys: {sorted(items(sched)[0].keys())[:12] if items(sched) else []}')
    step('the doctor has no live hours from the rejected change', sched.ok and len(live) == 0, len(live))
    summary()


if __name__ == '__main__':
    main()
