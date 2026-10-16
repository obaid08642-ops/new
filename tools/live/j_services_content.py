"""Journey: published service content in the six app languages (owner decision F, issue #1556, 2026-10-16).
  backend/scripts/migrations/2026-10-services-content.ts (dry run first) writes the description, preparation,
  purpose and turnaround of every lab test, scan and nursing service from
  src/modules/catalogs/content/services-content.v1.json, the ur/hi/bn/tl names of every list, and adds the missing
  common items. The public lists the patient app and web read (GET /labs/services, /radiology/services,
  /home-care/services) then carry the text per language; added items stay hidden until an admin sets their price.
"""
import json
import os
import subprocess

from lib import Client, journey, step

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
ENV = {**os.environ, 'NODE_ENV': 'test',
       'MONGODB_URI': os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'),
       'DB_NAME': os.environ.get('DB_NAME', 'nabd_live')}
LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl']
SCRIPTS = {'ur': '؀-ۿ', 'ar': '؀-ۿ', 'hi': 'ऀ-ॿ', 'bn': 'ঀ-৿'}


def script(*args):
    out = subprocess.run(['node', 'node_modules/ts-node/dist/bin.js', '--transpile-only', 'scripts/migrations/2026-10-services-content.ts', *args],
                         cwd=BACKEND, env=ENV, capture_output=True, text=True, timeout=600)
    line = next((l for l in out.stdout.splitlines() if l.startswith('{"mode"')), None)
    return out.returncode, (json.loads(line) if line else None), (out.stdout + out.stderr)[-600:]


def clear_public_cache():
    keys = subprocess.run(['redis-cli', '--scan', '--pattern', 'cache:*'], capture_output=True, text=True).stdout.split()
    for i in range(0, len(keys), 200):
        subprocess.run(['redis-cli', 'del', *keys[i:i + 200]], capture_output=True)


def rows_of(r):
    b = r.body
    if isinstance(b, dict):
        for k in ('data', 'items', 'services'):
            if isinstance(b.get(k), list):
                return b[k]
    return b if isinstance(b, list) else []


def in_script(text, lang):
    import re
    rng = SCRIPTS.get(lang)
    return bool(text) and (not rng or re.search(f'[{rng}]', text) is not None)


def six(row):
    tr = ((row.get('content') or {}).get('translations') or {})
    bad = []
    for l in LANGS:
        t = tr.get(l) or {}
        if not (in_script(t.get('description'), l) and in_script(t.get('purpose'), l) and in_script(t.get('turnaround'), l)
                and t.get('preparation') and all(in_script(p, l) for p in t['preparation'])):
            bad.append(l)
        if not in_script(row.get(f'description_{l}'), l) or not row.get(f'preparation_{l}'):
            bad.append(f'{l}-fields')
    return bad


def run():
    import j_admin
    admin, _ = j_admin.login()
    anon = Client(None, 'anon')

    journey('service content: dry run, then publish')
    rc, rep, tail = script()
    step('the dry run succeeds and lists what it would write', rc == 0 and rep and rep['mode'] == 'dry-run', tail)
    step('every lab, scan and nursing row in the catalogue has content in the file',
         rep and all(rep['report'][k]['without_content'] == [] for k in ('lab_services', 'radiology_services', 'nursing_services')),
         rep and {k: rep['report'][k]['without_content'] for k in ('lab_services', 'radiology_services', 'nursing_services')})
    rc, rep, tail = script('--apply')
    step('the content is published', rc == 0 and rep and rep['mode'] == 'apply', tail)
    rc, rep2, tail = script('--apply')
    step('a second run writes nothing (idempotent)', rc == 0 and rep2 and all(rep2['report'][k]['written'] == 0 for k in ('lab_services', 'radiology_services', 'nursing_services')), rep2 or tail)
    clear_public_cache()

    journey('service content: the public lists carry it in six languages')
    for label, path in (('lab tests', '/labs/services'), ('scans', '/radiology/services'), ('nursing services', '/home-care/services')):
        r = anon.get(path)
        rows = rows_of(r)
        missing = {(x.get('name_en') or x.get('id')): six(x) for x in rows if six(x)}
        step(f'{label}: {len(rows)} listed, each with description, purpose, preparation and turnaround in ar/en/ur/hi/bn/tl', r.ok and rows and not missing, missing or r)
        published = all((x.get('content') or {}).get('status') == 'published' for x in rows)
        step(f'{label}: marked published (post-launch medical review pending)', published and all((x.get('content') or {}).get('post_launch_review') == 'pending' for x in rows), [x.get('content', {}).get('status') for x in rows][:5])
    r = anon.get('/labs/services')
    fbs = next((x for x in rows_of(r) if x.get('short_code') == 'FBS'), {})
    step('fasting sugar says to fast 8 hours, in Urdu too', fbs.get('fasting_required') is True and fbs.get('fasting_hours') == 8 and '8' in (fbs.get('preparation_ur') or [''])[0],
         {k: fbs.get(k) for k in ('fasting_required', 'fasting_hours', 'preparation_ur')})
    step('names exist in ur/hi/bn/tl', all(fbs.get(f'name_{l}') for l in ('ur', 'hi', 'bn', 'tl')), {l: fbs.get(f'name_{l}') for l in ('ur', 'hi', 'bn', 'tl')})

    journey('service content: added items and specialties')
    listed = [x.get('short_code') for x in rows_of(anon.get('/labs/services?search=Uric'))]
    step('an added test with no reference price is not listed to patients yet', 'URIC' not in listed, listed)
    r = admin.get('/labs/admin/catalog')
    rows = r.body if isinstance(r.body, list) else r.items()
    uric = next((x for x in rows if isinstance(x, dict) and x.get('short_code') == 'URIC'), {})
    step('the admin catalogue shows it with its content, waiting for a price', uric.get('needs_price') is True and not six(uric), {k: uric.get(k) for k in ('name_en', 'needs_price', 'public_eligibility')})
    r = admin.get('/specialties')
    specs = rows_of(r)
    hema = next((x for x in specs if x.get('code') == 'hematology'), {})
    step('missing specialties are added, with names in six languages', bool(hema) and all(hema.get(f'name_{l}') for l in ('ar', 'en', 'ur', 'hi', 'bn', 'tl')), hema or r)
    step('every specialty has its ur/hi/bn/tl name', specs and all(x.get('name_ur') and x.get('name_hi') and x.get('name_bn') and x.get('name_tl') for x in specs),
         [x.get('code') for x in specs if not x.get('name_ur')])


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
