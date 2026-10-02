import sys, json, subprocess
sys.path.insert(0, '/home/user/new/tools/live')
import j_admin, j_onboarding
from lib import Client
def mongo(js): return subprocess.run(['docker','exec','p5mongo','mongosh','--quiet','nabd_form2','--eval',js],capture_output=True,text=True).stdout.strip()
w, admin = j_admin.login()
def fresh(docs):
    p = j_onboarding.register_pharmacy()
    c = j_onboarding.provider_client(p['token'])
    r = c.post('/provider-onboarding/step2', {'license_documents': docs})
    acct = mongo(f'print(db.provider_accounts.findOne({{email:"{p["email"]}"}}).id)')
    prof = mongo(f'print(db.provider_profiles.findOne({{account_id:"{acct}"}}).id)')
    tdocs = mongo(f'print(db.provider_documents.countDocuments({{account_id:"{acct}"}}))')
    return p, acct, prof, r.status, tdocs
print('\n=== A: provider sets license_documents to 3 junk strings, admin approves with NO override')
p, acct, prof, st, td = fresh(['x', 'y', 'z']); print('step2', st, 'typed docs', td)
r = w.post(f'/admin/admin/providers/{acct}/approve', {'reason': 'probe'}); print('approve ->', r.status, str(r.body)[:160])
print('\n=== B: no documents at all, override_reason >= 20 chars, no step-up')
p, acct, prof, st, td = fresh([]); print('step2', st, 'typed docs', td)
r = w.post(f'/admin/admin/providers/{acct}/approve', {'reason': 'probe'}); print('approve (no override) ->', r.status, str(r.body)[:160])
r = w.post(f'/admin/admin/providers/{acct}/approve', {'override_reason': 'Probe: checking that override requires step-up auth.'}); print('approve (override, no step-up) ->', r.status, str(r.body)[:160])
print('\n=== C: second route POST /providers/:id/approve, no documents')
p, acct, prof, st, td = fresh([]); print('step2', st, 'typed docs', td)
r = admin.post(f'/providers/{prof}/approve', {}); print('POST /providers/:id/approve ->', r.status, str(r.body)[:160])
print('profile after:', mongo(f'printjson(db.provider_profiles.findOne({{id:"{prof}"}},{{_id:0,status:1,license_verified:1,public_eligibility:1}}))').replace('\n',' '))
print('account after:', mongo(f'print(db.provider_accounts.findOne({{id:"{acct}"}}).status)'))
