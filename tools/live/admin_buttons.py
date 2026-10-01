"""Admin button sweep: open every admin page in Chromium, click every distinct button, and report
the buttons whose click produced a backend error (4xx/5xx on /api/*), an uncaught JS error, or
an error message on screen. Destructive labels (delete/suspend/logout/revoke) are not clicked here:
they are covered by the API journeys (j_admin_ops, gate users tests).

  CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome python3 tools/live/admin_buttons.py
Writes /tmp/admin_buttons.json. Exit 1 when a button fails.
"""
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import mail_code  # noqa: E402

ADMIN_WEB = os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001')
EMAIL = 'admin@nabd.test'
PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'admin', 'src', 'pages')
SKIP = re.compile(r'حذف|تعليق|إيقاف|أوقف|خروج|logout|إلغاء الجهاز|revoke|إبطال|حظر|ban|delete|suspend', re.I)
ERR_TEXT = re.compile(r'فشل|تعذر|خطأ|HTTP [45]\d\d|error', re.I)


def pages():
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


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=['--disable-dev-shm-usage'])
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto(f'{ADMIN_WEB}/login', wait_until='load', timeout=45000)
    t0 = time.time()
    page.locator('form input:not([type])').first.fill(EMAIL)
    page.fill('input[type="password"]', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass'))
    page.click('button[type="submit"]')
    page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
    page.fill('input[inputmode="numeric"]', mail_code(EMAIL, t0))
    page.click('button[type="submit"]')
    page.wait_for_url('**/admin**', timeout=20000)

    state = {'net': [], 'js': [], 'dialogs': []}
    page.on('response', lambda r: state['net'].append((r.status, r.request.method, r.url.split('?')[0].replace(ADMIN_WEB, ''))) if '/api/' in r.url else None)
    page.on('pageerror', lambda e: state['js'].append(str(e)[:160]))

    def on_dialog(d):
        state['dialogs'].append(d.message[:80])
        if d.type == 'prompt':
            d.accept('سبب اختبار تلقائي كافٍ للإجراء')
        else:
            d.accept()
    page.on('dialog', on_dialog)

    report, failures = [], []
    for p in pages():
        url = ADMIN_WEB + p
        try:
            page.goto(url, wait_until='load', timeout=45000)
            page.wait_for_timeout(2500)
        except Exception as e:
            failures.append({'page': p, 'button': '(open)', 'why': str(e)[:120]})
            continue
        labels, seen = [], set()
        for b in page.locator('main button:visible, [role=main] button:visible, button:visible').all():
            try:
                txt = (b.inner_text(timeout=500) or b.get_attribute('aria-label') or b.get_attribute('title') or '').strip()
            except Exception:
                continue
            key = re.sub(r'\d+', '#', txt)[:40]
            if not txt or key in seen or SKIP.search(txt):
                continue
            seen.add(key)
            labels.append(txt)
        clicked = 0
        for txt in labels[:40]:
            if page.url.split('?')[0] != url:
                page.goto(url, wait_until='load', timeout=45000)
                page.wait_for_timeout(1500)
            loc = page.get_by_role('button', name=txt, exact=True)
            if not loc.count():
                continue
            state['net'].clear(); state['js'].clear(); state['dialogs'].clear()
            try:
                loc.first.click(timeout=3000)
            except Exception:
                continue
            clicked += 1
            page.wait_for_timeout(1300)
            bad_net = [n for n in state['net'] if n[0] >= 400 and n[0] != 401]
            body_err = ''
            try:
                toast = page.locator('[role=alert], .text-red-600, .text-red-700, .bg-red-50').all_inner_texts()
                body_err = ' | '.join(t for t in toast if ERR_TEXT.search(t))[:160]
            except Exception:
                pass
            if bad_net or state['js'] or body_err:
                failures.append({'page': p, 'button': txt[:50], 'net': bad_net[:4], 'js': state['js'][:2], 'screen': body_err})
            # close any modal the click opened
            for close in ('إلغاء', 'إغلاق', 'Close', '×', '✕'):
                c = page.get_by_role('button', name=close, exact=True)
                if c.count():
                    try:
                        c.first.click(timeout=800)
                    except Exception:
                        pass
                    break
            page.keyboard.press('Escape')
        report.append({'page': p, 'buttons_found': len(labels), 'clicked': clicked})
        json.dump({'pages': report, 'failures': failures}, open('/tmp/admin_buttons.json', 'w'), ensure_ascii=False, indent=1)
        print(f'{p:45s} buttons {len(labels):3d} clicked {clicked:3d} failures {sum(1 for f in failures if f["page"] == p)}', flush=True)
    browser.close()
    pw.stop()
    print(f'\npages {len(report)}, buttons clicked {sum(r["clicked"] for r in report)}, failures {len(failures)}')
    for f in failures:
        print('FAIL', json.dumps(f, ensure_ascii=False)[:300])
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
