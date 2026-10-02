"""Form trace for EVERY write action in the four clients (726 call sites from clientbodies --types).

For each client call site that writes (POST/PUT/PATCH/DELETE):
  1. sends the payload the screen sends (same keys, from clientbodies), each field filled with a UNIQUE value of
     the type the backend DTO declares (enum -> its first allowed value);
  2. as the right actor: patient (patient-app / patient-web), the provider type that owns the screen
     (provider-app/<type>/...), or the admin through the BFF session;
  3. checks: accepted? -> every field's unique value present in the database (documents created/updated since
     the call) -> value shown back by the GET calls the same screen makes.
Path parameters are filled from the actor's own GET responses (as the screen does); when no record exists the
call is reported NEEDS_FIXTURE (not tested), never passed.

  python3 tools/live/form_trace.py [--app patient-app] [--limit N]
Writes docs/review/evidence/form_trace_<date>.json and prints a per-app summary.
Statuses per call: OK | REJECTED(4xx) | ERROR(5xx) | NEEDS_FIXTURE | SKIPPED(reason)
Statuses per field: STORED_AND_SHOWN | STORED_NOT_SHOWN | NOT_STORED | UNDECLARED(screen sends a key the DTO lacks)
"""
import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'tools', 'audit'))
os.environ.setdefault('NABD_LIVE_WAIT_429', '1')
import j_onboarding as J  # noqa: E402
import j_admin  # noqa: E402
import j_accounts  # noqa: E402
from lib import Client  # noqa: E402

DB = os.environ.get('DB_NAME', 'nabd_form')
# never fired by the sweep (state of the test actors would be destroyed, or covered by dedicated journeys)
SKIP = [
    (r'^/auth/|/provider/auth/', 'auth/session flow: covered by j_accounts / j_admin / gate P1 (would replace the test actor session)'),
    (r'/users/me$|/account/(delete|erase)|/privacy/(erase|delete)|/gdpr/.*erase', 'destroys the test actor: covered by account-deletion journey'),
    (r'/provider-onboarding/', 'registration: covered by field_trace.py'),
    (r'/storage/upload|/media/upload|upload', 'binary upload: covered by journeys (moto S3)'),
    (r'/payments?/.*(webhook|callback)|/moyasar/webhook', 'gateway callback: covered by F60 tests'),
    (r'/admin/users/:x$|/users/:x$', 'deletes users: covered by users-management test'),
    (r'maintenance|kill-?switch|emergency-stop|/broadcast(s)?(/|$)|send-all|cleanup|purge|reset-all|wipe|/impersonat|force-logout|revoke-all|bulk-delete|feature-flags',
     'system-wide admin action: needs an isolated targeted test (would disrupt every later test)'),
]
PROVIDER_DIRS = {'doctor': 'doctor', 'pharmacy': 'pharmacy', 'lab': 'lab', 'radiology': 'radiology', 'nursing': 'home_care',
                 'facility': 'hospital', 'ambulance': 'ambulance'}


def mongo(js):
    r = subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js], capture_output=True, text=True)
    return r.stdout


def recent_dump(since_ms):
    js = f'''
      const t = new Date({since_ms});
      const out = [];
      for (const c of db.getCollectionNames()) {{
        if (/^(system\\.|mail_log|auditlogs|audit|event|system_events|request_log|search_queries|idempotency)/.test(c)) continue;
        const docs = db.getCollection(c).find({{$or: [{{updatedAt: {{$gte: t}}}}, {{createdAt: {{$gte: t}}}}, {{updated_at: {{$gte: t}}}}, {{created_at: {{$gte: t}}}}]}}).limit(50).toArray();
        if (docs.length) out.push({{c, docs}});
      }}
      print(JSON.stringify(out));'''
    return mongo(js)


def load_dto():
    data = json.load(open('/tmp/route_dto.json'))
    return data['routes'], data['classes']


ROUTES, CLASSES = None, None


def route_for(method, backend):
    segs = [s for s in backend.split('/') if s]
    for key, v in ROUTES.items():
        m, p = key.split(' ', 1)
        if m != method:
            continue
        bs = [s for s in p.split('/') if s]
        if len(bs) == len(segs) and all(b.startswith(':') or b == '*' or a == ':x' or a == b for a, b in zip(segs, bs)):
            return key, v
    return None, None


