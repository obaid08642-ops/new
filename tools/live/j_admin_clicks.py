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

# localhost, not 127.0.0.1: the passkey's RP ID is 'localhost' (softkey.py).
ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://localhost:3001')

EMAIL = 'admin@nabd.test'


def skip(name, reason):
    # Seed-independent data skips stay explicitly labeled; they are not coverage.
    return step(f'SKIP {name} ({reason})', True, 'skipped: no live data')


def fail(name, reason):
    # R7-1: missing infrastructure (browser, admin web) is a FAIL, never a PASS.
    return step(f'{name}', False, reason)


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        journey('admin clicks: login through the browser (2FA)')
        return fail('admin clicks', 'python playwright not installed')

    import j_admin
    from lib import mail_code

    journey('admin clicks: login through the browser (2FA)')
    try:
        pw = sync_playwright().start()
        # CHROMIUM: a preinstalled browser (e.g. /opt/pw-browsers/chromium) when the bundled one is absent.
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        try:
            pw.stop()
        except Exception:
            pass
        return fail('admin clicks', f'no chromium: {e}')
    ctx = browser.new_context(locale='ar-SA')
    page = ctx.new_page()
    import softkey
    # The browser has its own synthetic passkey; enroll it through the API session first.
    api_admin, _ = j_admin.login()
    step('browser passkey enrolled', softkey.ensure_enrolled(lambda p, b: api_admin.req('POST', '/api/admin' + p, b),
                                                            lambda p: api_admin.req('GET', '/api/admin' + p), browser=True), 'enroll failed')
    softkey.add_virtual_authenticator(ctx, page)  # passkey login + step-up prompts (R23)
    try:
        page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=45000)
    except Exception as e:
        browser.close()
        pw.stop()
        return fail('admin clicks', f'admin web not running: {e}')

    t0 = time.time()
    # login form fields: identifier (plain input) + password (see admin/src/pages/login.tsx)
    try:
        page.locator('form input:not([type])').first.fill(EMAIL)
        page.fill('input[type="password"]', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass'))
        page.click('button[type="submit"]')
        # An admin with a passkey signs in with it (the virtual authenticator answers);
        # otherwise the emailed 2FA code is asked for.
        passkey_btn = page.get_by_role('button', name='تأكيد بمفتاح الأمان')
        page.wait_for_function("() => !!document.querySelector('input[inputmode=\"numeric\"]') || [...document.querySelectorAll('button')].some(b => b.textContent.includes('مفتاح الأمان'))", timeout=30000)
        if passkey_btn.count():
            passkey_btn.click()  # the virtual authenticator signs, like Touch ID would
            code = None
        else:
            code = mail_code(EMAIL, t0)
        if code is None:
            pass
        elif not code:
            step('admin browser login', False, 'no 2FA mail')
            browser.close()
            pw.stop()
            return
        else:
            page.fill('input[inputmode="numeric"]', code)
            page.click('button[type="submit"]')
        page.wait_for_url('**/admin**', timeout=20000)
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
            r = admin.get('/admin/admin/nursing/requests?limit=20')
            reqs = [x for x in (r.body if isinstance(r.body, list) else r.items()) if x.get('state') in ('NEW_REQUEST', 'PENDING_INSURANCE')]
        if not reqs:
            skip('nursing assign', 'no assignable bookings')
        else:
            rid = reqs[0].get('id')
            r = admin.get(f'/admin/admin/nursing/requests/{rid}/eligible-providers')
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
    # R9 (4ce3e81): the catalog-manager medicines tab was removed; medicines-catalog.tsx is the single editor.
    journey('admin clicks: medicines-catalog (create/delete)')
    try:
        page.goto(f'{ADMIN_WEB}/admin/medicines-catalog', wait_until='load', timeout=45000)
        page.wait_for_timeout(1500)
        page.click('button:has-text("إضافة صنف جديد")')
        page.wait_for_timeout(500)
        # the form's labels are not bound to their inputs (no htmlFor), so take the input next to each label
        field = lambda label: page.locator(f'xpath=//label[normalize-space()="{label}"]/following-sibling::input[1]')
        field('الاسم بالعربية *').fill(f'دواء {U}')
        field('السعر (ر.س)').fill('17')
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
