"""Real-browser form test: open every page, open every form (inline or behind an add/edit button), FILL every
visible field with a unique traceable value, press the form's save/submit button, and record:
  - which fields were filled (label/name/placeholder) and the token typed;
  - the write request(s) the click produced (method, url, status, payload keys);
  - per field: token present in the request payload? stored in the database (documents changed since)?
Destructive buttons (delete/suspend/ban/logout/revoke/maintenance) are never pressed.

  SITE=admin  CHROMIUM=... python3 tools/live/ui_form_fill.py      (admin panel, admin session)
  SITE=web    CHROMIUM=... python3 tools/live/ui_form_fill.py      (patient website, signed-in patient)
Writes docs/review/evidence/ui_form_fill_<site>_<date>.json
Field statuses: STORED | SENT_NOT_STORED | NOT_SENT ; form statuses: SAVED | REJECTED(code) | ERROR(code) | NO_REQUEST
"""
import datetime
import json
import os
import re
import subprocess
import sys
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from lib import mail_code  # noqa: E402

SITE = os.environ.get('SITE', 'admin')
DB = os.environ.get('DB_NAME', 'nabd_form2')
BASE = {'admin': os.environ.get('NABD_ADMIN_WEB', 'http://127.0.0.1:3001'), 'web': os.environ.get('NABD_WEB', 'http://127.0.0.1:3000')}[SITE]
OPEN_RX = re.compile(r'^(\+|＋)?\s*(إضافة|أضف|جديد|إنشاء|تعديل|Add|New|Create|Edit)\b', re.I)
SAVE_RX = re.compile(r'(حفظ|إرسال|تأكيد|إنشاء|إضافة|نشر|تحديث|Save|Submit|Create|Add|Send|Update|Confirm)', re.I)
DANGER_RX = re.compile(r'حذف|تعليق|إيقاف|أوقف|حظر|خروج|إبطال|إلغاء الجهاز|طوارئ|صيانة|delete|suspend|ban|logout|revoke|maintenance|broadcast|بث', re.I)


def mongo(js):
    return subprocess.run(['docker', 'exec', 'p5mongo', 'mongosh', '--quiet', DB, '--eval', js], capture_output=True, text=True).stdout


def changed_since(ms):
    return mongo(f'''const t=new Date({ms}); const out=[];
      for (const c of db.getCollectionNames()) {{ if (/^(system\\.|mail_log|auditlogs|request_log|search_queries)/.test(c)) continue;
        const d=db.getCollection(c).find({{$or:[{{updatedAt:{{$gte:t}}}},{{createdAt:{{$gte:t}}}},{{updated_at:{{$gte:t}}}},{{created_at:{{$gte:t}}}}]}}).limit(30).toArray();
        if (d.length) out.push({{c, d}}); }} print(JSON.stringify(out));''')


def pages():
    if SITE == 'admin':
        root = os.path.join(ROOT, 'admin', 'src', 'pages')
        out = []
        for dp, _, fs in os.walk(root):
            if '/api' in dp.replace(root, '') or '[' in dp:
                continue
            for f in fs:
                if f.endswith('.tsx') and not f.startswith('_') and '[' not in f:
                    rel = re.sub(r'(^|/)index$', '', os.path.relpath(os.path.join(dp, f), root)[:-4])
                    if rel and rel != 'login':
                        out.append('/' + rel)
        return sorted(out)
    root = os.path.join(ROOT, 'patient-web', 'app', '[locale]')
    out = []
    for dp, _, fs in os.walk(root):
        if '[' in dp.replace(root, ''):
            continue
        if 'page.tsx' in fs:
            out.append('/ar' + (dp.replace(root, '') or '/'))
    return sorted(out)


def login(page):
    if SITE == 'admin':
        page.goto(BASE + '/login'); t0 = time.time()
        page.locator('form input:not([type])').first.fill('admin@nabd.test')
        page.fill('input[type="password"]', os.environ.get('NABD_ADMIN_PASSWORD', 'Adm1n!Live-Pass'))
        page.click('button[type="submit"]'); page.wait_for_selector('input[inputmode="numeric"]', timeout=20000)
        page.fill('input[inputmode="numeric"]', mail_code('admin@nabd.test', t0)); page.click('button[type="submit"]')
        page.wait_for_url('**/admin**', timeout=20000)
    else:
        import j_accounts
        a = j_accounts.app_signup(label='uiform')
        r = page.request.post(BASE + '/api/auth/login', data={'identifier': a['email'], 'password': a['password']})
        assert r.ok, r.status


def fill_visible(page, scope, tag):
    """Fill every visible editable control inside scope; returns [(label, token)]."""
    filled = []
    n = 0
    for el in scope.locator('input:visible, textarea:visible, select:visible').all()[:30]:
        try:
            if not el.is_editable():
                continue
            kind = (el.get_attribute('type') or el.evaluate('e => e.tagName')).lower()
            label = (el.get_attribute('placeholder') or el.get_attribute('name') or el.get_attribute('aria-label') or '').strip()
            if not label:
                label = el.evaluate("e => (e.closest('label')||e.parentElement||{}).innerText||''").strip()[:40]
            n += 1
            tok = f'{tag}{n:02d}'
            if kind in ('checkbox', 'radio'):
                el.check(timeout=500); filled.append((label, None)); continue
            if kind in ('file', 'hidden', 'submit', 'button', 'search', 'password'):
                continue
            if kind == 'select':
                opts = el.locator('option').all()
                vals = [o.get_attribute('value') for o in opts if o.get_attribute('value')]
                if vals:
                    el.select_option(vals[min(1, len(vals) - 1)]); filled.append((label, None))
                continue
            mode = (el.get_attribute('inputmode') or '').lower()
            lo, hi = el.get_attribute('min'), el.get_attribute('max')
            if kind == 'number' or mode in ('numeric', 'decimal'):
                # a plausible value inside the field's own bounds (700+n made every bounded form fail validation)
                v = str(int(float(lo)) + 1) if lo not in (None, '') else str(min(40 + n, int(float(hi))) if hi not in (None, '') else 40 + n)
            elif kind == 'email':
                v = f'{tok.lower()}@ui.nabd.test'
            elif kind == 'date':
                v = '2027-03-1' + str(n % 9)
            elif kind in ('time',):
                v = '10:3' + str(n % 9)
            elif kind == 'tel':
                v = f'+96655{n:07d}'
            elif kind == 'url':
                v = f'https://ui.nabd.test/{tok}'
            else:
                v = tok
            el.fill(v, timeout=800)
            filled.append((label, v if kind not in ('number', 'date', 'time') and mode not in ('numeric', 'decimal') else None))
        except Exception:
            continue
    return filled


