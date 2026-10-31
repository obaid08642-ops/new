"""Journey (QA D-38, the website pages of the refund policy and telehealth consent): each page answers 200 and shows the
policy text the API serves now (GET /legal/policy/:key?lang=ar). Split out of j_telehealth_consent.py, which is gated: the website
caches a published policy for an hour (docs/qa/findings/web-patient.md, A-14), so a text published minutes earlier can still be
missing from the page. Kept out of the gate (tools/live/gate_skip.txt) until the owner decides the cache window."""
import re

from lib import Client, journey, step, summary
from j_telehealth_consent import probe
from lib import WebClient
WEB = __import__('os').environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    journey('telehealth consent pages: the refund policy and telehealth consent pages show the published text')
    for key, path in (('refund_policy', '/ar/refund-policy'), ('telehealth_consent', '/ar/telehealth-consent')):
        served = Client(None, 'anon').get(f'/legal/policy/{key}?lang=ar')
        content = str((served.body or {}).get('content', '') if isinstance(served.body, dict) else '')
        heading = probe(re.sub(r'<[^>]+>', ' ', content))
        r = WebClient(WEB).req('GET', path, headers={'accept': 'text/html'})
        body = r.body if isinstance(r.body, str) else ''
        step(f'GET {path} shows the text the API serves now', r.status == 200 and bool(heading) and heading in body, f'{r.status} looking for {heading!r}')
    r = WebClient(WEB).req('GET', '/en/telehealth-consent', headers={'accept': 'text/html'})
    step('GET /en/telehealth-consent answers 200', r.status == 200, r.status)


if __name__ == '__main__':
    main()
    summary()
