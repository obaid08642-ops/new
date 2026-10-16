"""Journey (patient-web, issue 1548): the public pages can be kept by a shared cache, and nothing private can.
  - A guest's GET of a public static/ISR page (Home, catalogue, product, doctors list, articles) answers
    `public, s-maxage, stale-while-revalidate, stale-if-error` and sets no cookie, so Cloudflare may keep it.
  - Pages that act (cart, sign-in, orders, payments, booking) never answer a shareable header.
  - The CSP nonce on such a response is valid: the policy's nonce is on every script tag of that same response, so a kept
    copy stays consistent; each fetch from the origin draws a new one.
  - A signed-in visitor is never handed the shared copy: the answer to a session is no-store (the edge rule bypasses the
    cache on the session cookie, docs/ops/CLOUDFLARE_HTML_CACHE.md), and the guest copy holds none of that visitor's data.
  Stack: backend :8002, patient-web :3100 (behind server/nonce-server.mjs).
"""
import os
import re
import urllib.parse
import uuid

from lib import Client, WebClient, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
PUBLIC = ['/ar', '/ar/c', '/ar/consultations/doctors', '/ar/articles']
ACTING = ['/ar/cart', '/ar/login', '/ar/orders', '/ar/payments', '/ar/consultations/book', '/ar/pharmacy/payment']


def page(client, path):
    return client.req('GET', path, headers={'accept': 'text/html'})


def header(r, name):
    return next((v for k, v in r.headers.items() if k.lower() == name), '') or ''


def shareable(r):
    cc = header(r, 'cache-control').lower()
    return 'public' in cc and 's-maxage' in cc and 'stale-while-revalidate' in cc and 'stale-if-error' in cc and 'no-store' not in cc and 'private' not in cc


def nonce_ok(r):
    m = re.search(r"'nonce-([^']+)'", header(r, 'content-security-policy'))
    body = r.body if isinstance(r.body, str) else ''
    scripts = re.findall(r'<script\b[^>]*>', body, re.I)
    bad = [s for s in scripts if f'nonce="{m.group(1)}"' not in s] if m else scripts
    return bool(m) and bool(scripts) and not bad, (m.group(1) if m else None), len(scripts), bad[:2]


def main():
    import j_accounts
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    body = {'name_ar': f'كاشول {tag}', 'name_en': f'Cacheol {tag}', 'active_ingredient': f'cache-{tag}', 'generic_name': f'cache-{tag}',
            'manufacturer': 'Nabd Test', 'brand': 'C', 'category': 'vitamins', 'sub_category': '', 'form': 'tablet', 'strength': '1mg',
            'package_size': '10', 'barcode': '', 'price': 9, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid:
        admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    found = Client().get(f'/public/products/search?locale=ar&q={urllib.parse.quote("Cacheol " + tag)}')
    items = found.get('items') or []
    slug = items[0].get('slug') if items else None
    step('test data: admin publishes a product with a public page', r.ok and mid and slug, found)
    paths = PUBLIC + ([f'/ar/p/{urllib.parse.quote(slug)}'] if slug else [])

    journey('issue 1548: a guest gets public pages a shared cache may keep')
    for path in paths:
        page(WebClient(WEB), path)  # the first request renders the ISR copy; the guest below gets that copy
        g = page(WebClient(WEB), path)
        step(f'guest {path}: 200 with public s-maxage + stale-while-revalidate + stale-if-error', g.status == 200 and shareable(g), f'{g.status} {header(g, "cache-control")}')
        step(f'guest {path}: sets no cookie on the shared copy', not header(g, 'set-cookie'), header(g, 'set-cookie'))
        ok, nonce, count, bad = nonce_ok(g)
        step(f'guest {path}: the CSP nonce of the response is on all its {count} scripts', ok, f'nonce={nonce} unstamped={bad}')

    journey('issue 1548: pages that act are never shareable')
    for path in ACTING:
        g = page(WebClient(WEB), path)
        cc = header(g, 'cache-control').lower()
        step(f'guest {path}: no-store, not public', 'no-store' in cc and 'public' not in cc and 's-maxage' not in cc, f'{g.status} {cc}')

    journey('issue 1548: a signed-in visitor never gets the shared copy')
    acct = j_accounts.app_signup(label='edge-cache')
    web = WebClient(WEB)
    login = web.post('/api/auth/login', {'identifier': acct['email'], 'password': acct['password']})
    step('the visitor signs in on the website (session cookie set)', login.ok and web.cookie('nabd_access'), login)
    for path in paths:
        s = page(web, path)
        cc = header(s, 'cache-control').lower()
        step(f'signed in {path}: no-store, never public/s-maxage', s.status == 200 and 'no-store' in cc and 'public' not in cc and 's-maxage' not in cc, f'{s.status} {cc}')
        ok, _, count, bad = nonce_ok(s)
        step(f'signed in {path}: its nonce is valid on its {count} scripts', ok, bad)
        g = page(WebClient(WEB), path)
        text = g.body if isinstance(g.body, str) else ''
        step(f'guest copy of {path} after the visit holds none of their data', acct['email'] not in text and (acct['user'].get('full_name') or acct['email']) not in text and shareable(g), header(g, 'cache-control'))


if __name__ == '__main__':
    import sys
    from lib import summary
    main()
    sys.exit(1 if summary() else 0)
