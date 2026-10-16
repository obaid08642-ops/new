"""Journey (admin walkthrough D4/D5): the locations screen (admin/src/pages/admin/locations.tsx) says something
when a search matches nothing, and explains in Arabic why a region with active children cannot be disabled
(backend admin/locations DELETE answers 400 has_active_children; the page used to print that code).
  Stack: backend :8002, admin :3001 (locations are seeded by the backend)."""
import os
import time

from lib import journey, step, mail_code

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL, PASSWORD = 'admin@nabd.test', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass')


def run():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=['--disable-dev-shm-usage'])
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.on('dialog', lambda d: d.accept())
    journey('admin locations: empty search and the reason a parent cannot be disabled')
    page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=45000)
    t0 = time.time()
    page.locator('form input:not([type])').first.fill(EMAIL)
    page.fill('input[type="password"]', PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
    page.fill('input[inputmode="numeric"]', mail_code(EMAIL, t0))
    page.click('button[type="submit"]')
    page.wait_for_url('**/admin**', timeout=20000)
    page.goto(f'{ADMIN_WEB}/admin/locations', wait_until='load', timeout=45000)
    page.wait_for_selector('tbody tr', timeout=15000)

    page.fill('input[placeholder="بحث"]', 'zzqq-no-such-place')
    page.wait_for_timeout(1500)
    body = page.locator('tbody').first.inner_text()
    step('a search that matches nothing shows an empty-state sentence', 'لا توجد مواقع مطابقة' in body, repr(body[:80]))

    page.fill('input[placeholder="بحث"]', '')
    page.locator('select').filter(has=page.locator('option[value="region"]')).first.select_option('region')
    page.wait_for_selector('tbody tr button:has-text("تعطيل")', timeout=15000)
    page.locator('tbody tr button:has-text("تعطيل")').first.click()
    page.wait_for_timeout(1500)
    alert = page.locator('[role=alert]').first.inner_text() if page.locator('[role=alert]').count() else ''
    step('disabling a region with active cities explains why, in Arabic', 'عطّل المواقع التابعة' in alert, repr(alert[:100]))
    step('the raw backend code is not shown', 'has_active_children' not in alert and 'has_active_children' not in page.locator('body').inner_text(), repr(alert[:100]))
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
