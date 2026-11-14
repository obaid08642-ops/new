"""Patient-web walkthrough crawler (issue 1550). Loads every route of a service signed out and signed in, across the
locale / width / colour-scheme matrix, and records what a person would see broken:
  sign_in_wall   a guest sees only the sign-in form on a page that should show its public part first
  http_NNN       the document answered an error status
  api_NNN        a same-origin /api call answered 4xx/5xx (401 on a guest's personal call is listed, not hidden)
  console_error  a console error or an uncaught page error
  overflow       the page scrolls sideways
  raw_key        text that looks like an untranslated message key (a.b.c)
  bad_value      "undefined", "NaN", "[object Object]" in the visible text
  broken_image   a visible image that did not load
  empty_main     the main area has no text at all
  not_found      the not-found page
  wrong_dir      <html dir> does not match the locale (rtl for ar and ur)
  arabic_leak    a non-Arabic locale whose visible text is mostly Arabic script (data names excluded by the 50% rule)
Usage: python3 web_walkthrough.py --routes routes.json --service pharmacy [--matrix quick|full] [--out report.json]
  routes.json: { "<service>": ["/pharmacy", "/pharmacy/cart", ...] } (paths without the locale; {x} placeholders are skipped)
Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh), smtp_sink on :2525 for the OTP.
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
LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil']
RTL = {'ar', 'ur'}
KEY = re.compile(r'(?<![\w/@.-])[a-z][a-z0-9]{1,20}(?:\.[a-zA-Z][a-zA-Z0-9_]{1,24}){2,}(?![\w/@-])')
BAD = re.compile(r'\b(undefined|NaN|\[object Object\])\b')
ARABIC = re.compile(r'[؀-ۿ]')
LETTER = re.compile(r'[A-Za-z؀-ۿऀ-ॿঀ-৿]')
MATRICES = {
    'axe': [('en', 390, 'dark'), ('ar', 360, 'light'), ('hi', 390, 'dark'), ('en', 1280, 'light'), ('ar', 768, 'dark')],
    # locale x state at 390 light, plus widths and dark on ar/en
    'quick': [('ar', 390, 'light'), ('en', 390, 'light'), ('en', 1280, 'light'), ('en', 390, 'dark')],
    'full': [(l, 390, 'light') for l in LOCALES] + [(l, w, 'light') for l in ('ar', 'en') for w in (360, 768, 1280)] + [(l, 390, 'dark') for l in ('ar', 'en')],
}


def signup(pw_ctx):
    import j_accounts
    return j_accounts.app_signup(label='walk')


AXE_JS = os.environ.get('AXE_JS', '/tmp/axe/node_modules/axe-core/axe.min.js')
AXE_SRC = open(AXE_JS, encoding='utf-8').read() if os.environ.get('AXE', '') == '1' and os.path.exists(AXE_JS) else ''


def check_page(page, url, locale, state):
    flags = []
    api_errors, console = [], []

    def on_resp(r):
        try:
            if r.status >= 400 and '/api/' in r.url and r.url.startswith(WEB):
                api_errors.append((r.status, re.sub(r'\?.*', '', r.url[len(WEB):])))
        except Exception:
            pass

    page.on('response', on_resp)
    page.on('console', lambda m: console.append(m.text[:160]) if m.type == 'error' else None)
    page.on('pageerror', lambda e: console.append('pageerror: ' + str(e)[:160]))
    status = None
    try:
        resp = page.goto(url, wait_until='load', timeout=45000)
        status = resp.status if resp else None
        try:
            page.wait_for_load_state('networkidle', timeout=8000)
        except Exception:
            pass
        page.wait_for_timeout(600)
    except Exception as e:
        flags.append(('goto_failed', str(e)[:120]))
    page.remove_listener('response', on_resp)
    if status and status >= 400:
        flags.append((f'http_{status}', ''))
    for s, p in sorted(set(api_errors)):
        flags.append((f'api_{s}', p))
    for c in console[:3]:
        if 'Failed to load resource' in c:
            continue
        flags.append(('console_error', c))
    try:
        info = page.evaluate("""() => {
          const main = document.querySelector('main') || document.body;
          const text = (main.innerText || '').trim();
          const imgs = [...document.images].filter(i => i.offsetParent && i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src).slice(0, 3);
          return {
            text, path: location.pathname,
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            pw: !!document.querySelector('input[type=password]'),
            dir: document.documentElement.getAttribute('dir'), lang: document.documentElement.getAttribute('lang'),
            title: document.title, h1: (document.querySelector('h1') || {}).innerText || '', imgs,
            nf: /404|not found|الصفحة غير موجودة/i.test(document.title) && text.length < 400,
            leaves: (() => {
              const out = [];
              const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
              let n;
              while ((n = w.nextNode())) {
                const t = (n.nodeValue || '').trim();
                if (t.length < 3) continue;
                const el = n.parentElement;
                if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName) && false) continue;
                const r = el.getBoundingClientRect();
                if (r.width < 2 || r.height < 2) continue;
                out.push(t.slice(0, 80));
                if (out.length > 600) break;
              }
              return out;
            })(),
          };
        }""")
    except Exception as e:
        flags.append(('eval_failed', str(e)[:100]))
        return flags, ''
    text = info['text']
    if info['overflow'] > 2:
        flags.append(('overflow', f"+{info['overflow']}px"))
    if info['nf']:
        flags.append(('not_found', info['title'][:60]))
    if len(text) < 20 and not info['nf']:
        flags.append(('empty_main', info['path']))
    if state == 'guest' and (info['pw'] or '/login' in info['path']) and '/login' not in url:
        flags.append(('sign_in_wall', info['path']))
    k = KEY.findall(text)
    if k:
        flags.append(('raw_key', ', '.join(sorted(set(k))[:4])))
    b = BAD.findall(text)
    if b:
        flags.append(('bad_value', ', '.join(sorted(set(b)))))
    if info['imgs']:
        flags.append(('broken_image', info['imgs'][0][:100]))
    want = 'rtl' if locale in RTL else 'ltr'
    if info['dir'] and info['dir'] != want:
        flags.append(('wrong_dir', f"{info['dir']} for {locale}"))
    if locale not in RTL and text:
        letters = LETTER.findall(text)
        if len(letters) > 40 and len(ARABIC.findall(text)) / len(letters) > 0.5:
            flags.append(('arabic_leak', f'{locale}: {text[:60]!r}'))
    # a leaf of visible text in the wrong script for the page language (catalogue names are the usual cause)
    if locale not in RTL:
        bad = [t for t in info['leaves'] if ARABIC.search(t)]
        if bad:
            flags.append(('arabic_text', f'{len(bad)} leaves, e.g. ' + ' / '.join(bad[:3])))
    if locale in ('hi', 'bn', 'ur'):
        own = {'hi': re.compile(r'[\u0900-\u097F]'), 'bn': re.compile(r'[\u0980-\u09FF]'), 'ur': ARABIC}[locale]
        eng = [t for t in info['leaves'] if re.search(r'[A-Za-z]{4,}\s+[A-Za-z]{3,}', t) and not own.search(t) and not re.search(r'@|https?:|\.com|SAR|\d{3}', t)]
        if eng:
            flags.append(('english_text', f'{len(eng)} leaves, e.g. ' + ' / '.join(eng[:3])))
    if locale == 'ar':
        lat = [t for t in info['leaves'] if re.search(r'\b[A-Za-z]{4,}\s+[A-Za-z]{3,}\b', t) and not ARABIC.search(t) and not re.search(r'@|https?:|\.com|SAR', t)]
        if lat:
            flags.append(('english_text', f'{len(lat)} leaves, e.g. ' + ' / '.join(lat[:3])))
    if AXE_SRC:
        try:
            page.add_script_tag(content=AXE_SRC)
            res = page.evaluate("async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })")
            for v in res['violations']:
                if v.get('impact') in ('serious', 'critical'):
                    t = [n.get('target', ['?'])[0] for n in v.get('nodes', [])][:3]
                    flags.append((f"axe_{v['id']}", f"{v['impact']} x{len(v.get('nodes', []))} {t}"))
        except Exception as ex:
            flags.append(('axe_failed', str(ex)[:80]))
    return flags, info['title'][:70]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--routes', default=os.path.join(os.path.dirname(__file__), 'web_walkthrough_routes.json'))
    ap.add_argument('--service', required=True)
    ap.add_argument('--matrix', default='quick', choices=sorted(MATRICES))
    ap.add_argument('--out')
    ap.add_argument('--states', default='guest,user')
    a = ap.parse_args()
    routes = [r for r in json.load(open(a.routes))[a.service] if '{' not in r]
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    states = a.states.split(',')
    acct = signup(None) if 'user' in states else None
    rows = []
    for state in states:
        for (loc, width, scheme) in MATRICES[a.matrix]:
            ctx = browser.new_context(bypass_csp=bool(AXE_SRC), locale={'ar': 'ar-SA', 'ur': 'ur-PK', 'hi': 'hi-IN', 'bn': 'bn-BD', 'fil': 'fil-PH'}.get(loc, 'en-US'),
                                      viewport={'width': width, 'height': 844}, color_scheme=scheme)
            if state == 'user':
                ctx.new_page().goto(f'{WEB}/{loc}', wait_until='load', timeout=60000)
                r = web_login(ctx, WEB, acct['email'], acct['password'])
                if not r.ok:
                    print('login failed', r.status, r.text()[:200], flush=True)
            page = ctx.new_page()
            for route in routes:
                path = route if route.startswith('/') else '/' + route
                url = f'{WEB}/{loc}{path}'
                flags, title = check_page(page, url, loc, state)
                rows.append({'service': a.service, 'route': path, 'state': state, 'locale': loc, 'width': width, 'scheme': scheme, 'title': title, 'flags': flags})
                print(('FLAG ' if flags else 'ok   ') + f'{state:5} {loc:3} {width:4} {scheme:5} {path} ' + ' | '.join(f'{f[0]} {f[1]}'.strip() for f in flags), flush=True)
            ctx.close()
    browser.close()
    pw.stop()
    if a.out:
        json.dump(rows, open(a.out, 'w'), ensure_ascii=False, indent=1)
    n = sum(1 for r in rows if r['flags'])
    print(f'\n{a.service}: {len(rows)} page loads, {n} with findings')


if __name__ == '__main__':
    main()
