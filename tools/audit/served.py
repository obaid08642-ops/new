#!/usr/bin/env python3
"""Which controller actually serves each METHOD+path (Nest boot log -> JSON).

Express dispatches to the FIRST handler registered for a path, so when routes.py --dups reports
a route declared in several controllers, only the one mapped first is live. This reads the
RoutesResolver / RouterExplorer lines of a backend boot log.

  python3 tools/audit/served.py /tmp/nabd-backend.log > /tmp/served.json
"""
import json, re, sys

ansi = re.compile(r'\x1b\[[0-9;]*m')
ctl = re.compile(r'(\w+) \{(/[^}]*)\}.*RoutesResolver')
mapped = re.compile(r'Mapped \{(/[^,]*), (\w+)\}')
cur, out, seen = None, [], set()
for line in open(sys.argv[1], encoding='utf8', errors='replace'):
    line = ansi.sub('', line)
    m = ctl.search(line)
    if m:
        cur = m.group(1)
        continue
    m = mapped.search(line)
    if m and cur:
        path = re.sub(r'^/api', '', m.group(1)) or '/'
        key = (m.group(2).upper(), path)
        out.append({'cls': cur, 'method': key[0], 'path': path, 'served': key not in seen})
        seen.add(key)
json.dump(out, sys.stdout, indent=0)
