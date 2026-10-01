"""Unknown/malformed id sweep (Phase R, P3/P4).

Calls every served route that takes a path parameter, as a patient and as an admin, with
  - malformed ids ('abc', a 24-char non-hex string): must never answer 5xx (501/503 = deliberate) or hang;
  - a well-formed id that does not exist: a WRITE (POST/PUT/PATCH/DELETE) must not report success.
    A 2xx there is a fake success (the admin sees "done", the audit log records an action on nothing).
    Idempotent deletes of the caller's OWN sub-items may answer 2xx: list them in ALLOW_2XX with the reason.

  python3 tools/live/gate_ids.py          (backend on :8002, log in /tmp/nabd-backend.log)
Exit 1 when anything is reported.
"""
import collections, json, os, re, subprocess, sys, threading, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('NABD_LIVE_WAIT_429', '0')
import j_accounts, j_admin  # noqa: E402
from lib import Client  # noqa: E402

LOG = os.environ.get('NABD_BACKEND_LOG', '/tmp/nabd-backend.log')
SKIP = re.compile(r'(logout|webhook|stream|/auth/|sse|events$|realtime|guest-apply)')
MISSING = '507f1f77bcf86cd79943901a'
# METHOD path-pattern -> reason. Keep this short; every entry is a reviewed exception.
ALLOW_2XX = {
    # Idempotent deletes of the caller's OWN sub-items stay 2xx by design:
    # deleting an already-deleted line/allergy is not an error, it is the
    # desired end state. Each entry lists the reason.
    'DELETE /cart/items/:lineId': 'own cart line — idempotent remove',
    'DELETE /cart/lines/:lineId': 'own cart line — idempotent remove',
    'DELETE /medical-profile/chronic-diseases/:id': 'own sub-item — idempotent remove',
    'DELETE /medical-profile/allergies/:id': 'own sub-item — idempotent remove',
    'DELETE /medical-profile/surgeries/:id': 'own sub-item — idempotent remove',
    'DELETE /medical-profile/long-term-medications/:id': 'own sub-item — idempotent remove',
    'POST /users/me/wishlist/:itemId': 'own wishlist toggle — idempotent',
    'POST /notifications/:id/read': 'own notification — mark-read is idempotent',
    'PATCH /notifications/:id/read': 'own notification — mark-read is idempotent',
    'POST /slot-locks/:id/release': 'own lock — release is idempotent',
}


def call(c, method, path):
    out = {}

    def run():
        try:
            out['r'] = c.req(method, path, {} if method != 'GET' else None, headers={'Idempotency-Key': f'ids-{uuid.uuid4()}'})
        except Exception as e:  # network error is a finding too
            out['e'] = e
    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(20)
    if t.is_alive():
        return 'HANG', None
    if 'e' in out:
        return 'ERR', str(out['e'])[:100]
    return out['r'].status, out['r'].body


def main():
    served = json.loads(subprocess.check_output([sys.executable, os.path.join(HERE, '..', 'audit', 'served.py'), LOG]))
    routes = [r for r in served if r['served'] and ':' in r['path'] and not SKIP.search(r['path'])]
    pat = Client(j_accounts.app_signup(label='gate-ids')['token'], 'patient')
    _, adm = j_admin.login()
    bad = []
    for label, c in (('patient', pat), ('admin', adm)):
        codes = collections.Counter()
        for r in routes:
            for bogus in ('abc', '507f1f77bcf86cd79943901z'):
                st, body = call(c, r['method'], re.sub(r':[A-Za-z_]+', bogus, r['path']))
                codes[str(st)] += 1
                if st in ('HANG', 'ERR') or (isinstance(st, int) and st >= 500 and st not in (501, 503)):
                    bad.append(f"{label} {st} {r['method']} {r['path']} (malformed id) {str(body)[:100]}")
            if r['method'] != 'GET' and f"{r['method']} {r['path']}" not in ALLOW_2XX:
                st, body = call(c, r['method'], re.sub(r':[A-Za-z_]+', MISSING, r['path']))
                if isinstance(st, int) and 200 <= st < 300:
                    bad.append(f"{label} {st} {r['method']} {r['path']} (missing id -> fake success) {json.dumps(body)[:100]}")
        print(f'{label}: {sum(codes.values())} malformed-id calls, codes={dict(sorted(codes.items()))}', flush=True)
    for b in bad:
        print('  BAD', b)
    print(f'gate-ids: {len(bad)} finding(s)')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
