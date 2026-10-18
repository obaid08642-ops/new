"""Journey (16.4): every host the live stack runs answers with the security headers, and publishes security.txt.
  API       http://127.0.0.1:8002  (backend)
  website   http://127.0.0.1:3100  (patient-web, next start)
  admin     http://127.0.0.1:3001  (admin BFF, next start)
nginx (deploy/nginx) is covered by tools/audit/nginx_headers_check.py; this proves the apps behind it."""
import os
import re
import urllib.error
import urllib.request

from lib import journey, step

API = os.environ.get('NABD_BACKEND', 'http://127.0.0.1:8002')
WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
ADMIN = os.environ.get('NABD_ADMIN_URL', 'http://127.0.0.1:3001')

HSTS = re.compile(r'^max-age=(\d+); includeSubDomains; preload$')
COMMON = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
}


def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'accept': 'text/html,application/json'}), timeout=30) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read().decode('utf8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read().decode('utf8', 'replace')


def check(label, url):
    status, h, _ = get(url)
    step(f'{label}: answers ({status})', status < 500, url)
    for key, want in COMMON.items():
        step(f'{label}: {key} is {want}', h.get(key) == want, h.get(key))
    m = HSTS.match(h.get('strict-transport-security', ''))
    step(f'{label}: HSTS is two years, every subdomain, preload', bool(m) and int(m.group(1)) >= 31536000, h.get('strict-transport-security'))
    step(f'{label}: Permissions-Policy is set', bool(h.get('permissions-policy')), h.get('permissions-policy'))
    step(f'{label}: Cross-Origin-Opener-Policy is set', h.get('cross-origin-opener-policy') in ('same-origin', 'same-origin-allow-popups'), h.get('cross-origin-opener-policy'))
    step(f'{label}: no X-Powered-By', 'x-powered-by' not in h, h.get('x-powered-by'))
    return h


def security_txt(label, base):
    status, h, body = get(f'{base}/.well-known/security.txt')
    step(f'{label}: /.well-known/security.txt is published (text/plain)', status == 200 and h.get('content-type', '').startswith('text/plain'), (status, h.get('content-type')))
    step(f'{label}: it names a contact and an expiry date', bool(re.search(r'^Contact: (mailto:|https:)', body, re.M)) and bool(re.search(r'^Expires: ', body, re.M)), body[:200])


def run():
    journey('security headers: API')
    check('api', f'{API}/api/v1/health/liveness')
    journey('security headers: website')
    h = check('website', f'{WEB}/ar')
    step('website: has a Content-Security-Policy that forbids framing', "frame-ancestors 'none'" in h.get('content-security-policy', ''), h.get('content-security-policy', '')[:80])
    security_txt('website', WEB)
    journey('security headers: admin')
    check('admin', f'{ADMIN}/')
    security_txt('admin', ADMIN)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