def value_for(fields, key, n, depth=0, url=''):
    if isinstance(fields, str):
        fields = CLASSES.get(fields) or {}
    spec = (fields or {}).get(key)
    if not spec:
        return None
    d, t = spec['decorators'], spec['ts_type']
    k = key.lower()
    lits = re.findall(r"['\"]([^'\"]+)['\"]", d.get('IsIn', '') + d.get('Matches', '') * 0)
    if lits:
        return [lits[0]] if 'IsArray' in d else lits[0]
    if 'IsEnum' in d:
        return None   # enum object: value unknown statically -> leave to the screen literal / skip
    if 'ValidateNested' in d and depth < 2:
        inner = re.search(r'=>\s*(\w+)', d.get('Type', '') or '')
        icls = inner.group(1) if inner else None
        if icls in CLASSES:
            obj = {f: value_for(CLASSES[icls], f, n * 10 + i, depth + 1, url) for i, f in enumerate(CLASSES[icls])}
            obj = {a: b for a, b in obj.items() if b is not None}
            return [obj] if 'IsArray' in d else obj
    rid = real_id(key, url)
    if rid:
        return [rid] if 'IsArray' in d else rid
    if 'IsBoolean' in d:
        return True
    if 'IsNumber' in d or 'IsInt' in d:
        mx = re.search(r'@?Max\((\d+)', ' '.join(f'{a}({b})' for a, b in d.items()))
        hi = int(mx.group(1)) if mx else 100000
        return min(hi, 100 + n % 800) if hi > 1 else 1
    if 'IsDateString' in d or 'IsDate' in d or 'date' in k or k.endswith('_at'):
        return f'2027-0{1 + n % 9}-1{n % 9}T10:00:00.000Z'
    if 'IsEmail' in d or 'email' in k:
        return f'u{n}@trace.nabd.test'
    if 'IsUUID' in d:
        return str(uuid.uuid4())
    if 'IsArray' in d:
        return [f'{key}-{n}']
    if 'IsObject' in d:
        return [{'name': f'{key}-{n}'}] if 'each' in d.get('IsObject', '') else {'note': f'{key}-{n}'}
    if 'IsString' in d or 'IsNotEmpty' in d or 'IsDefined' in d:
        if 'phone' in k or 'mobile' in k:
            return f'+9665{n % 100000000:08d}'
        if 'iban' in k:
            return 'SA0380000000608010167519'
        if 'url' in k or 'image' in k or 'logo' in k or 'photo' in k:
            return f'https://cdn.nabd.test/{key}-{n}.png'
        if 'lang' in k or 'locale' in k:
            return 'ar'
        mx = re.search(r'MaxLength\((\d+)', ' '.join(f'{a}({b})' for a, b in d.items()))
        v = f'{key}-{n}'
        return v[: int(mx.group(1))] if mx else v
    return None


ID_SOURCES = [
    (r'(^|_)(service|test|scan)_?ids?$', {'lab': 'lab_services', 'radiology': 'radiology_services', 'nurs|home-care': 'nursing_services'}),
    (r'^(medicine|drug|product)_?ids?$', {'': 'medicines'}),
    (r'^(doctor|provider|provider_account|pharmacy|lab|center|facility)_?ids?$', {'': 'provider_profiles'}),
    (r'^insurance_?(company)?_?ids?$|^company_id$', {'': 'insurance_companies'}),
    (r'^specialty_?(id|code)?$', {'': 'specialties'}),
]
_ID_CACHE = {}


def real_id(key, url):
    k = key.lower()
    for rx, by_domain in ID_SOURCES:
        if re.search(rx, k):
            col = next((c for dom, c in by_domain.items() if not dom or re.search(dom, url)), None)
            if not col:
                return None
            if col not in _ID_CACHE:
                q = '{medical_review_status: "approved"}' if col.endswith('services') else '{}'
                out = mongo(f'const d = db.{col}.findOne({q}) || db.{col}.findOne(); print(d ? (d.id || d.code || String(d._id)) : "")').strip()
                _ID_CACHE[col] = out or None
            return _ID_CACHE[col]
    return None


def leaves(v):
    if isinstance(v, dict):
        for x in v.values():
            yield from leaves(x)
    elif isinstance(v, list):
        for x in v:
            yield from leaves(x)
    elif isinstance(v, str) and len(v) > 5 and re.search(r'-\d+', v):
        yield v


def collect_ids(body, out):
    if isinstance(body, dict):
        for k in ('id', '_id', 'uuid'):
            if isinstance(body.get(k), str):
                out.append(body[k])
        for v in body.values():
            collect_ids(v, out)
    elif isinstance(body, list):
        for x in body[:20]:
            collect_ids(x, out)


class Actor:
    def __init__(self, name, client, prefix=''):
        self.name, self.c, self.prefix = name, client, prefix

    def req(self, method, path, body=None):
        return self.c.req(method, self.prefix + path, body)


def actors():
    web, _ = j_admin.login()
    pat = Client(j_accounts.app_signup(label='formtrace')['token'], 'patient')
    provs = {}
    for ptype in ('pharmacy', 'doctor', 'lab', 'radiology', 'home_care', 'hospital', 'ambulance'):
        p = J.register_pharmacy() if ptype == 'pharmacy' else J.register_type(ptype)
        J.admin_review(web, p)
        provs[ptype] = Actor(f'provider:{ptype}', Client(J.provider_after_approval(p), 'provider'))
    return {'admin': Actor('admin', web, '/api/admin'), 'patient': Actor('patient', pat), **provs}


