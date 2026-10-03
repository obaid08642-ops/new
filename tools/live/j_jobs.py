"""Journey: medical jobs, including the guest (no account) flow (catalog audit §8).

  python3 tools/live/j_jobs.py

Payloads copied from provider-app MedicalJobsScreen.tsx (guest post, guest apply, facility post, apply).
Guest identity is the device id the app generates (>= 8 chars).
"""
import uuid
from lib import Client, journey, step, summary
import j_admin, j_onboarding
from j_accounts import app_signup

guest = Client()
DEV = f'dev-{uuid.uuid4().hex}'


def items(r):
    return r.body if isinstance(r.body, list) else (r.get('data') or r.get('items') or [])


def run():
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]

    journey('jobs: a guest posts a job (no account)')
    body = {'device_id': DEV, 'title': f'مطلوب صيدلي {tag}', 'description': 'دوام كامل', 'scfhs_role': 'pharmacist', 'post_type': 'offer',
            'company': 'صيدلية اختبار', 'contact_phone': '0501234567', 'contact_preference': 'phone', 'contract_type': 'full_time', 'location': 'الرياض'}
    r = guest.post('/recruitment/jobs/guest', body)
    gid = r.get('id')
    step('guest post stored as a draft pending review', r.ok and gid and r.get('status') == 'draft', r)
    r = guest.get('/recruitment/jobs')
    step('the draft is not public', r.ok and not any(j.get('id') == gid for j in items(r)), f'{len(items(r))} public jobs')
    r = guest.get(f'/recruitment/guest/mine?device_id={DEV}')
    step('the guest sees their own submission by device id', r.ok and any(j.get('id') == gid for j in (r.get('jobs') or [])), r)
    r = guest.get(f'/recruitment/guest/mine?device_id={uuid.uuid4().hex}')
    step('another device does not see it', r.ok and not any(j.get('id') == gid for j in (r.get('jobs') or [])), r)
    r = guest.post('/recruitment/jobs/guest', dict(body, scfhs_role='engineer'))
    step('non-medical role refused', r.status == 400, r)

    journey('jobs: admin moderates the guest post')
    r = admin.get('/recruitment/jobs?status=draft')
    step('admin finds the draft', r.ok and any(j.get('id') == gid for j in items(r)), f'{r.status} {len(items(r))}')
    r = admin.put(f'/recruitment/jobs/{gid}', {'status': 'published'})
    step('admin publishes it (API; there is no admin screen for jobs)', r.ok, r)
    r = guest.get('/recruitment/jobs')
    step('published job is public', r.ok and any(j.get('id') == gid for j in items(r)), f'{len(items(r))}')

    journey('jobs: a guest applies')
    app_dev = f'dev-{uuid.uuid4().hex}'
    r = guest.post(f'/recruitment/jobs/{gid}/guest-apply', {'device_id': app_dev, 'name': 'متقدم اختبار', 'phone': '0507654321', 'cover_letter': 'الخبرة: 3 سنوات'})
    step('guest application stored', r.ok and r.get('id'), r)
    r = guest.post(f'/recruitment/jobs/{gid}/guest-apply', {'device_id': app_dev, 'name': 'متقدم اختبار', 'phone': '0507654321'})
    step('second application from the same device refused', r.status == 400, r)

    journey('jobs: a facility posts and reviews applicants')
    hosp = j_onboarding.register_type('hospital')
    j_onboarding.admin_review(admin, hosp)
    tok = j_onboarding.provider_after_approval(hosp)
    hc = Client(tok)
    r = hc.post('/recruitment/jobs', {'title': f'ممرض {tag}', 'description': 'مناوبات', 'scfhs_role': 'nurse', 'post_type': 'offer',
                                      'contract_type': 'full_time', 'location': 'جدة', 'requirements': ['ترخيص الهيئة'], 'status': 'published'})
    fid = r.get('id')
    step('facility posts a job', r.ok and fid, r)
    r = hc.get(f'/recruitment/jobs/{gid}/applications')
    step("a facility cannot read another poster's applicants (guest phones)", r.status in (403, 404), r)
    pat = Client(app_signup(label='job-seeker')['token'])
    r = pat.get(f'/recruitment/jobs/{fid}/applications')
    step('a patient cannot read applicants', r.status in (401, 403, 404), r)
    r = admin.get(f'/recruitment/jobs/{gid}/applications')
    step('admin reads the guest-post applicants', r.ok and len(items(r)) >= 1, r)


if __name__ == '__main__':
    run()
    summary()
