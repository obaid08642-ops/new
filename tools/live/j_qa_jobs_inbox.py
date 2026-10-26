"""Journey (QA JB-06): the jobs inbox and the two sides, API and MongoDB.
  - a candidate applies to a published job; the job side moves the application (PATCH /recruitment/applications/:id/status);
    MongoDB job_applications shows each status; the candidate reads it back (GET /recruitment/applications/my).
  - what the candidate is told: the notifications list after the status change is read back.
  - messages between the two sides: the backend has no message route for applications (probed below and recorded as a
    gap, not as a pass).
The job is posted by the admin account because a hospital provider token cannot post jobs (see findings/jobs-inbox.md:
the token carries role 'provider' and createJob refuses it)."""
import json
import subprocess
import uuid

from lib import Client, journey, step


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def app_row(aid):
    return mongo_json(f'db.job_applications.findOne({{id: "{aid}"}}, {{_id: 0, id: 1, status: 1, job_id: 1, candidate_id: 1}})')


def main():
    import j_accounts, j_admin
    from lib import summary
    admin, _ = j_admin.login()
    cand_acc = j_accounts.app_signup(label='jb06-cand')
    cand = Client(cand_acc['token'], 'patient')
    tag = uuid.uuid4().hex[:6]

    journey('jobs JB-06: a job is posted and a candidate applies')
    r = admin.post('/recruitment/jobs', {'title': f'ممرض QA {tag}', 'description': 'مناوبات', 'scfhs_role': 'nurse', 'post_type': 'offer',
                                         'contract_type': 'full_time', 'location': 'جدة', 'requirements': ['ترخيص الهيئة'], 'status': 'published'})
    jid = r.get('id')
    step('admin posts a published job', r.ok and jid, r)
    r = cand.post('/recruitment/candidate/profile', {'cv_url': 'https://cdn.nabd.test/cv-qa.pdf', 'scfhs_license_number': f'SCFHS-{tag}',
                                                     'scfhs_license_expiry': '2027-12-31'})
    step('candidate saves a profile', r.ok, r)
    r = cand.post(f'/recruitment/jobs/{jid}/apply', {'cover_letter': 'الخبرة: 4 سنوات'})
    aid = r.get('id')
    step('candidate applies', r.ok and aid, r)
    row = app_row(aid) if aid else None
    step('MongoDB: the application is submitted', bool(row) and row.get('status') == 'submitted', row)

    journey('jobs JB-06: the job side moves the application and the candidate sees it')
    r = admin.patch(f'/recruitment/applications/{aid}/status', {'status': 'under_review'})
    step('job side moves the application to under review', r.ok, r)
    row = app_row(aid)
    step('MongoDB: the application is under_review', bool(row) and row.get('status') == 'under_review', row)
    r = cand.get('/recruitment/applications/my')
    mine = next((x for x in (r.body if isinstance(r.body, list) else r.get('data') or []) if x.get('id') == aid or x.get('_id') == aid), None)
    step('candidate reads the application as under review', r.ok and mine and mine.get('status') == 'under_review', r.status)
    r = cand.get('/notifications')
    items = r.body if isinstance(r.body, list) else (r.body or {}).get('items') or (r.body or {}).get('notifications') or []
    told = any(tag in json.dumps(x, ensure_ascii=False) or 'under_review' in json.dumps(x, ensure_ascii=False) for x in items)
    step('candidate is notified of the status change (notifications list)', r.ok and told, f'{r.status} {len(items)} notifications')

    journey('jobs JB-06: messages between the two sides (probe: are there any routes)')
    for method, path, body in [('GET', f'/recruitment/applications/{aid}/messages', None),
                               ('POST', f'/recruitment/applications/{aid}/messages', {'body': 'مرحبا'}),
                               ('GET', f'/recruitment/jobs/{jid}/messages', None)]:
        r = cand.req(method, path, body) if body is not None else cand.get(path)
        step(f'{method} {path} exists', r.ok, f'{r.status} {str(r.body)[:120]}')


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
