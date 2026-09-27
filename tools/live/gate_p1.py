"""Gate P1 (docs/audit/02_AGENT_EXECUTION_PLAN.md): with a PATIENT token, no admin/provider write route may
answer 2xx. Routes come from the running backend's boot log (tools/audit/served.py -> served routes only).
  python3 tools/live/gate_p1.py [boot_log]      exit 1 on any 2xx."""
import json, re, subprocess, sys, uuid
import j_accounts
from lib import Client

log = sys.argv[1] if len(sys.argv) > 1 else '/tmp/nabd-backend.log'
served = json.loads(subprocess.check_output([sys.executable, '../audit/served.py', log]))
PRIV = re.compile(r'(^/admin/|/admin(/|$)|^/provider(/|$)|^/providers/provider-deltas|^/facility/|^/hospital/(staff|branches|departments|invitations$)|'
                  r'/provider/|^/emergency/(driver|\{?:id\}?/claim)|^/pharmacy/provider|^/finance/|^/ai/admin)')
SKIP = re.compile(r'(logout|webhook|/auth/|stream|provider-onboarding/(start|step|submit|my-profile)|provider/auth/)')
pat = Client(j_accounts.app_signup(label='gate-p1')['token'], 'patient')
bad, n = [], 0
for r in served:
    if not r['served'] or r['method'] not in ('POST', 'PUT', 'PATCH', 'DELETE'):
        continue
    p = r['path']
    if not PRIV.search(p) or SKIP.search(p):
        continue
    n += 1
    path = re.sub(r':[A-Za-z_]+', '00000000-0000-0000-0000-000000000000', p)
    res = pat.req(r['method'], path, {}, headers={'Idempotency-Key': f'gate-{uuid.uuid4()}'})
    if 200 <= res.status < 300:
        bad.append(f"{res.status} {r['method']} {p} ({r['cls']}) {str(res.body)[:100]}")
print(f'gate P1: {n} admin/provider write routes tried with a patient token; {len(bad)} answered 2xx')
for b in bad:
    print('  2xx', b)
sys.exit(1 if bad else 0)
