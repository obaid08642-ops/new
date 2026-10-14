"""API load baseline for the key read paths (local stack, NOT production hardware).

  python3 tools/perf/api_load.py [N=200] [levels=1,10,25]   -> docs/review/evidence/api_load_<date>.json

Signs in as the seeded patient (/tmp/seed/patient.json) once; every endpoint is hit N times per concurrency level
with keep-alive connections. Reports p50/p95/p99 latency (ms), throughput (req/s) and non-2xx counts, including
429s from the rate limiter (not bypassed: the bypass header is a production security check, not a test tool).
"""
import datetime, http.client, json, os, statistics, sys, threading, time, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HOST, PORT, BASE = '127.0.0.1', 8002, '/api/v1'
N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
LEVELS = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '1,10,25').split(',')]
DOCTOR = os.environ.get('DOCTOR_ID', '262d226e-ffed-41a5-b8e3-d4af2b8d4aa3')
TOMORROW = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
ENDPOINTS = [
    ('public', '/care/specialties'),
    ('public', '/care/doctors?limit=20'),
    ('public', f'/care/doctors/{DOCTOR}/slots?date={TOMORROW}&service_type=clinic'),
    ('public', '/articles?limit=20'),
    ('public', '/medicines/search/did-you-mean?q=' + urllib.parse.quote('بنادول')),
    ('patient', '/content/home'),
    ('patient', '/users/me/profile'),
    ('patient', '/home/search?q=' + urllib.parse.quote('سكر')),
    ('patient', '/patient/pharmacy/orders'),
    ('patient', '/care/appointments'),
]


def login():
    p = json.load(open('/tmp/seed/patient.json'))
    c = http.client.HTTPConnection(HOST, PORT, timeout=30)
    c.request('POST', BASE + '/auth/login', json.dumps({'identifier': p['email'], 'password': p['password']}), {'content-type': 'application/json'})
    b = json.loads(c.getresponse().read())
    t = b.get('token')
    return t.get('accessToken') if isinstance(t, dict) else t


def run(path, token, conc):
    lat, codes, lock = [], {}, threading.Lock()
    per = [N // conc + (1 if i < N % conc else 0) for i in range(conc)]
    headers = {'accept': 'application/json'}
    if token:
        headers['authorization'] = f'Bearer {token}'

    def worker(k):
        c = http.client.HTTPConnection(HOST, PORT, timeout=60)
        for _ in range(k):
            t0 = time.perf_counter()
            try:
                c.request('GET', BASE + path, headers=headers)
                r = c.getresponse(); r.read(); st = r.status
            except Exception:
                st = 0; c = http.client.HTTPConnection(HOST, PORT, timeout=60)
            ms = (time.perf_counter() - t0) * 1000
            with lock:
                lat.append(ms); codes[st] = codes.get(st, 0) + 1
    t0 = time.perf_counter()
    ts = [threading.Thread(target=worker, args=(k,)) for k in per if k]
    [t.start() for t in ts]; [t.join() for t in ts]
    wall = time.perf_counter() - t0
    q = statistics.quantiles(lat, n=100)
    return {'p50': round(q[49], 1), 'p95': round(q[94], 1), 'p99': round(q[98], 1), 'rps': round(len(lat) / wall, 1),
            'codes': {str(k): v for k, v in sorted(codes.items())}}


def main():
    token = login()
    out = {'note': 'local stack on the review container; not production hardware', 'n_per_level': N, 'levels': LEVELS, 'results': {}}
    for kind, path in ENDPOINTS:
        out['results'][path] = {}
        for conc in LEVELS:
            res = run(path, token if kind == 'patient' else None, conc)
            out['results'][path][str(conc)] = res
            print(f'{path[:60]:60s} c={conc:<3d} p50 {res["p50"]:7.1f} p95 {res["p95"]:7.1f} p99 {res["p99"]:7.1f}  {res["rps"]:7.1f} rps  {res["codes"]}', flush=True)
    p = os.path.join(ROOT, 'docs/review/evidence', f'api_load_{datetime.date.today().isoformat()}.json')
    json.dump(out, open(p, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
