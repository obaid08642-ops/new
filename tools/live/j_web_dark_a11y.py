"""Journey (patient-web in a real browser, not signed in): dark mode and accessibility basics (scenario catalogue PT-33 and PT-40).

PT-33 dark mode: with the phone/OS on dark and no stored choice the page is dark (data-theme="dark" and a dark background); a stored
choice (localStorage "nabd.theme") wins over the OS in both directions and survives a reload.
PT-40 accessibility basics, on each public page in Arabic and English: the html element carries the page language and direction; there
is one <main> and one <h1>; every image has an alt attribute; every form field, button and link has an accessible name; the first Tab
reaches the skip link, and a focused control shows a focus ring. Contrast is the "runtime contrast" CI job's (both themes), not repeated here.
Stack: backend :8002, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os

from lib import journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
PAGES = ['', '/consultations/doctors', '/diagnostics', '/pharmacy', '/login']
DARK_BG = """() => {
  const m = getComputedStyle(document.body).backgroundColor.match(/[\\d.]+/g).map(Number);
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return { theme: document.documentElement.dataset.theme || '', luminance: 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]) };
}"""
STRUCTURE = """() => {
  const name = (e) => (e.getAttribute('aria-label') || '').trim() || (e.getAttribute('aria-labelledby') ? 'x' : '') || (e.getAttribute('title') || '').trim() || (e.getAttribute('placeholder') || '').trim()
    || (e.labels && e.labels.length ? 'x' : '') || (e.innerText || e.textContent || '').trim() || (e.querySelector('img[alt]:not([alt=""]), svg[aria-label], [role=img][aria-label]') ? 'x' : '');
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const unnamed = (sel, skip) => [...document.querySelectorAll(sel)].filter((e) => visible(e) && !(skip && skip(e)) && !name(e)).map((e) => e.outerHTML.slice(0, 110));
  return {
    lang: document.documentElement.lang, dir: document.documentElement.dir,
    mains: document.querySelectorAll('main').length, h1: [...document.querySelectorAll('h1')].filter(visible).length,
    noAlt: [...document.querySelectorAll('img')].filter((e) => !e.hasAttribute('alt')).map((e) => e.outerHTML.slice(0, 110)),
    fields: unnamed('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'),
    buttons: unnamed('button, [role=button]'),
    links: unnamed('a[href]'),
  };
}"""
FOCUS = """() => { const e = document.activeElement; if (!e || e === document.body || /^nextjs-portal$/i.test(e.tagName)) return null; const s = getComputedStyle(e);
  return { text: (e.textContent || '').trim().slice(0, 40), ring: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none') }; }"""


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web dark mode and accessibility', False, 'python playwright not installed')
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    except Exception as e:
        return step('web dark mode and accessibility', False, f'no chromium: {e}')
    try:
        journey('web dark mode (PT-33)')
        for os_scheme, stored, want in (('dark', None, 'dark'), ('light', 'dark', 'dark'), ('dark', 'light', 'light')):
            ctx = browser.new_context(locale='en-US', viewport={'width': 390, 'height': 844}, color_scheme=os_scheme)
            if stored:
                ctx.add_init_script(f"try {{ localStorage.setItem('nabd.theme', '{stored}'); }} catch (e) {{}}")
            page = ctx.new_page()
            page.goto(f'{WEB}/en', wait_until='load', timeout=60000)
            page.wait_for_timeout(800)
            got = page.evaluate(DARK_BG)
            is_dark = got['theme'] == 'dark' and got['luminance'] < 0.2
            is_light = got['theme'] != 'dark' and got['luminance'] > 0.5
            label = f'OS {os_scheme}, stored {stored or "none"}: the page is {want}'
            step(label, is_dark if want == 'dark' else is_light, got)
            if stored:
                page.reload(wait_until='load')
                page.wait_for_timeout(500)
                again = page.evaluate(DARK_BG)
                step(f'the {want} choice survives a reload', (again['theme'] == 'dark') == (want == 'dark'), again)
            ctx.close()

        for loc in ('ar', 'en'):
            journey(f'web accessibility basics (PT-40, {loc})')
            ctx = browser.new_context(locale='ar-SA' if loc == 'ar' else 'en-US', viewport={'width': 390, 'height': 844})
            page = ctx.new_page()
            for path in PAGES:
                page.goto(f'{WEB}/{loc}{path}', wait_until='load', timeout=60000)
                page.wait_for_timeout(1000)
                got = page.evaluate(STRUCTURE)
                at = f'/{loc}{path}'
                step(f'{at}: html lang and direction match the page', got['lang'].startswith(loc) and got['dir'] == ('rtl' if loc == 'ar' else 'ltr'), {k: got[k] for k in ('lang', 'dir')})
                step(f'{at}: one main landmark and one visible h1', got['mains'] == 1 and got['h1'] == 1, {k: got[k] for k in ('mains', 'h1')})
                step(f'{at}: every image has an alt attribute', not got['noAlt'], got['noAlt'][:2])
                step(f'{at}: every form field has a name', not got['fields'], got['fields'][:2])
                step(f'{at}: every button has a name', not got['buttons'], got['buttons'][:2])
                step(f'{at}: every link has a name', not got['links'], got['links'][:2])
                page.evaluate('() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); }')
                page.keyboard.press('Tab')
                first = page.evaluate(FOCUS)
                if first is None:  # the first Tab went to the dev overlay, not the page
                    page.keyboard.press('Tab')
                    first = page.evaluate(FOCUS)
                step(f'{at}: the first Tab lands on a control with a visible focus ring', bool(first and first['ring']), first)
            ctx.close()
    except Exception as e:
        step('web dark mode and accessibility flow', False, str(e)[:300])
    browser.close()
    pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
