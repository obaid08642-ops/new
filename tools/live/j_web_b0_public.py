"""Journey (patient-web, signed out): the public entry points (issues 439, 430, 436).
  - A signed-out visitor who searches from Home lands on /search with the query, and the results come (GET /search is public),
    instead of the login page losing the text.
  - The page headers let Google sign-in open its popup (Cross-Origin-Opener-Policy same-origin-allow-popups, and the
    policy names accounts.google.com/gsi/).
  - /welcome links to the intro slides (/onboarding).
  Stack: backend :8002, patient-web :3100.
"""
import os
import uuid

from lib import journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    body = {'name_ar': f'سيرشول {tag}', 'name_en': f'Searchol {tag}', 'active_ingredient': f'search-{tag}', 'generic_name': f'search-{tag}',
            'manufacturer': 'Nabd Test', 'brand': 'S', 'category': 'vitamins', 'sub_category': '', 'form': 'tablet', 'strength': '1mg',
            'package_size': '10', 'barcode': '', 'price': 9, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid:
        admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    step('admin publishes a medicine to search for', r.ok and mid, r)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web public', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    try:
        journey('issue 439: a signed-out visitor searches')
        page.goto(f'{WEB}/ar/search?q={tag}', wait_until='load', timeout=60000)
        step('the visitor stays on the search page (no sign-in asked)', '/ar/search' in page.url and '/login' not in page.url, page.url)
        found = False
        for _ in range(10):
            if page.get_by_text(f'سيرشول {tag}').count() or page.get_by_text(f'Searchol {tag}').count():
                found = True
                break
            page.wait_for_timeout(2000)
            if not found and _ in (4, 8):
                page.reload(wait_until='load')
        step('the results show the medicine', found, page.locator('body').inner_text()[:300])

        journey('issue 430: Google sign-in may open its popup')
        resp = page.goto(f'{WEB}/ar/login', wait_until='load', timeout=60000)
        headers = resp.headers if resp else {}
        step('the opener policy allows popups', headers.get('cross-origin-opener-policy') == 'same-origin-allow-popups', headers.get('cross-origin-opener-policy'))
        csp = headers.get('content-security-policy', '')
        step('the policy lets Google sign-in load (accounts.google.com/gsi/)', 'https://accounts.google.com/gsi/' in csp, csp[:300])

        journey('issue 436: the intro slides are reachable')
        page.goto(f'{WEB}/ar/welcome', wait_until='load', timeout=60000)
        link = page.locator('a[href="/ar/onboarding"]')
        step('Welcome links to the intro slides', link.count() == 1, f'{link.count()} link(s)')
    except Exception as e:
        step('web public flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