def actor_for(at, A):
    app = at.split('/')[0]
    if app == 'admin':
        return A['admin']
    if app in ('patient-app', 'patient-web'):
        return A['patient']
    m = re.search(r'screens/(\w+)/', at)
    return A.get(PROVIDER_DIRS.get(m.group(1) if m else '', 'pharmacy'), A['pharmacy'])


def main():
    global ROUTES, CLASSES
    ap = argparse.ArgumentParser()
    ap.add_argument('--app'); ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools/audit/route_dto.py')], check=True, capture_output=True)
    ROUTES, CLASSES = load_dto()
    calls = json.loads(subprocess.run(['node', 'tools/audit/clientbodies.js', '--types'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    inv = {}
    for app in ('patient-app', 'provider-app', 'admin', 'patient-web'):
        for s in json.load(open(os.path.join(ROOT, 'docs/review/inventory', f'{app}.json'))):
            inv[s['file']] = s
    calls = [c for c in calls if c.get('method') in ('POST', 'PUT', 'PATCH', 'DELETE') and (not a.app or c['at'].startswith(a.app))]
    calls.sort(key=lambda c: ':x' in (c.get('backend') or c['url']))   # creates first, then calls on existing records
    if a.limit:
        calls = calls[:a.limit]
    A = actors()
    results = []
    for i, c in enumerate(calls):
        at, method = c['at'], c['method']
        backend = c.get('backend') or c['url']
        rec = {'at': at, 'method': method, 'url': backend, 'actor': None, 'status': None, 'fields': {}}
        reason = next((why for rx, why in SKIP if re.search(rx, backend)), None)
        if reason:
            rec['status'] = f'SKIPPED({reason})'; results.append(rec); continue
        key, route = route_for(method, backend)
        if not route:
            rec['status'] = 'NO_BACKEND_ROUTE'; results.append(rec); continue
        actor = actor_for(at, A)
        rec['actor'] = actor.name
        rec['route'] = key
        # path params from the actor's own reads (what the screen lists before acting)
        path = backend
        if ':x' in path:
            base = path.split('/:x')[0]
            ids = []
            for getp in (base, base + '/mine', base + '/my', base.rsplit('/', 1)[0]):
                r = actor.req('GET', getp)
                if r.status == 200:
                    collect_ids(r.body, ids)
                if ids:
                    break
            if not ids:
                rec['status'] = 'NEEDS_FIXTURE'; results.append(rec); continue
            path = re.sub(r':x', ids[0], path)
        dto = route.get('dto')
        fields = route.get('fields') or {}
        body = {}
        undeclared = []
        for j, k in enumerate(c.get('keys') or []):
            v = value_for(fields, k, i * 50 + j, 0, backend)
            if v is None:
                if dto and k not in fields:
                    undeclared.append(k)
                continue
            body[k] = v
        rec['dto'] = dto
        t0 = int(time.time() * 1000) - 50
        r = actor.req(method, path, body if method != 'DELETE' else None)
        rec['status'] = 'OK' if r.ok else (f'ERROR({r.status})' if r.status >= 500 else f'REJECTED({r.status})')
        rec['response'] = json.dumps(r.body, ensure_ascii=False)[:300]
        for k in undeclared:
            rec['fields'][k] = 'UNDECLARED'
        if r.ok:
            stored = recent_dump(t0)
            reads = ''
            for g in (inv.get(at.split(':')[0]) or {}).get('calls', []):
                if g['method'] == 'GET' and ':x' not in g['url'] and '${' not in g['url']:
                    rr = actor.req('GET', g['url'])
                    if rr.ok:
                        reads += json.dumps(rr.body, ensure_ascii=False)
            for k, v in body.items():
                toks = list(leaves(v))
                if not toks:
                    continue
                in_db = all(t in stored for t in toks)
                shown = all(t in reads for t in toks)
                rec['fields'][k] = 'STORED_AND_SHOWN' if in_db and shown else ('STORED_NOT_SHOWN' if in_db else 'NOT_STORED')
        results.append(rec)
        print(f"{i + 1:4d}/{len(calls)} {rec['status'][:28]:28s} {method:6s} {backend[:60]:60s} {at.split('/')[0]}", flush=True)
    day = datetime.date.today().isoformat()
    outp = os.path.join(ROOT, 'docs/review/evidence', f'form_trace_{day}.json')
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    json.dump(results, open(outp, 'w'), ensure_ascii=False, indent=1)
    print('\nwrote', outp)


if __name__ == '__main__':
    main()
