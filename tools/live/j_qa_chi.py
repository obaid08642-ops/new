"""Journey (QA I-04): the CHI link on the add-policy screen and the save that follows it.
  - GET /config carries links.chi_inquiry (https on chi.gov.sa); the app draws the CHI button only when it is there.
  - The app opens the official CHI inquiry page; the patient copies the policy back by hand.
  - POST /insurance/save-policy without company_id is refused (400) and nothing is stored.
  - With a real insurer id, the policy is stored and `verified` is never taken from the client: MongoDB shows verified false.
Every write is checked in MongoDB (patient_profiles.insurance)."""
import json
import subprocess

from lib import Client, journey, step
from j_accounts import app_signup

def first_insurer(client):
    """An insurer the app lists (GET /insurance/companies). The app sends its code as company_id (add-policy.tsx), so the same is sent here."""
    comps = client.get('/insurance/companies').items()
    comp = next((x for x in comps if x.get('code')), None)
    step('an insurer is listed for the patient', comp is not None, len(comps))
    return comp.get('code') if comp else None


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def main():
    journey('insurance I-04: the CHI inquiry link comes from the server config')
    c = Client(None, 'anon')
    r = c.get('/config')
    chi = ((r.body or {}).get('links') or {}).get('chi_inquiry') if isinstance(r.body, dict) else None
    step('the config carries the CHI inquiry link on chi.gov.sa over https', r.ok and isinstance(chi, str) and chi.startswith('https://') and 'chi.gov.sa' in chi, chi or r)

    pat_acc = app_signup(label='chi')
    pat = Client(pat_acc['token'], 'patient')
    user_id = pat.get('/auth/me').get('id')
    insurer = first_insurer(pat)

    journey('insurance I-04: the save after the CHI lookup')
    r = pat.post('/insurance/save-policy', {'policy_number': 'CHI-SCRAPED', 'verified': True, 'copay_percent': 20})
    step('a save without an insurer is refused (no fake policy stored)', not r.ok and r.status == 400, r)
    row = mongo_json(f'db.patient_profiles.findOne({{user_id: "{user_id}"}}, {{_id: 0, insurance: 1}})')
    step('MongoDB: no insurance stored after the refused save', not (row or {}).get('insurance'), row)

    r = pat.post('/insurance/save-policy', {'company_id': insurer, 'policy_number': 'QA-CHI-0001', 'verified': True, 'copay_percent': 20, 'copay_cap_sar': 500})
    step('the save with the insurer and the copied policy number succeeds', r.ok, r)
    row = mongo_json(f'db.patient_profiles.findOne({{user_id: "{user_id}"}}, {{_id: 0, insurance: 1}})')
    ins = (row or {}).get('insurance') or {}
    step('MongoDB: the policy is stored with the copied number', ins.get('policy_number') == 'QA-CHI-0001', ins)
    step('MongoDB: verified is never taken from the client', ins.get('verified') in (None, False), ins)
    r = pat.get('/insurance/my-policy')
    step('patient reads the saved policy back', r.ok and 'QA-CHI-0001' in json.dumps(r.body, ensure_ascii=False), r.status)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