def main():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None, args=['--disable-dev-shm-usage'])
    ctx = b.new_context(locale='ar-SA', viewport={'width': 1440, 'height': 1000})
    page = ctx.new_page()
    page.set_default_timeout(5000)
    login(page)
    writes = []
    page.on('requestfinished', lambda r: writes.append(r) if r.method in ('POST', 'PUT', 'PATCH', 'DELETE') and '/api/' in r.url and 'heartbeat' not in r.url else None)
    page.on('dialog', lambda d: d.accept('سبب اختبار تلقائي') if d.type == 'prompt' else d.accept())
    report = []
    start = os.environ.get('START', '')
    suffix = f"_{os.environ['SUFFIX']}" if os.environ.get('SUFFIX') else ''
    outp = os.path.join(ROOT, 'docs/review/evidence', f'ui_form_fill_{SITE}_{datetime.date.today().isoformat()}{suffix}.json')
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    only = {x.strip() for x in os.environ.get('ONLY', '').split(',') if x.strip()}
    for p in [x for x in pages() if x >= start and (not only or x in only)]:
        json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)   # saved after every page (survives restarts)
        print('PAGE', p, flush=True)
        try:
            page.goto(BASE + p, wait_until='load', timeout=45000); page.wait_for_timeout(2000)
        except Exception:
            continue
        page_t0 = time.time()
        openers = [None] + [t for t in dict.fromkeys(x.strip() for x in page.locator('button:visible').all_inner_texts()) if OPEN_RX.search(t) and not DANGER_RX.search(t)][:6]
        for opener in openers:
            if time.time() - page_t0 > 90:
                report.append({'page': p, 'form': str(opener), 'status': 'TIME_BUDGET'}); break
            try:
                if opener is not None:
                    page.goto(BASE + p, wait_until='load', timeout=45000); page.wait_for_timeout(1500)
                    page.get_by_role('button', name=opener, exact=True).first.click(timeout=2000); page.wait_for_timeout(800)
                scope = page.locator('[role=dialog]:visible').last if page.locator('[role=dialog]:visible').count() else page.locator('body')
                tag = 'U' + uuid.uuid4().hex[:6].upper()
                filled = fill_visible(page, scope, tag)
                if not filled:
                    continue
                saves = [t for t in dict.fromkeys(x.strip() for x in scope.locator('button:visible').all_inner_texts()) if SAVE_RX.search(t) and not DANGER_RX.search(t) and t != opener]
                if not saves:
                    report.append({'page': p, 'form': opener or '(inline)', 'status': 'NO_SAVE_BUTTON', 'fields': [f[0] for f in filled]}); continue
                writes.clear(); t0 = int(time.time() * 1000) - 50
                scope.get_by_role('button', name=saves[0], exact=True).first.click(timeout=3000)
                page.wait_for_timeout(2500)
                reqs = []
                for r in writes:
                    try:
                        resp = r.response()
                        reqs.append({'method': r.method, 'url': r.url.replace(BASE, ''), 'status': resp.status if resp else None, 'body': (r.post_data or '')[:2000]})
                    except Exception:
                        pass
                stored = changed_since(t0) if reqs else ''
                try:
                    shown = [x.strip() for x in page.locator('[role=alert]:visible, [role=status]:visible, [aria-live]:visible').all_inner_texts() if x.strip()][:3]
                except Exception:
                    shown = []
                status = 'NO_REQUEST' if not reqs else ('SAVED' if all((x['status'] or 0) < 400 for x in reqs) else
                                                        ('ERROR(%s)' % reqs[-1]['status'] if (reqs[-1]['status'] or 0) >= 500 else 'REJECTED(%s)' % reqs[-1]['status']))
                fields = {}
                for label, tok in filled:
                    if tok is None:
                        continue
                    sent = any(tok in x['body'] for x in reqs)
                    fields[label or tok] = 'STORED' if tok in stored else ('SENT_NOT_STORED' if sent else 'NOT_SENT')
                report.append({'page': p, 'form': opener or '(inline)', 'save': saves[0], 'status': status, 'message_shown': shown, 'requests': reqs, 'fields': fields})
                print(f"{p[:38]:38s} {str(opener or '(inline)')[:18]:18s} {status:14s} fields {len(fields):2d} not_sent {sum(1 for v in fields.values() if v == 'NOT_SENT'):2d} not_stored {sum(1 for v in fields.values() if v == 'SENT_NOT_STORED'):2d}", flush=True)
            except Exception as e:
                report.append({'page': p, 'form': opener or '(inline)', 'status': 'TOOL_ERROR', 'error': str(e)[:160]})
    b.close(); pw.stop()
    json.dump(report, open(outp, 'w'), ensure_ascii=False, indent=1)
    print('wrote', outp)


if __name__ == '__main__':
    main()
