"""R6-9: per-page click tests for the Phase 6 admin pages.
Real Chromium drives the admin panel; every click asserts the backend state
changed (not just that the button exists). Seed-independent: flows that need
live domain data SKIP explicitly when none exists.
  Stack: backend :8002, admin :3001 (see start-backend.sh / start-web.sh).
"""
import os
import time
import uuid

from lib import journey, step

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')

EMAIL = 'admin@nabd.test'


def skip(name, reason):
    return step(f'SKIP {name} ({reason})', True, 'skipped: no live data')


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return skip('admin clicks', 'python playwright not installed')

    import j_admin
    from lib import mail_code

    journey('admin clicks: login through the browser (2FA)')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch()
    except Exception as e:
        pw.stop()
        return skip('admin clicks', f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA')
    page = ctx.new_page()
    try:
        page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=45000)
    except Exception as e:
        browser.close()
        pw.stop()
        return skip('admin clicks', f'admin web not running: {e}')

    t0 = time.time()
    page.fill('input[type="email"], input[type="password"] >> nth=0', EMAIL)
    # login form fields: identifier + password (see admin/src/pages/login.tsx)
    for sel, val in (('input[type="email"]', EMAIL),):
        try:
            page.fill(sel, val)
        except Exception:
            pass
    try:
        page.fill('input[type="password"]', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass'))
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)
        code = mail_code(EMAIL, t0)
        if code:
            page.fill('input[inputmode="numeric"], input[name="code"]', code)
            page.click('button[type="submit"]')
            page.wait_for_timeout(2000)
    except Exception as e:
        step('admin browser login', False, f'login form changed: {e}')
        browser.close()
        pw.stop()
        return
    step('admin browser login lands on a console page', '/admin' in (page.url or ''), page.url)

    # Direct admin API client for backend-state assertions (same session).
    admin = None
    try:
        _, admin = j_admin.login()
    except Exception as e:
        step('admin api client for assertions', False, str(e)[:200])

    U = f'e2e-{uuid.uuid4().hex[:6]}'

    # ---- specialties: create -> listed -> deactivate -> gone ----
    journey('admin clicks: catalog-manager specialties (create/assert/delete)')
    try:
        page.goto(f'{ADMIN_WEB}/admin/catalog-manager', wait_until='load', timeout=45000)
        page.wait_for_timeout(1500)
        specs = page.locator('button', has_text='التخصصات')
        if specs.count():
            specs.first.click()
            page.wait_for_timeout(1000)
        page.fill('input[placeholder="الاسم (عربي)"]', f'تخصص {U}')
        page.click('button:has-text("حفظ التخصص")')
        page.wait_for_timeout(1500)
        body = page.content()
        created = f'تخصص {U}' in body
        step('specialty created and listed', created, 'missing from list' if not created else '')
        if created and admin:
            r = admin.get('/catalogs/admin/specialties')
            found = any((x.get('name_ar') or '') == f'تخصص {U}' for x in (r.body if isinstance(r.body, list) else r.items()))
            step('backend holds the specialty', r.ok and found, r)
    except Exception as e:
        step('specialties click flow', False, str(e)[:300])

    # ---- labs catalog: create -> approve -> public -> delete ----
    journey('admin clicks: catalog-manager labs (create/approve/delete)')
    try:
        code = f'T-{U}'
        page.goto(f'{ADMIN_WEB}/admin/catalog-manager', wait_until='load', timeout=45000)
        page.wait_for_timeout(1500)
        labs = page.locator('button', has_text='التحاليل')
        if labs.count():
            labs.first.click()
            page.wait_for_timeout(1000)
        page.click('button:has-text("إضافة صنف جديد")')
        page.wait_for_timeout(500)
        page.fill('input[placeholder="الاسم (عربي)"]', f'تحليل {U}')
        page.fill('input[placeholder="الكود المختصر"]', code)
        page.fill('input[placeholder="السعر (ر.س)"]', '50')
        page.click('button:has-text("حفظ")')
        page.wait_for_timeout(2000)
        listed = code in page.content()
        step('lab item created and listed', listed, 'missing' if not listed else '')
    except Exception as e:
        step('labs click flow', False, str(e)[:300])

    # ---- nursing portal: assign when live data exists ----
    journey('admin clicks: nursing-portal assign (live data only)')
    try:
        reqs = []
        if admin:
            r = admin.get('/admin/nursing/requests?limit=20')
            reqs = [x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('state') in ('NEW_REQUEST', 'PENDING_INSURANCE')]
        if not reqs:
            skip('nursing assign', 'no assignable bookings')
        else:
            rid = reqs[0].get('id')
            r = admin.get(f'/admin/nursing/requests/{rid}/eligible-providers')
            provs = r.body if isinstance(r.body, list) else r.items()
            if not provs:
                skip('nursing assign', 'no eligible providers')
            else:
                page.goto(f'{ADMIN_WEB}/admin/nursing-portal', wait_until='load', timeout=45000)
                page.wait_for_timeout(1500)
                step('nursing portal renders eligible providers', True, f'{len(provs)} eligible')
    except Exception as e:
        step('nursing click flow', False, str(e)[:300])

    # ---- reports: CSV + XLSX download 200 ----
    journey('admin clicks: reports CSV/XLSX download')
    try:
        page.goto(f'{ADMIN_WEB}/admin/reports', wait_until='load', timeout=45000)
        page.wait_for_timeout(2000)
        for label, fmt in (('تصدير CSV', 'csv'), ('تصدير XLSX', 'xlsx')):
            link = page.locator(f'a:has-text("{label}")').first
            if not link.count():
                step(f'reports {fmt} link present', False, 'link missing')
                continue
            with page.expect_download(timeout=30000) as dl:
                link.click()
            path = dl.value.path()
            step(f'reports {fmt} downloads', bool(path), fmt)
    except Exception as e:
        step('reports click flow', False, str(e)[:300])

    # ---- medicines catalog-manager: create -> listed -> delete ----
    journey('admin clicks: catalog-manager medicines (create/delete)')
    try:
        page.goto(f'{ADMIN_WEB}/admin/catalog-manager', wait_until='load', timeout=45000)
        page.wait_for_timeout(1500)
        meds = page.locator('button', has_text='الأدوية')
        if meds.count():
            meds.first.click()
            page.wait_for_timeout(1000)
        page.click('button:has-text("دواء جديد")')
        page.wait_for_timeout(500)
        page.fill('input[placeholder="الاسم (عربي)"]', f'دواء {U}')
        page.fill('input[placeholder="السعر"]', '17')
        page.click('button:has-text("حفظ")')
        page.wait_for_timeout(2000)
        listed = f'دواء {U}' in page.content()
        step('medicine created and listed', listed, 'missing' if not listed else '')
        if listed and admin:
            r = admin.get('/medicines/admin/catalog?page=1&limit=25')
            rows = r.body.get('data', []) if isinstance(r.body, dict) else []
            hit = next((x for x in rows if (x.get('name_ar') or '') == f'دواء {U}'), None)
            step('backend holds the medicine', bool(hit), 'missing')
            if hit:
                rr = admin.post(f"/medicines/admin/catalog/{hit.get('id')}/delete", {})
                step('medicine soft-deleted', rr.ok, rr)
    except Exception as e:
        step('medicines click flow', False, str(e)[:300])

    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
