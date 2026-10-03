"""Patient-app routes for the native crawl (expo-router file routes -> deep-link paths).

  python3 tools/native/routes.py > /tmp/native/routes.json

Groups such as (tabs)/(auth) are not part of the URL; index files map to their folder. Dynamic routes
([id], [slug]) need a real id and are listed separately with "dynamic": true (skipped by this crawl, covered
by the journeys and by the web crawl with real ids).
"""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
inv = json.load(open(os.path.join(ROOT, 'docs/review/inventory/screens.json')))['patient-app']
out = []
for r in inv:
    route = r['route']
    if re.search(r'(^|/)(_layout|\+not-found|\+native-intent|\+html)$', route):
        continue
    path = re.sub(r'/\([^)]+\)', '', route)
    path = re.sub(r'/index$', '', path) or '/'
    out.append({'route': route.lstrip('/'), 'path': path, 'dynamic': '[' in route})
uniq = {}
for r in out:
    if not r['dynamic']:
        uniq.setdefault(r['path'], r)
print(json.dumps(list(uniq.values()), ensure_ascii=False, indent=1))
