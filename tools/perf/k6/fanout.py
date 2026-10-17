"""P14.27 campaign fan-out: one admin broadcast to every patient of the local test stack, timed end to end.
  python3 tools/perf/k6/fanout.py            (after seed-perf-data.js; REDIS_HOST/REDIS_PORT like the backend)
Measures (1) how long POST /admin/notification-center/broadcasts takes for the whole audience (it queues one push job
per user inside the request) and (2) how long the push worker takes to drain the queue. Prints one JSON line.
Local test stack only: the admin, the audience and the pushes are test data (no device tokens, nothing is delivered).
"""
import json, os, socket, sys, time

import fixtures
from lib import RESULTS, step

REDIS = (os.environ.get('REDIS_HOST', '127.0.0.1'), int(os.environ.get('REDIS_PORT', '6379')))
QUEUE = 'bull:push_notifications'
DRAIN_LIMIT_S = int(os.environ.get('FANOUT_DRAIN_LIMIT_S', '900'))


def redis_int(*cmd):
    """One integer reply (LLEN / ZCARD) over a plain socket: no client library needed on the runner."""
    with socket.create_connection(REDIS, timeout=5) as s:
        s.sendall(f'*{len(cmd)}\r\n'.encode() + b''.join(f'${len(c)}\r\n{c}\r\n'.encode() for c in cmd))
        line = s.makefile('rb').readline().decode().strip()
    if not line.startswith(':'):
        raise RuntimeError(f'redis: {line}')
    return int(line[1:])


def backlog():
    return redis_int('LLEN', f'{QUEUE}:wait') + redis_int('LLEN', f'{QUEUE}:active') + redis_int('ZCARD', f'{QUEUE}:delayed')


def main():
    admin = fixtures.admin_login()
    seg = admin.get('/admin/notification-center/segments')
    audience = seg.get('patients')
    step('patient audience size', seg.ok and audience, seg)
    t0 = time.time()
    r = admin.post('/admin/notification-center/broadcasts', {
        'title': 'Capacity test', 'body': 'Test data: capacity run of the campaign fan-out.', 'segment': 'patients',
        'audience_confirmed': True, 'name': f'k6-fanout-{int(t0)}'})
    request_s = time.time() - t0
    step('broadcast accepted', r.ok and r.get('queued'), r)
    queued = r.get('queued') or 0
    drained_s, left = None, None
    while time.time() - t0 < DRAIN_LIMIT_S:
        left = backlog()
        if left == 0:
            drained_s = time.time() - t0
            break
        time.sleep(1)
    return {
        'audience': audience, 'queued': queued, 'request_seconds': round(request_s, 2),
        'queued_per_second': round(queued / request_s, 1) if request_s else None,
        'drained_seconds': round(drained_s, 1) if drained_s else None, 'left_after_limit': left if drained_s is None else 0,
    }


if __name__ == '__main__':
    import contextlib
    with contextlib.redirect_stdout(sys.stderr):
        out = main()
    failed = [r for r in RESULTS if not r['ok']]
    for r in failed:
        print(f"FAIL {r['journey']}: {r['step']} -> {r['detail'][:300]}", file=sys.stderr)
    print(json.dumps(out))
    sys.exit(1 if failed else 0)
