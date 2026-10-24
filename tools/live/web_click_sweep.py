"""Patient-web click sweep (issue 1550): on each route, a signed-in (or signed-out) browser follows every link and presses
every safe button, and records what a person would find broken:
  dead_link     a same-origin link whose target answers 404/5xx or renders the not-found page
  click_api_NNN pressing a button made a same-origin /api call answer 4xx/5xx (401 only counts for a signed-in user)
  click_error   pressing a button logged a console/page error
  click_toast   pressing a button showed an error toast / alert text
  click_404     pressing a button navigated to the not-found page
  no_response   pressing a button changed nothing (no navigation, request, dialog or DOM change) - a dead button
Buttons that spend, send or destroy (pay, delete, cancel, sign out, confirm, send, submit, book/order final steps) are listed
as `skipped`, never pressed. Each press starts from a fresh load of the route so one press cannot affect the next.
Usage: python3 web_click_sweep.py --service pharmacy --state user --locale en [--width 390] [--out file.json]
       python3 web_click_sweep.py --paths /pharmacy,/medicines --state user
Routes come from web_walkthrough_routes.json (static) plus --extra (dynamic ones with real ids).
"""
import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from lib import web_login  # noqa: E402

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
DANGER = re.compile(r'(pay|delete|remove|cancel|sign.?out|log.?out|confirm|send|submit|checkout|place order|book now|reorder|clear|reset|deactivate|disable|report|block|unfollow|إلغاء|حذف|إزالة|دفع|تأكيد|إرسال|تسجيل الخروج|خروج|احجز|اطلب|مسح|إعادة)', re.I)
NF = re.compile(r'404|not found|الصفحة غير موجودة|غير متاح حالياً', re.I)
ERR_TOAST = re.compile(r'(error|failed|something went wrong|try again|unable|could not|خطأ|فشل|تعذر|حدث خطأ|حاول مرة)', re.I)

JS_ELEMS = """() => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const out = [];
  document.querySelectorAll('a[href], button, [role=button], summary, [role=tab]').forEach((e, i) => {
    if (!vis(e) || e.disabled || e.getAttribute('aria-disabled') === 'true') return;
    if (e.closest('nav[aria-label], header, footer')) { /* shared chrome is swept once on the home route */ if (!window.__chrome) return; }
    const t = (e.innerText || e.getAttribute('aria-label') || e.getAttribute('title') || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
    out.push({ i, tag: e.tagName.toLowerCase(), text: t, href: e.tagName === 'A' ? e.getAttribute('href') : null, type: e.getAttribute('type'), inForm: !!e.closest('form') });
  });
  return out;
}"""


