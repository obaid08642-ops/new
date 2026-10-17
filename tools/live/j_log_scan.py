"""Journey 16.6: scan the backend log of this whole gate run for personal data.
Every other journey has already driven sign-ups, OTP logins, orders and bookings with phone numbers and e-mail addresses
through the API, so by the time this one runs (last) the log holds the traffic of the whole run. It must hold no phone
number, no e-mail address and no national id in the clear, and every JSON line must carry the request id and the fields
of the log contract (20.3).
"""
import json
import os
import re

from lib import journey, step, summary

LOG = os.environ.get('BACKEND_LOG', '/tmp/nabd-backend.log')
PHONE = re.compile(r'(?<!\d)(?:\+?966|0)?5\d{8}(?!\d)|\+\d{10,15}(?!\d)')
EMAIL = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')
NATIONAL_ID = re.compile(r'(?<![\d.])[12]\d{9}(?![\d.])')
KEYS = {'ts', 'level', 'service', 'module', 'event', 'request_id', 'user_id', 'route', 'status', 'duration_ms', 'details'}


def leaks(text):
    found = []
    for name, rx in (('phone', PHONE), ('email', EMAIL), ('national id', NATIONAL_ID)):
        m = rx.search(text)
        if m:
            found.append(f'{name}: {m.group(0)[:4]}...')
    return found


def main():
    journey('16.6 backend log has no personal data')
    lines = open(LOG, errors='replace').read().splitlines() if os.path.exists(LOG) else []
    step('the backend log exists and holds the traffic of the run', len(lines) > 50, f'{LOG}: {len(lines)} lines')
    records = []
    for line in lines:
        try:
            rec = json.loads(line)
        except ValueError:
            continue
        if isinstance(rec, dict) and 'event' in rec and 'level' in rec:
            records.append(rec)
    step('the request lines are structured JSON', sum(1 for r in records if r['event'] == 'http_request') > 20,
         f'{len(records)} JSON lines')
    bad_shape = [r for r in records if not KEYS <= set(r)]
    step('every JSON line has the whole log contract', not bad_shape, bad_shape[:1])
    dirty = [(i, leaks(l)) for i, l in enumerate(lines) if leaks(l)]
    step('no phone number, e-mail address or national id in any line', not dirty,
         [(i, f, lines[i][:160]) for i, f in dirty[:3]])
    errors = [r for r in records if r['level'] == 'error' and r['event'] == 'exception']
    step('every logged exception carries the error id that was answered', all((r.get('details') or {}).get('error_id') == r['request_id'] for r in errors),
         errors[:1])


if __name__ == '__main__':
    main()
    summary()
