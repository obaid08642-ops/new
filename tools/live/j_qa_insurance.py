"""Journey: insurance card edit (I-02) through the API, with read-back. Delete (I-03) has no endpoint yet
(users/me/insurance has GET and POST only), so it is recorded as a finding, not tested here.
Payload copied from patient-web/app/api/insurance/policy/route.ts (POST -> /insurance/save-policy)."""
import time
from lib import Client, journey, step
from j_accounts import app_signup

def policy_number(resp):
    body = resp.body if isinstance(resp.body, dict) else {}
    return body.get('policy_number') or (body.get('insurance') or {}).get('policy_number') or (body.get('policy') or {}).get('policy_number')


def run():
    journey('insurance: add then edit a card (API, read-back)')
    pat = app_signup(label='qains')
    c = Client(pat['token'], 'patient-api')
    r = c.get('/insurance/companies')
    rows = r.body if isinstance(r.body, list) else (r.body or {}).get('items', (r.body or {}).get('companies', []))
    step('insurer list reads', r.ok and bool(rows), r)
    if not rows:
        return
    company = rows[0]['id']
    first, second = f'QA-{int(time.time())}-A', f'QA-{int(time.time())}-B'
    r = c.post('/insurance/save-policy', {'company_id': company, 'policy_number': first, 'copay_percent': 20, 'copay_cap_sar': 500})
    step('add card', r.ok, r)
    r = c.get('/insurance/my-policy')
    step('add card read back', r.ok and policy_number(r) == first, r.body)
    r = c.post('/insurance/save-policy', {'company_id': company, 'policy_number': second, 'copay_percent': 10, 'copay_cap_sar': 300})
    step('edit card', r.ok, r)
    r = c.get('/insurance/my-policy')
    step('edit card read back', r.ok and policy_number(r) == second, r.body)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
