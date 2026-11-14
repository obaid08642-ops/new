#!/usr/bin/env python3
"""The per-route table of an endpoints.js run: requests/second and p50/p95 of each route when it is driven alone.
  python3 tools/perf/k6/endpoint-table.py endpoints.json [seconds-per-route=15]
"""
import json, sys

m = json.load(open(sys.argv[1]))['metrics']
secs = float(sys.argv[2]) if len(sys.argv) > 2 else 15.0
rows = []
for k, v in m.items():
    if k.startswith('http_reqs{route:'):
        name = k[len('http_reqs{route:'):-1]
        d = m.get('http_req_duration{route:%s}' % name, {})
        rows.append((name, v.get('count', 0) / secs, d.get('p(50)', 0), d.get('p(95)', 0)))
print('| route | req/s | p50 ms | p95 ms |\n|---|---|---|---|')
for name, rps, p50, p95 in sorted(rows, key=lambda r: -r[1]):
    print('| %s | %.0f | %.0f | %.0f |' % (name, rps, p50, p95))
