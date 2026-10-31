"""Journey (QA A-14, patient-web in a real browser): the public legal pages.
  - the admin publishes the three patient policies on the LOCAL TEST database (PUT /admin/admin/legal/policy/:key, marked
    "QA test data"): with no policy row the website answers 404 by design (patient-web lib/legal/embedded.ts), so the
    local stack needs the text before the pages can be read; production is read-only in this sweep and is not touched;
  - the API read-back (GET /legal/policy/:key?lang=) returns the same text in each language;
  - the browser opens /ar/terms, /en/terms, /ar/privacy, /en/privacy, /ar/refund-policy and /en/refund-policy: each answers
    200 and shows the policy text (not the 404 page); the page is read after a reload too.
Footer links and the PDF download are not covered here.
A missing browser or website is a FAIL, never a PASS."""
import os
import time

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
POLICIES = [
    ('patient_terms', 'terms'),
    ('privacy_policy', 'privacy'),
    ('refund_policy', 'refund-policy'),
]


def main():
    import j_admin
    from playwright.sync_api import sync_playwright
    from lib import summary

    admin, _ = j_admin.login()
    tag = f'QA test data {int(time.time())}'

    journey('legal A-14: the local test database holds the policy text')
    markers = {}
    for key, _ in POLICIES:
        marker = f'{tag} {key}'
        markers[key] = marker
        body = {'title_ar': f'{key} ar', 'title_en': f'{key} en', 'version': f'qa-{int(time.time())}', 'effective_date': '2026-01-01T00:00:00.000Z',
                'content_ar': f'<p>{marker} عربي</p>', 'content_en': f'<p>{marker} english</p>',
                'change_note': 'QA seed on the local test database', 'major': False}
        r = admin.put(f'/admin/admin/legal/policy/{key}', body)
        step(f'admin seeds {key} (local test database)', r.ok, r.status)

    anon = Client(None, 'anon')
    for key, _ in POLICIES:
        for lang in ('ar', 'en'):
            r = anon.get(f'/legal/policy/{key}?lang={lang}')
            content = str((r.body or {}).get('content', '') if isinstance(r.body, dict) else '')
            step(f'GET /legal/policy/{key}?lang={lang} carries the seeded text', r.ok and markers[key] in content, r.status)

    journey('legal A-14: the website shows the three policies in both languages')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        for key, slug in POLICIES:
            for lang in ('ar', 'en'):
                url = f'{WEB}/{lang}/{slug}'
                resp = page.goto(url, wait_until='load', timeout=60000)
                text = page.inner_text('body')
                step(f'{lang}/{slug} answers 200 with the policy text', resp is not None and resp.status == 200 and markers[key] in text,
                     f'{resp.status if resp else None}')
                page.reload(wait_until='load')
                text = page.inner_text('body')
                step(f'{lang}/{slug} after reload still shows the policy text', markers[key] in text, markers[key][:40])
    finally:
        browser.close()
        pw.stop()
    summary()


if __name__ == '__main__':
    main()
