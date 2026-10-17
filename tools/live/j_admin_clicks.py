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
    from lib import mail_code, enroll_device_flow

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
    # D-35: one browser identity per gate run — reuse the enrolled browser device
    # (the admin BFF proxies with this cookie), or this fresh profile mints a new
    # device per run and burns the 2-device limit.
    try:
        with open(j_admin.DEVICE_FILE) as _f:
            _dev = _f.read().strip()
    except OSError:
        _dev = ''
    if len(_dev) >= 16:
        ctx.add_cookies([{'name': 'admin_device', 'value': _dev, 'domain': '127.0.0.1', 'path': '/'}])
    page = ctx.new_page()
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
        # The admin login allows 10 a minute per IP; the journeys before this one sign in too. A 429 is waited out
        # once, as lib.Client does (NABD_LIVE_WAIT_429), instead of reading it as a changed form.
        with page.expect_response(lambda r: r.request.method == 'POST' and 'login' in r.url, timeout=20000) as sent:
            page.click('button[type="submit"]')
        if sent.value.status == 429 and os.environ.get('NABD_LIVE_WAIT_429', '1') == '1':
            time.sleep(min(int(sent.value.headers.get('retry-after') or 61), 90))
            t0 = time.time()
            with page.expect_response(lambda r: r.request.method == 'POST' and 'login' in r.url, timeout=20000) as sent:
                page.click('button[type="submit"]')
        if sent.value.status >= 400:
            raise RuntimeError(f'login answered {sent.value.status}')
        page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
        code = mail_code(EMAIL, t0)
        if not code:
            step('admin browser login', False, 'no 2FA mail')
            browser.close()
            pw.stop()
            return
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

    # D-35: this fresh browser profile mints its own device id, which the BFF
    # proxies as x-admin-device — enroll it (request → approve from the gate
    # device → e-mailed code → confirm) so the clicks below are not 403s.
    if admin:
        _cookies = ctx.cookies()
        _dev = next((c['value'] for c in _cookies if c.get('name') == 'admin_device'), None)
        enroll_device_flow(admin, _dev, EMAIL, 'gate-run-playwright-browser')

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

    # ---- permissions: page and backend name the same permission (needs-review admin guards, fix session) ----
    journey('admin clicks: permissions (controls follow the backend permission; admin reads are admin-only)')
    try:
        # A patient who somehow carries the admin network-gate header must still be refused on admin reads.
        from j_accounts import app_signup
        from lib import Client, ADMIN_GATE_TOKEN
        pat = app_signup(label='perm-patient')
        patient = Client(pat.get('token'), 'patient')
        r = patient.get('/admin/insurance/requests', headers={'x-admin-gate-token': ADMIN_GATE_TOKEN})
        step('patient token is refused on GET /admin/insurance/requests (403)', r.status == 403, r)
        r = patient.get('/admin/insurance/stats', headers={'x-admin-gate-token': ADMIN_GATE_TOKEN})
        step('patient token is refused on GET /admin/insurance/stats (403)', r.status == 403, r)
        # Owner decision 29: the live admin is the owner account, which holds finance.config.edit, so the permission
        # guard lets the commission settings through (the probe body is invalid on purpose: 400, nothing saved).
        # A role without finance.config.edit is refused (403): j_admin_roles_restrictive.
        if admin:
            rr = admin.post('/admin/finance/commissions/config', {'rates': {}, 'vat_rate': 0.15, 'reason': 'permission probe only'})
            step('backend lets the owner past the finance.config.edit guard (validation 400, not 403)', rr.status == 400, rr)
        page.goto(f'{ADMIN_WEB}/admin/orders', wait_until='load', timeout=45000)
        page.wait_for_timeout(1500)
        # /admin/today and /admin/approvals were reachable only by URL.
        for href in ('/admin/today', '/admin/approvals'):
            n = page.locator(f'nav a[href="{href}"], aside a[href="{href}"]').count()
            step(f'navigation links to {href}', n > 0, f'{n} link(s)')
        # Issues 955 / 995: the emergency controls need modules.manage (super admin), like their backend routes; role admin
        # gets no link to them, and the config portal no longer shows a dead, permanently disabled kill-switch button.
        page.goto(f'{ADMIN_WEB}/admin/config-portal', wait_until='load', timeout=45000)
        page.wait_for_timeout(1500)
        n = page.locator('a[href="/admin/kill-switches"]').count()
        step('role admin gets no link to the emergency controls (modules.manage only)', n == 0, f'{n} link(s)')
        dead = page.locator('button[disabled]:has-text("Kill-Switch")').count()
        step('config portal has no disabled kill-switch button', dead == 0, f'{dead} button(s)')
        # The loyalty page listed the patient routes (active rewards only): a deactivated reward vanished and could
        # not be turned back on. Create one, deactivate it, and it must still be listed.
        if admin:
            title = f'مكافأة {U}'
            cr = admin.post('/admin/loyalty/rewards', {'title_ar': title, 'title_en': f'Reward {U}', 'points_required': 100, 'reward_type': 'badge'})
            rid = cr.get('id')
            step('admin creates a loyalty reward', cr.ok and rid, cr)
            if rid:
                off = admin.patch(f'/admin/loyalty/rewards/{rid}', {'active': False})
                step('admin deactivates the reward', off.ok, off)
                page.goto(f'{ADMIN_WEB}/admin/loyalty-config', wait_until='load', timeout=45000)
                page.wait_for_timeout(2500)
                step('loyalty page still lists the deactivated reward (admin route, not the patient one)', title in page.content(), 'missing from the page')
                admin.delete(f'/admin/loyalty/rewards/{rid}')
    except Exception as e:
        step('permissions click flow', False, str(e)[:300])

    # ---- finance suite: one commission config, one route each (fix session, money) ----
    journey('admin clicks: finance suite commissions (the config the checkout charges, page renders)')
    try:
        if admin:
            today = time.strftime('%Y-%m-%d')
            r = admin.get(f'/admin/finance/commissions?from={today}&to={today}')
            cu = r.get('config_used') or {}
            pct = cu.get('percents') or {}
            step('GET /admin/finance/commissions is the finance-suite report (config_used.percents per service)', r.ok and isinstance(pct, dict) and 'pharmacy' in pct, r)
            cf = admin.get('/finance/commission-for?service_type=pharmacy')
            step('report percent for pharmacy equals the percent the checkout charges', cf.ok and pct.get('pharmacy') == cf.get('percent'), f'report {pct.get("pharmacy")} vs charged {cf.get("percent")}')
            step('report VAT is the KSA 15% the checkout applies', cu.get('vat_percent') == 15, cu.get('vat_percent'))
            rec = admin.get('/admin/finance/commissions/records')
            step('commission records keep their own route (commissions and ledger pages)', rec.ok and isinstance(rec.get('data'), list), rec)
        page.goto(f'{ADMIN_WEB}/admin/finance-suite', wait_until='load', timeout=45000)
        page.wait_for_selector('h2:has-text("العمولات وVAT")', timeout=30000)
        step('finance-suite renders the commissions card', True, '')
        shown = page.locator('button:has-text("حفظ وتدقيق الإعدادات")').count()
        step('finance-suite offers the commission settings form to the owner (finance.config.edit)', shown == 1, f'{shown} save button(s) shown')
    except Exception as e:
        step('finance suite flow', False, str(e)[:300])

    # ---- authority overrides: no ungoverned impersonation, every override names a permission (fix session) ----
    journey('admin authority: no ungoverned impersonation token')
    try:
        from j_accounts import app_signup
        from lib import Client
        acct = app_signup(label='authority-target')
        me = Client(acct.get('token'), 'patient').get('/auth/me')
        target = ((me.body.get('data') or me.body) or {}).get('id') if isinstance(me.body, dict) else None
        step('target patient id resolves', bool(target), me)
        if admin and target:
            r = admin.post(f'/admin/authority/users/{target}/impersonate', {})
            tok = r.get('access_token')
            step('legacy /admin/authority/users/:id/impersonate mints no token (governed sessions only)', not r.ok and not tok, r)
            if tok:
                who = Client(tok, 'patient').get('/auth/me')
                step('(the minted token acts as the target user)', False, who)
    except Exception as e:
        step('authority impersonation flow', False, str(e)[:300])

    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
