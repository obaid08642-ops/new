"""Journey (QA V-07, admin rejection): an applicant is rejected by the admin, and the rejection holds.
  - the applicant registers in the provider app (a laboratory), and the admin sees it in the pending list;
  - the admin rejects it with a reason (POST /admin/admin/providers/:id/reject), and the list no longer shows it as pending;
  - MongoDB: the provider profile is rejected and the user account is inactive (active false);
  - the rejected applicant cannot sign in to the provider app (POST /provider/auth/login refused, no token).
Approval with commissions is in j_onboarding.py; this journey covers the other outcome."""
import json
import subprocess

from lib import Client, journey, step


def mongo_one(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    import j_admin, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_type('lab', {})
    journey('provider V-07: the admin rejects an applicant')
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    items = r.body.get('items', []) if isinstance(r.body, dict) else []
    mine = next((i for i in items if i.get('email') == p['email']), None)
    step('the applicant is in the pending list', r.ok and mine is not None, f'{r.status} {len(items)} items')
    if not mine:
        summary()
        return
    pid = mine['id']
    r = admin.post(f'/admin/admin/providers/{pid}/reject', {'reason': 'QA rejection: المستندات غير مطابقة'})
    step('the admin rejects the applicant with a reason', r.ok, r)
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    still = [i for i in (r.body.get('items', []) if isinstance(r.body, dict) else []) if i.get('email') == p['email']]
    step('the rejected applicant is no longer pending', r.ok and not still, r.status)
    row = mongo_one(f'db.provider_profiles.findOne({{id: "{pid}"}}, {{_id: 0, status: 1, user_id: 1}})')
    step('MongoDB: the provider profile is rejected', bool(row) and str(row.get('status')).lower() == 'rejected', row)
    user = mongo_one(f'db.users.findOne({{id: "{(row or {}).get("user_id")}"}}, {{_id: 0, active: 1}})')
    step('MongoDB: the applicant account is inactive', bool(user) and user.get('active') is False, user)
    r = Client(None, 'anon').post('/provider/auth/login', {'email': p['email'], 'password': p['password']})
    token = r.get('access_token') if r.ok else None
    step('the rejected applicant cannot sign in to the provider app', not r.ok and not token, r.status)
    summary()


if __name__ == '__main__':
    main()
