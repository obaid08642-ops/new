#!/usr/bin/env python3
"""Client write calls that hit a route requiring an idempotency key but do not send one
(IdempotencyInterceptor answers 400 idempotency_key_required, so the button can never work).

  node tools/audit/clientbodies.js > /tmp/clients.json
  python3 tools/audit/idemcheck.py /tmp/clients.json        (exit 1 when any is found)

A call counts as sending the key when the call expression mentions it, or the client's
transport adds it for every mutation (TRANSPORT_ADDS_KEY below)."""
import json, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(__file__))
# (path prefix, callee prefix): transports that add a key to every mutation themselves
TRANSPORT_ADDS_KEY = (
    ('patient-app/', 'apiFetch'),      # src/utils/api.ts
    ('provider-app/', 'client.'),      # src/api/client.ts request interceptor
)

import tempfile
_tmp = tempfile.mktemp(suffix='.json')
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'routes.py'), _tmp], check=True, capture_output=True)
routes = json.load(open(_tmp)); os.unlink(_tmp)
need = []
for r in routes:
    if r['m'] not in ('POST', 'PUT', 'PATCH', 'DELETE'):
        continue
    L = open(r['f'], encoding='utf8').read().split('\n')
    # decorators stacked above the handler (and on the same line)
    i, decs = r['l'] - 1, []
    j = i
    while j >= 0 and (j == i or L[j].strip().startswith('@') or L[j].strip() == ''):
        decs.append(L[j]); j -= 1
    k = i + 1
    while k < len(L) and L[k].strip().startswith('@'):
        decs.append(L[k]); k += 1
    if any('RequireIdempotency' in d for d in decs):
        need.append(r)

def segs(p):
    return [s for s in p.split('?')[0].split('/') if s]

def match(url, rp):
    cs, rs = segs(url), segs(rp)
    if len(cs) != len(rs):
        return False
    return all(r.startswith(':') or c == ':x' or c == r or c.startswith('${') for c, r in zip(cs, rs))

clients = json.load(open(sys.argv[1]))
bad = []
for c in clients:
    url = c.get('backend') or c['url']
    if url.startswith('/api/v1/'):
        url = url[len('/api/v1'):]
    for r in need:
        if r['m'] == c['method'] and match(url, r['p']):
            by_transport = any(c['at'].startswith(pp) and str(c.get('callee', '')).startswith(cp) for pp, cp in TRANSPORT_ADDS_KEY)
            if not c.get('idem') and not by_transport:
                bad.append((c['at'], c['method'], r['p'], f"{r['f'].replace('backend/src/', '')}:{r['l']}"))
            break
print(f'== routes requiring an idempotency key: {len(need)}')
print(f'== client calls to them without a key: {len(bad)}')
for at, m, p, where in sorted(set(bad)):
    print(f'  {at}  {m} {p}  [{where}]')
sys.exit(1 if bad else 0)
