"""Admin walkthrough: sign in as the seeded admin and super admin, visit every admin route (file routes + every
same-origin link found on them), and exercise every control: links, tabs, selects, search boxes, table rows and
buttons. Records HTTP 4xx/5xx, uncaught JS errors, console errors, error text on screen, "undefined/NaN/[object]"
leaks, empty main areas, dead links (href "#" / empty / 404), horizontal overflow and slow loads.

Buttons whose label is destructive or a global emergency switch are listed as NOT CLICKED (the API journeys
j_admin_ops / j_admin_kill_switches cover them).

  CHROMIUM=/opt/pw-browsers/chromium python3 tools/live/admin_walkthrough.py [out.json] [route,route]
Prints the raw counts and one line per defect. Exit 1 when there is a defect.
"""
import json
import os
import re
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import mail_code  # noqa: E402

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
ACCOUNTS = [
    ('admin', 'admin@nabd.test', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass')),
    ('super_admin', 'owner@nabd.test', os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass')),
]
PAGES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'admin', 'src', 'pages')
DESTRUCTIVE = re.compile(r'حذف|تعليق|إيقاف|أوقف|خروج|logout|إلغاء الجهاز|revoke|إبطال|حظر|ban|delete|suspend|remove|إزالة|طوارئ|صيانة|kill|maintenance|emergency|انتحال|impersonat|مسح|purge|erase|محو', re.I)
NO_CLICK_PAGES = ('/admin/kill-switches', '/admin/module-switches', '/admin/impersonation', '/admin/gdpr')
ERR_TEXT = re.compile(r'فشل|تعذر|تعذّر|خطأ|HTTP [45]\d\d|error|failed', re.I)
LEAK = re.compile(r'\bundefined\b|\bNaN\b|\[object Object\]|Invalid Date|\bnull\b', re.I)
IGNORE_NET = re.compile(r'/_next/|favicon|/api/admin/auth/(?:session|refresh)')


def file_routes():
    out = []
    for root, _, files in os.walk(PAGES_DIR):
        if '/api' in root.replace(PAGES_DIR, ''):
            continue
        for f in files:
            if not f.endswith('.tsx') or f.startswith('_') or '[' in f or '[' in root:
                continue
            rel = os.path.relpath(os.path.join(root, f), PAGES_DIR)[:-4]
            rel = re.sub(r'(^|/)index$', '', rel)
            if rel in ('login', '') or rel.startswith('api'):
                continue
            out.append('/' + rel)
    return sorted(out)


class Walk:
    def __init__(self, role):
        self.role = role
        self.defects = []
        self.stats = {'routes': 0, 'links_checked': 0, 'buttons_clicked': 0, 'buttons_skipped': 0, 'tabs': 0, 'selects': 0, 'searches': 0, 'rows': 0}
        self.net, self.js, self.dialogs = [], [], []
        self.seen = set()
        self.notes = []

    def add(self, page, control, what, cls):
        key = (page, control, what[:80])
        if key in self.seen:
            return
        self.seen.add(key)
        self.defects.append({'role': self.role, 'page': page, 'control': control, 'what': what, 'class': cls})

    def drain(self, page, control):
        for st, m, u in self.net:
            # a 400/422 on a write is the server rejecting an empty form the crawler clicked without filling: expected
            if st in (400, 422) and m != 'GET' and control.startswith('button'):
                self.notes.append((page, control, f'{m} {u} -> {st} (validation on an unfilled form)'))
                continue
            if st >= 400:
                self.add(page, control, f'{m} {u} -> {st}', 'broken')
        for e in self.js:
            self.add(page, control, f'JS error: {e}', 'broken')
        self.net.clear(); self.js.clear(); self.dialogs.clear()


def login(pw_browser, label, email, password):
    ctx = pw_browser.new_context(locale='ar-SA', viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=45000)
    t0 = time.time()
    page.locator('form input:not([type])').first.fill(email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
    page.fill('input[inputmode="numeric"]', mail_code(email, t0))
    page.click('button[type="submit"]')
    page.wait_for_url('**/admin**', timeout=20000)
    return ctx, page


def check_page(w, page, route):
    body = page.locator('body').inner_text(timeout=3000) or ''
    main = page.locator('main, [role=main]')
    mtxt = (main.first.inner_text(timeout=3000) if main.count() else body) or ''
    if len(mtxt.strip()) < 25:
        w.add(route, '(page)', 'main area is empty after load', 'broken')
    m = LEAK.search(body)
    if m:
        ctxt = body[max(0, m.start() - 30):m.end() + 30].replace('\n', ' ')
        w.add(route, '(page)', f'raw "{m.group(0)}" shown on screen: ...{ctxt}...', 'wrong')
    for t in page.locator('[role=alert], .text-red-600, .text-red-700, .bg-red-50').all_inner_texts():
        if ERR_TEXT.search(t or ''):
            w.add(route, '(page)', f'error shown on load: {t.strip()[:100]}', 'broken')
    if page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 4'):
        w.add(route, '(page)', 'horizontal overflow at 1440px', 'wrong')
    if '/login' in page.url and '/login' not in route:
        w.add(route, '(page)', f'redirected to login ({page.url})', 'broken')


def open_route(w, page, url, route):
    t0 = time.time()
    try:
        resp = page.goto(url, wait_until='load', timeout=45000)
        try:
            page.wait_for_load_state('networkidle', timeout=8000)
        except Exception:
            w.add(route, '(page)', 'network never idle within 8s (polling or slow call)', 'slow')
    except Exception as e:
        w.add(route, '(page)', f'cannot open: {str(e)[:100]}', 'broken')
        return False
    dt = time.time() - t0
    if resp is not None and resp.status >= 400:
        w.add(route, '(page)', f'document -> {resp.status}', 'broken')
    if dt > 4:
        w.add(route, '(page)', f'load took {dt:.1f}s', 'slow')
    page.wait_for_timeout(800)
    return True


def walk(pw_browser, role, email, password, only_routes=None):
    w = Walk(role)
    ctx, page = login(pw_browser, role, email, password)
    page.on('response', lambda r: w.net.append((r.status, r.request.method, urllib.parse.urlparse(r.url).path)) if '/api/' in r.url and not IGNORE_NET.search(r.url) else None)
    page.on('pageerror', lambda e: w.js.append(str(e)[:140]))
    page.on('console', lambda m: w.js.append('console: ' + m.text[:140]) if m.type == 'error' and 'favicon' not in m.text and 'Failed to load resource' not in m.text else None)

    def on_dialog(d):
        w.dialogs.append(d.message[:80])
        d.accept('سبب اختبار تلقائي كافٍ للإجراء') if d.type == 'prompt' else d.accept()
    page.on('dialog', on_dialog)

    queue = [r for r in file_routes() if not only_routes or r in only_routes]
    visited, link_status = set(), {}
    i = 0
    while i < len(queue) and i < 220:
        route = queue[i]; i += 1
        try:
            if route in visited:
                continue
            visited.add(route)
            base = route.split('?')[0]
            w.net.clear(); w.js.clear()
            if not open_route(w, page, ADMIN_WEB + route, route):
                continue
            w.stats['routes'] += 1
            check_page(w, page, route)
            w.drain(route, '(load)')
            url_now = page.url

            # links
            hrefs = {}
            for a in page.locator('a:visible').all():
                try:
                    href = a.get_attribute('href') or ''
                    txt = (a.inner_text(timeout=300) or a.get_attribute('aria-label') or '').strip()[:40]
                except Exception:
                    continue
                hrefs.setdefault(href, txt)
            for href, txt in hrefs.items():
                if href in ('', '#') or href.startswith('javascript:'):
                    w.add(route, f'link "{txt}"', f'dead link (href="{href}")', 'broken')
                    continue
                if href.startswith(('tel:', 'mailto:', 'http://', 'https://', 'blob:', 'data:')) and not href.startswith(ADMIN_WEB):
                    continue
                p = urllib.parse.urlparse(href)
                target = p.path + (('?' + p.query) if p.query else '')
                if not p.path.startswith('/'):
                    continue
                if target not in link_status:
                    r = ctx.request.get(ADMIN_WEB + target, max_redirects=0, fail_on_status_code=False)
                    link_status[target] = r.status
                    w.stats['links_checked'] += 1
                    if p.path.startswith('/admin') and target not in visited and len(queue) < 220:
                        queue.append(target)
                st = link_status[target]
                if st == 404 or st >= 500:
                    w.add(route, f'link "{txt}"', f'{href} -> {st}', 'broken')

            if base in NO_CLICK_PAGES:
                continue

            def back():
                if page.url != url_now:
                    open_route(w, page, ADMIN_WEB + route, route)

            # tabs
            for n in range(min(page.locator('[role=tab]:visible').count(), 12)):
                tab = page.locator('[role=tab]:visible').nth(n)
                try:
                    label = tab.inner_text(timeout=300).strip()[:30]
                    w.net.clear(); w.js.clear()
                    tab.click(timeout=2500); w.stats['tabs'] += 1
                    page.wait_for_timeout(700)
                    check_page(w, page, route)
                    w.drain(route, f'tab "{label}"')
                except Exception:
                    pass
            back()

            # selects
            for n in range(min(page.locator('select:visible').count(), 8)):
                sel = page.locator('select:visible').nth(n)
                try:
                    opts = sel.locator('option').evaluate_all('o => o.map(x => x.value)')
                    name = (sel.get_attribute('aria-label') or sel.get_attribute('name') or f'select#{n}')
                    for v in opts[:8]:
                        w.net.clear(); w.js.clear()
                        sel.select_option(v, timeout=2000); w.stats['selects'] += 1
                        page.wait_for_timeout(600)
                        w.drain(route, f'{name}={v}')
                        if LEAK.search(page.locator('body').inner_text(timeout=2000)):
                            w.add(route, f'{name}={v}', 'raw undefined/NaN/null shown after filter', 'wrong')
                except Exception:
                    pass
            back()

            # search boxes: a no-match query must show an empty state, not crash or leave stale rows
            for n in range(min(page.locator('input[type=search]:visible, input[placeholder*="بحث"]:visible').count(), 3)):
                box = page.locator('input[type=search]:visible, input[placeholder*="بحث"]:visible').nth(n)
                try:
                    w.net.clear(); w.js.clear()
                    box.fill('zzqq-no-such-term-9'); box.press('Enter'); w.stats['searches'] += 1
                    page.wait_for_timeout(1200)
                    w.drain(route, 'search (no match)')
                    rows = page.locator('tbody tr:visible').count()
                    if rows > 0 and 'لا' not in page.locator('tbody').first.inner_text(timeout=2000)[:120]:
                        w.add(route, 'search', f'{rows} rows still shown for a term that matches nothing', 'wrong')
                    box.fill(''); box.press('Enter'); page.wait_for_timeout(500)
                except Exception:
                    pass

            # first table row
            try:
                row = page.locator('tbody tr:visible').first
                if row.count():
                    w.net.clear(); w.js.clear()
                    row.click(timeout=2000, position={'x': 8, 'y': 8}); w.stats['rows'] += 1
                    page.wait_for_timeout(900)
                    w.drain(route, 'row click')
                    page.keyboard.press('Escape')
            except Exception:
                pass
            back()

            # buttons
            labels, seen = [], set()
            for b in page.locator('button:visible').all():
                try:
                    txt = (b.inner_text(timeout=300) or b.get_attribute('aria-label') or b.get_attribute('title') or '').strip()
                except Exception:
                    continue
                key = re.sub(r'\d+', '#', txt)[:40]
                if not txt:
                    w.add(route, '(unlabelled button)', 'a visible button has no text, aria-label or title', 'copy')
                    continue
                if key in seen:
                    continue
                seen.add(key)
                if DESTRUCTIVE.search(txt):
                    w.stats['buttons_skipped'] += 1
                    continue
                labels.append(txt)
            for txt in labels[:45]:
                if page.url != url_now:
                    open_route(w, page, ADMIN_WEB + route, route)
                loc = page.get_by_role('button', name=txt, exact=True)
                if not loc.count():
                    continue
                w.net.clear(); w.js.clear(); w.dialogs.clear()
                try:
                    loc.first.click(timeout=2500)
                except Exception:
                    continue
                w.stats['buttons_clicked'] += 1
                page.wait_for_timeout(1100)
                w.drain(route, f'button "{txt[:40]}"')
                try:
                    for t in page.locator('[role=alert], .text-red-600, .text-red-700, .bg-red-50').all_inner_texts():
                        if ERR_TEXT.search(t or ''):
                            w.add(route, f'button "{txt[:40]}"', f'error on screen: {t.strip()[:100]}', 'broken')
                    if LEAK.search(page.locator('body').inner_text(timeout=2000)):
                        w.add(route, f'button "{txt[:40]}"', 'raw undefined/NaN/null shown after click', 'wrong')
                except Exception:
                    pass
                for close in ('إلغاء', 'إغلاق', 'Close', '×', '✕'):
                    c = page.get_by_role('button', name=close, exact=True)
                    if c.count():
                        try:
                            c.first.click(timeout=800)
                        except Exception:
                            pass
                        break
                page.keyboard.press('Escape')
            print(f'[{role}] {route:55s} links {len(hrefs):3d} buttons {len(labels):3d} defects so far {len(w.defects)}', flush=True)
        except Exception as e:
            w.add(route, '(page)', f'page did not render / crawler exception: {type(e).__name__}: {str(e)[:120]}', 'broken')
    ctx.close()
    return w


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/admin_walkthrough.json'
    only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=['--disable-dev-shm-usage'])
    results = []
    for role, email, pwd in ACCOUNTS:
        results.append(walk(browser, role, email, pwd, only))
        json.dump([{'role': r.role, 'stats': r.stats, 'defects': r.defects, 'notes': r.notes} for r in results], open(out, 'w'), ensure_ascii=False, indent=1)
    browser.close(); pw.stop()
    total = 0
    for r in results:
        print(f'\n== {r.role}: {r.stats}')
        for d in r.defects:
            total += 1
            print(f"DEFECT [{d['class']}] {d['page']} | {d['control']} | {d['what']}")
    print(f'\ndefects {total}')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
