"""Journey: one row per service in every catalogue list (owner decision F, issue #1556, 2026-10-16).
  backend/scripts/migrations/2026-10-unify-lab-list.ts folds the old lab list into lab_services and
  2026-10-services-dedupe.ts deletes duplicate rows after re-pointing their references (dry run first).
  The public lists the apps read then show each lab test, package, scan, nursing service, specialty and
  insurer once: GET /labs/services, /labs/packages, /radiology/services, /home-care/services (patient-app and
  patient-web service pickers), /specialties and /insurance/companies.
"""
import json
import os
import re
import subprocess
import unicodedata

from lib import Client, journey, step

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
ENV = {**os.environ, 'NODE_ENV': 'test',
       'MONGODB_URI': os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'),
       'DB_NAME': os.environ.get('DB_NAME', 'nabd_live')}


def norm(s):
    s = unicodedata.normalize('NFKC', str(s or ''))
    s = re.sub('[ً-ٰٟـ]', '', s)
    s = re.sub('[أإآٱ]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي').lower()
    return re.sub('[^a-z0-9ء-ي]+', '', s)


def name_ar(x):
    t = x.get('title') if isinstance(x.get('title'), dict) else {}
    return x.get('name_ar') or x.get('ar') or t.get('ar') or x.get('label_ar') or ''


def repeated(rows):
    seen, dup = {}, []
    for x in rows:
        if not isinstance(x, dict):
            continue
        k = ('pkg:' if x.get('is_package') else '') + norm(name_ar(x))
        if not k.strip(':'):
            continue
        if k in seen:
            dup.append(name_ar(x))
        seen[k] = True
    return dup


def rows_of(r):
    b = r.body
    if isinstance(b, dict):
        for k in ('data', 'items', 'services', 'companies'):
            if isinstance(b.get(k), list):
                return b[k]
    return b if isinstance(b, list) else []


def script(name, *args):
    out = subprocess.run(['node', 'node_modules/ts-node/dist/bin.js', '--transpile-only', f'scripts/migrations/{name}', *args],
                         cwd=BACKEND, env=ENV, capture_output=True, text=True, timeout=600)
    line = next((l for l in out.stdout.splitlines() if l.startswith('{"mode"')), None)
    return out.returncode, (json.loads(line) if line else None), (out.stdout + out.stderr)[-600:]


def _redis(*args):
    """One Redis command over a plain socket (RESP), so the journey needs no redis-cli: the CI runner has Redis as a service only."""
    import socket
    sock = socket.create_connection((os.environ.get('REDIS_HOST', '127.0.0.1'), int(os.environ.get('REDIS_PORT', '6379'))), timeout=10)
    try:
        sock.sendall(b''.join([b'*%d\r\n' % len(args)] + [b'$%d\r\n%s\r\n' % (len(a.encode()), a.encode()) for a in map(str, args)]))
        f = sock.makefile('rb')

        def read():
            line = f.readline().rstrip(b'\r\n')
            kind, rest = line[:1], line[1:]
            if kind in (b'+', b':'):
                return rest.decode()
            if kind == b'-':
                raise RuntimeError(rest.decode())
            if kind == b'$':
                n = int(rest)
                if n < 0:
                    return None
                return f.read(n + 2)[:-2].decode()
            if kind == b'*':
                return [read() for _ in range(int(rest))]
            raise RuntimeError(f'unexpected reply {line!r}')
        return read()
    finally:
        sock.close()


def clear_public_cache():
    # The public lists are cached for 15 minutes (stale-while-revalidate); the journey does not wait for expiry.
    cursor = '0'
    while True:
        cursor, keys = _redis('SCAN', cursor, 'MATCH', 'cache:*', 'COUNT', 500)
        for i in range(0, len(keys), 200):
            _redis('DEL', *keys[i:i + 200])
        if cursor == '0':
            break


LISTS = [('lab tests', '/labs/services'), ('lab packages', '/labs/packages'), ('scans', '/radiology/services'), ('nursing services', '/home-care/services')]


def run():
    import j_admin
    admin, _ = j_admin.login()
    anon = Client(None, 'anon')

    journey('service lists: the dry run reports duplicates and changes nothing')
    rc, rep, tail = script('2026-10-services-dedupe.ts')
    step('the dedupe dry run succeeds and prints its report', rc == 0 and rep and rep['mode'] == 'dry-run', tail)
    planned = {e['collection']: e['removed'] for e in (rep or {}).get('report', [])}
    step('the report names the rows it would remove per catalogue', set(planned) >= {'lab_services', 'radiology_services', 'nursing_services', 'specialties', 'insurance_companies'}, planned)

    journey('service lists: one lab list, then duplicates removed')
    rc, rep, tail = script('2026-10-unify-lab-list.ts', '--apply')
    step('the old lab list is folded into lab_services', rc == 0 and rep and rep['mode'] == 'apply', tail)
    rc, rep, tail = script('2026-10-services-dedupe.ts', '--apply')
    step('the dedupe applies', rc == 0 and rep and rep['mode'] == 'apply', tail)
    rc, rep, tail = script('2026-10-services-dedupe.ts')
    step('a second dry run finds nothing left to remove', rc == 0 and rep and all(e['removed'] == 0 for e in rep['report']), rep or tail)
    rc, rep, tail = script('2026-10-insurance-orphan-networks.ts', '--apply')
    step('orphan networks are attached on evidence or listed for the owner', rc == 0 and rep and 'for_owner' in rep, tail)
    clear_public_cache()

    journey('service lists: the public lists show each service once')
    for label, path in LISTS:
        r = anon.get(path)
        rows = rows_of(r)
        step(f'{label} list loads ({len(rows)} rows)', r.ok and len(rows) > 0, r)
        step(f'no two {label} share an Arabic name', repeated(rows) == [], repeated(rows))
    r = admin.get('/specialties')
    rows = rows_of(r)
    step(f'specialties list loads ({len(rows)} rows), each once', r.ok and len(rows) > 0 and repeated(rows) == [], repeated(rows) or r)
    r = admin.get('/insurance/companies')
    rows = rows_of(r)
    step(f'insurers list loads ({len(rows)} rows), each once', r.ok and len(rows) > 0 and repeated(rows) == [], repeated(rows) or r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