def new_context(browser, state, locale, width, acct):
    ctx = browser.new_context(locale={'ar': 'ar-SA', 'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}.get(locale, 'en-US'),
                              viewport={'width': width, 'height': 844})
    if state == 'user':
        ctx.new_page().goto(f'{WEB}/{locale}', wait_until='load', timeout=60000)
        r = web_login(ctx, WEB, acct['email'], acct['password'])
        if not r.ok:
            print('login failed', r.status, flush=True)
    return ctx


def sweep_route(ctx, locale, path, state, chrome=False):
    page = ctx.new_page()
    findings, skipped, links_checked = [], [], 0
    found_links = []
    url = f'{WEB}/{locale}{path}'
    page.goto(url, wait_until='load', timeout=45000)
    try:
        page.wait_for_load_state('networkidle', timeout=8000)
    except Exception:
        pass
    page.wait_for_timeout(500)
    LIVE = {'apis': [], 'cons': [], 'dialogs': [], 'reqs': []}
    page.on('response', lambda r: LIVE['apis'].append((r.status, r.url)) if '/api/' in r.url and r.url.startswith(WEB) and r.status >= 400 else None)
    page.on('console', lambda m: LIVE['cons'].append(m.text[:140]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda x: LIVE['cons'].append('pageerror ' + str(x)[:140]))
    page.on('dialog', lambda d: (LIVE['dialogs'].append(d.message[:100]), d.dismiss()))
    page.on('request', lambda r: LIVE['reqs'].append(r.url) if r.resource_type in ('fetch', 'xhr') else None)
    page.evaluate(f'window.__chrome = {str(chrome).lower()}')
    elems = page.evaluate(JS_ELEMS)
    seen_links = set()
    for e in elems:
        label = f"{e['tag']} '{e['text']}'"
        if e['tag'] == 'a' and e['href']:
            h = e['href']
            if h.startswith(('mailto:', 'tel:', 'sms:', 'whatsapp:', 'javascript:', '#')) or h in seen_links:
                continue
            seen_links.add(h)
            found_links.append(h)
            if h.startswith('http') and not h.startswith(WEB):
                continue
            target = h if h.startswith('http') else WEB + (h if h.startswith('/') else '/' + h)
            links_checked += 1
            try:
                r = page.request.get(target, max_redirects=5, timeout=30000)
                body = ''
                if r.status < 400 and 'text/html' in (r.headers.get('content-type') or ''):
                    body = r.text()[:6000]
                title = re.search(r'<title>([^<]*)</title>', body)
                if r.status >= 400 or (title and NF.search(title.group(1)) and 'not-found' in body.lower()[:6000] and r.status == 404):
                    findings.append({'kind': 'dead_link', 'what': label, 'detail': f'{h} -> {r.status}'})
            except Exception as ex:
                findings.append({'kind': 'dead_link', 'what': label, 'detail': f'{h} -> {str(ex)[:80]}'})
            continue
        if DANGER.search(e['text'] or '') or e['type'] == 'submit':
            skipped.append(label)
            continue
        # press on the shared page; a navigation, or a dialog left open, is undone by reloading the route before the next press
        apis, cons, dialogs, reqs = LIVE['apis'], LIVE['cons'], LIVE['dialogs'], LIVE['reqs']
        try:
            if page.url != url or e.get('reload'):
                page.goto(url, wait_until='load', timeout=45000)
                try:
                    page.wait_for_load_state('networkidle', timeout=4000)
                except Exception:
                    pass
                page.evaluate(f'window.__chrome = {str(chrome).lower()}')
            target_el = page.evaluate_handle("(i) => { const els = [...document.querySelectorAll('a[href], button, [role=button], summary, [role=tab]')]; return els[i]; }", e['i']).as_element()
            if not target_el:
                continue
            before_html = page.evaluate('document.body.innerHTML.length')
            before_text = page.evaluate('document.body.innerText')
            before_url = page.url
            apis.clear(); cons.clear(); dialogs.clear(); reqs.clear()
            target_el.click(timeout=4000, no_wait_after=True)
            page.wait_for_timeout(900)
            try:
                page.wait_for_load_state('networkidle', timeout=3000)
            except Exception:
                pass
            after_url = page.url
            text = page.evaluate("(document.querySelector('[role=alert],[role=status],[data-sonner-toast],.toast') || {}).innerText || ''")
            after_html = page.evaluate('document.body.innerHTML.length')
            title = page.title()
            for s_, u in sorted(set(apis)):
                if s_ == 401 and state == 'guest':
                    continue
                findings.append({'kind': f'click_api_{s_}', 'what': label, 'detail': re.sub(r'\?.*', '', u[len(WEB):])})
            for c in [c for c in cons if 'RSC payload' not in c][:2]:
                findings.append({'kind': 'click_error', 'what': label, 'detail': c})
            if text and ERR_TOAST.search(text):
                findings.append({'kind': 'click_toast', 'what': label, 'detail': text[:100]})
            if after_url != before_url and NF.search(title or '') and len(page.inner_text('body')) < 600:
                findings.append({'kind': 'click_404', 'what': label, 'detail': after_url[len(WEB):]})
            if after_url == before_url and not reqs and not dialogs and abs(after_html - before_html) < 3 and not text and page.evaluate('document.body.innerText') == before_text:
                findings.append({'kind': 'no_response', 'what': label, 'detail': ''})
            if after_url != before_url or abs(after_html - before_html) >= 3:
                for x in elems:
                    x['reload'] = True
        except Exception as ex:
            findings.append({'kind': 'click_failed', 'what': label, 'detail': str(ex)[:100]})
            for x in elems:
                x['reload'] = True
    page.close()
    return findings, skipped, len(elems), links_checked, found_links


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--service')
    ap.add_argument('--paths')
    ap.add_argument('--state', default='user', choices=['user', 'guest'])
    ap.add_argument('--locale', default='en')
    ap.add_argument('--width', type=int, default=390)
    ap.add_argument('--out')
    ap.add_argument('--routes', default=os.path.join(os.path.dirname(__file__), 'web_walkthrough_routes.json'))
    ap.add_argument('--follow', type=int, default=0, help='also sweep up to N linked detail pages per route template')
    ap.add_argument('--chrome', action='store_true', help='also sweep the shared header/nav/footer')
    a = ap.parse_args()
    paths = a.paths.split(',') if a.paths else [r for r in json.load(open(a.routes))[a.service] if '{' not in r]
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    acct = None
    if a.state == 'user':
        import j_accounts
        acct = j_accounts.app_signup(label='click')
    ctx = new_context(browser, a.state, a.locale, a.width, acct)
    rows = []
    templates = [t for t in open(os.path.join(os.path.dirname(__file__), 'web_walkthrough_templates.txt')).read().split('\n') if t]
    def template_of(path):
        segs = path.strip('/').split('/')
        for t in templates:
            tsegs = t.strip('/').split('/')
            ok, i = True, 0
            for j, ts in enumerate(tsegs):
                if ts.startswith('[[...'):
                    i = len(segs)
                    break
                if i >= len(segs):
                    ok = False
                    break
                if not ts.startswith('[') and ts != segs[i]:
                    ok = False
                    break
                i += 1
            if ok and i == len(segs):
                return t
        return None
    per_template = {}
    queue = list(paths)
    done = set()
    while queue:
        path = queue.pop(0)
        if path in done:
            continue
        done.add(path)
        try:
            f, sk, n, nl, fl = sweep_route(ctx, a.locale, path, a.state, a.chrome)
        except Exception as ex:
            f, sk, n, nl, fl = [{'kind': 'route_failed', 'what': path, 'detail': str(ex)[:100]}], [], 0, 0, []
        for h in fl:
            if a.follow <= 0:
                break
            hp = re.sub(r'[?#].*', '', h if h.startswith('/') else re.sub(r'^https?://[^/]+', '', h))
            hp = re.sub(rf'^/{a.locale}', '', hp) or '/'
            if hp in done or hp in queue:
                continue
            t = template_of(hp)
            if t and '[' in t and per_template.get(t, 0) < a.follow:
                per_template[t] = per_template.get(t, 0) + 1
                queue.append(hp)
        rows.append({'route': path, 'state': a.state, 'locale': a.locale, 'width': a.width, 'elements': n, 'links': nl, 'skipped': sk, 'findings': f})
        print(f"{'FLAG' if f else 'ok  '} {a.state} {a.locale} {a.width} {path} ({n} elements, {nl} links, {len(sk)} skipped) " + ' | '.join(f"{x['kind']} {x['what']} {x['detail']}" for x in f)[:600], flush=True)
    browser.close()
    pw.stop()
    if a.out:
        json.dump(rows, open(a.out, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
