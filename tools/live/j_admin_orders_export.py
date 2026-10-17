"""Journey (admin walkthrough D2/D3): the orders screen's "تصدير CSV" link downloads the CSV of what the table shows.
admin/src/pages/admin/orders/index.tsx exportUrl() -> BFF -> backend admin/orders/export.
Before the fix the link pointed at /api/admin/orders/export (404) and dropped the "problem" filter.
  Stack: backend :8002, admin :3001 (seeded orders from the earlier gate journeys)."""
import os
import re
import time

from lib import journey, step, mail_code

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL, PASSWORD = 'admin@nabd.test', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass')
EXPORT = 'a:has-text("تصدير CSV")'


def fetch(page, href):
    """The download the browser makes for the link, from inside the page (the session cookie is Secure in production
    mode, which a Node-side request context does not send over http)."""
    return page.evaluate("""async (u) => { const r = await fetch(u, { credentials: 'same-origin' });
        return { status: r.status, type: r.headers.get('content-type') || '', text: await r.text() }; }""", href)


def total_shown(page):
    m = re.search(r'الإجمالي:\s*(\d+)', page.locator('footer').first.inner_text())
    return int(m.group(1)) if m else -1


def run():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=['--disable-dev-shm-usage'])
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 1440, 'height': 900})
    # D-35: the admin BFF proxies with the browser's admin_device cookie; reuse the gate run's enrolled browser device
    # (j_admin saves it), as j_admin_clicks does, or this fresh profile is refused as an unenrolled device.
    import j_admin
    try:
        with open(j_admin.DEVICE_FILE) as f:
            dev = f.read().strip()
    except OSError:
        dev = ''
    if len(dev) >= 16:
        ctx.add_cookies([{'name': 'admin_device', 'value': dev, 'domain': '127.0.0.1', 'path': '/'}])
    page = ctx.new_page()
    journey('admin orders: the export link downloads the CSV of the filtered table')
    page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=45000)
    t0 = time.time()
    page.locator('form input:not([type])').first.fill(EMAIL)
    page.fill('input[type="password"]', PASSWORD)
    # The admin login allows 10 a minute per IP and the journeys before this one sign in too: a 429 is waited out once,
    # as j_admin_clicks does (NABD_LIVE_WAIT_429), instead of reading it as a broken login form.
    with page.expect_response(lambda r: r.request.method == 'POST' and 'login' in r.url, timeout=20000) as sent:
        page.click('button[type="submit"]')
    if sent.value.status == 429 and os.environ.get('NABD_LIVE_WAIT_429', '1') == '1':
        time.sleep(min(int(sent.value.headers.get('retry-after') or 61), 90))
        t0 = time.time()
        with page.expect_response(lambda r: r.request.method == 'POST' and 'login' in r.url, timeout=20000) as sent:
            page.click('button[type="submit"]')
    page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
    page.fill('input[inputmode="numeric"]', mail_code(EMAIL, t0))
    page.click('button[type="submit"]')
    page.wait_for_url('**/admin**', timeout=20000)
    page.goto(f'{ADMIN_WEB}/admin/orders', wait_until='load', timeout=45000)
    page.wait_for_selector(EXPORT, timeout=15000)
    page.wait_for_timeout(1500)

    href = page.locator(EXPORT).get_attribute('href')
    r = fetch(page, href)
    step('export link answers 200 (not 404)', r['status'] == 200, f"{href} -> {r['status']}")
    step('export is a CSV', 'text/csv' in r['type'], r['type'])
    lines = [l for l in r['text'].lstrip('\ufeff').split('\n') if l.strip()]
    step('CSV starts with the header row', bool(lines) and lines[0].startswith('id,kind,state'), lines[:1])
    shown = total_shown(page)
    step('CSV rows = the table total (all orders)', shown >= 0 and len(lines) - 1 == shown, f'{len(lines) - 1} rows vs table {shown}')

    page.locator('select[aria-label="مشكلة"]').select_option('stuck')
    page.wait_for_timeout(1500)
    href2 = page.locator(EXPORT).get_attribute('href')
    step('export link carries the problem filter', 'problem=stuck' in (href2 or ''), href2)
    r2 = fetch(page, href2)
    lines2 = [l for l in r2['text'].lstrip('\ufeff').split('\n') if l.strip()] if r2['status'] == 200 else []
    shown2 = total_shown(page)
    step('filtered CSV rows = the filtered table total', r2['status'] == 200 and shown2 >= 0 and len(lines2) - 1 == shown2, f"{r2['status']}: {len(lines2) - 1} rows vs table {shown2}")
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
