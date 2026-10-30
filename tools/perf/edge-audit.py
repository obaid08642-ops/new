#!/usr/bin/env python3
"""Which anonymous GET routes can the edge cache? Asks the running backend (OpenAPI document), calls every GET route that has no path
parameter without a token or cookie, and sorts the 200 answers by Cache-Control: public (edge-cacheable), private/no-store, or none.
  python3 tools/perf/edge-audit.py [--base http://127.0.0.1:8002] [--fill id=...]   (test stack only; nothing is written)
Routes with path parameters are probed with --fill values (name=value); those without a value are listed as skipped.
"""
import argparse, json, re, sys, urllib.request, urllib.error, collections

ap = argparse.ArgumentParser()
ap.add_argument('--base', default='http://127.0.0.1:8002')
ap.add_argument('--fill', action='append', default=[], help='path parameter value, name=value')
ap.add_argument('--json', action='store_true')
a = ap.parse_args()
if not re.match(r'^http://(127\.0\.0\.1|localhost)(:\d+)?$', a.base):
    sys.exit('edge-audit: test stack only (http://127.0.0.1 or localhost)')
fill = dict(f.split('=', 1) for f in a.fill)


def get(url):
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'Accept-Language': 'en'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, dict(r.headers), len(r.read())
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), 0
    except Exception as e:  # noqa: BLE001
        return 0, {}, 0


doc = json.load(urllib.request.urlopen(a.base + '/api/docs-json', timeout=30))
rows = []
for path, ops in sorted(doc['paths'].items()):
    if 'get' not in ops:
        continue
    params = re.findall(r'\{(\w+)\}', path)
    if any(p not in fill for p in params):
        rows.append((path, 'skipped', '', 0))
        continue
    prefix = '' if path.startswith('/.well-known') else '/api/v1'
    url = a.base + prefix + re.sub(r'\{(\w+)\}', lambda m: fill[m.group(1)], path)
    st, h, n = get(url)
    cc = h.get('Cache-Control', h.get('cache-control', ''))
    if st != 200:
        rows.append((path, f'{st}', cc, n))
    else:
        kind = 'public' if re.search(r'\bpublic\b', cc) and 's-maxage' in cc else ('private/no-store' if re.search(r'private|no-store|no-cache', cc) else 'no header')
        rows.append((path, kind, cc, n))
by = collections.defaultdict(list)
for r in rows:
    by[r[1] if r[1] in ('public', 'private/no-store', 'no header', 'skipped') else 'not 200 (needs a login, a parameter or is missing)'].append(r)
if a.json:
    print(json.dumps({k: [r[0] for r in v] for k, v in by.items()}, indent=1)); sys.exit(0)
for k in ('public', 'no header', 'private/no-store', 'not 200 (needs a login, a parameter or is missing)', 'skipped'):
    print(f'\n== {k}: {len(by[k])}')
    if k in ('public', 'no header', 'private/no-store'):
        for p, _, cc, n in by[k]:
            print(f'  {p}  [{cc}] {n} B')
