"""Patient-app routes for the native crawl (expo-router file routes -> deep-link paths), read from the app's own files.

  python3 tools/native/routes.py > /tmp/native/routes.json

The routes are the files under patient-app/app, so the list is always today's screens (an older version read a stored
inventory that went stale). Groups such as (tabs)/(auth) are not part of the URL; index files map to their folder.
Dynamic routes ([id], [slug]) need a real id and are listed with "dynamic": true (skipped by this crawl, covered by the
journeys and by the web crawl with real ids).
"""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
APP = os.path.join(ROOT, 'patient-app', 'app')
out = []
for dirpath, _dirs, files in os.walk(APP):
    for name in files:
        if not re.search(r'\.(tsx|ts|jsx|js)$', name) or '__tests__' in dirpath or re.search(r'\.(test|spec)\.', name):
            continue
        route = os.path.relpath(os.path.join(dirpath, name), APP)
        route = re.sub(r'\.(tsx|ts|jsx|js)$', '', route).replace(os.sep, '/')
        if re.search(r'(^|/)(_layout|\+not-found|\+native-intent|\+html)$', route):
            continue
        path = '/' + re.sub(r'(^|/)\([^)]+\)', '', route).lstrip('/')
        path = re.sub(r'/index$', '', path) or '/'
        out.append({'route': route, 'path': path, 'dynamic': '[' in route})
uniq = {}
for r in sorted(out, key=lambda r: r['route']):
    if not r['dynamic']:
        uniq.setdefault(r['path'], r)
print(json.dumps(list(uniq.values()), ensure_ascii=False, indent=1))
