"""Journey (patient-web in a real browser, signed out): instant search suggestions while typing (plan 17.3, issue 1544).
  The admin adds and approves two catalogue medicines (بروف… and بروفينال…) and adds a third it does not approve (still in
  medical review). On /ar the Home search field asks GET /api/search/suggest (patient-web's proxy of the public
  GET /search/suggest) from the first Arabic letter: "بر" lists both approved medicines, "بروف" narrows the list, the
  <mark> wraps "بروف", ArrowDown + Enter opens the medicine's page and Esc closes the dropdown. The unapproved medicine
  is never suggested. With the "search suggestions" kill switch off the server answers `disabled: true` and no dropdown
  appears; the journey turns it back on.
  Which search path this exercises: GET /search/suggest always answers from the MongoDB `search_index` collection
  (search.service.ts suggest(); Meilisearch serves only GET /search), kept in sync from the medicines collection by the
  change stream of the local replica set. No Meilisearch runs here, and none is needed for this endpoint.
  Stack: backend :8002, patient-web :3100, admin :3001.
"""
import os
import time
import urllib.parse
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
OWNER_EMAIL = os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test')
OWNER_PASSWORD = os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass')
FLAG = 'search_suggestions_enabled'


def catalogue_medicine(admin, name_ar, name_en, approve):
    """admin/src/pages/admin/medicines-catalog.tsx saveForm (create), then approve (published) when asked."""
    tag = uuid.uuid4().hex[:6]
    body = {'name_ar': name_ar, 'name_en': name_en, 'active_ingredient': f'ibuprofen-{tag}', 'generic_name': f'ibuprofen-{tag}',
            'manufacturer': 'Nabd Test', 'brand': 'Bruf', 'category': 'pain_relief', 'sub_category': '', 'form': 'tablet', 'strength': '600mg',
            'package_size': '20', 'barcode': '', 'price': 12, 'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'مسكن للألم', 'description_en': 'pain relief', 'usage_instructions_ar': 'بعد الأكل', 'usage_instructions_en': 'after food',
            'indications_ar': ['تسكين الألم'], 'indications_en': ['Pain relief'], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step(f'admin adds the catalogue medicine {name_ar}', r.ok and mid, r)
    if mid and approve:
        r = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step(f'admin publishes {name_ar}', r.ok, r)
    return mid


def suggest(anon, q, locale='ar'):
    return anon.get(f'/search/suggest?q={urllib.parse.quote(q)}&locale={locale}')


def names_of(r):
    rows = r.body.get('suggestions') if isinstance(r.body, dict) else None
    return [x.get('name') for x in rows or [] if isinstance(x, dict)]


def set_flag(owner, enabled, reason):
    return owner.post('/admin/admin/governance-controls/feature-flags', {'key': FLAG, 'enabled': enabled, 'reason': reason})


def main():
    import j_admin
    admin, _ = j_admin.login()
    anon = Client()
    tag = uuid.uuid4().hex[:4]
    bruf, brufinal, pending = f'بروف 600 {tag}', f'بروفينال 400 {tag}', f'بروفيكس {tag}'

    journey('issue 1544: the catalogue the suggestions come from')
    bruf_id = catalogue_medicine(admin, bruf, f'Bruf 600 {tag}', approve=True)
    brufinal_id = catalogue_medicine(admin, brufinal, f'Brufinal 400 {tag}', approve=True)
    catalogue_medicine(admin, pending, f'Brufix {tag}', approve=False)
    # the search index follows the medicines collection (change stream); wait until both published names are in it
    seen = []
    for _ in range(60):
        seen = names_of(suggest(anon, f'بروف'))
        if bruf in seen and brufinal in seen:
            break
        time.sleep(1)
    step('GET /search/suggest?q=بروف lists both published medicines (MongoDB search_index)', bruf in seen and brufinal in seen, seen)
    step('the medicine still in medical review is never suggested', pending not in seen and pending not in names_of(suggest(anon, 'بروفيك')), seen)
    r = suggest(anon, 'ب')
    step('one Arabic letter is enough for the server', r.ok and len(names_of(r)) > 0, r)
    r = suggest(anon, 'b', 'en')
    step('one Latin letter is not (two letters in other scripts)', r.ok and names_of(r) == [], r)
    if not (bruf_id and brufinal_id):
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web search suggestions', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    asked = []
    page.on('request', lambda req: asked.append(urllib.parse.unquote(req.url)) if '/api/search/suggest' in req.url else None)

    def field(path='/ar', selector='form[role="search"] input[name="q"]'):
        page.goto(f'{WEB}{path}', wait_until='load', timeout=60000)
        # the settled page: while React streams it, a field can briefly be in the document twice
        page.wait_for_function(f"document.querySelectorAll('{selector}').length === 1", timeout=30000)
        box = page.locator(selector)
        box.click()
        return box

    def listbox(box):
        return page.locator(f'[id="{box.get_attribute("aria-controls")}"]')

    def options(box):
        return [o.inner_text().strip() for o in listbox(box).locator('[role="option"]').all()]

    def wait_options(box, want, timeout=15):
        end = time.time() + timeout
        got = []
        while time.time() < end:
            got = options(box) if box.get_attribute('aria-expanded') == 'true' else []
            if want(got):
                return got
            time.sleep(0.25)
        return got

    has = lambda texts, name: any(t.startswith(name) for t in texts)
    try:
        journey('issue 1544 on the web: the Home search suggests while the patient types')
        box = field()
        step('the Home search field is an ARIA combobox (role, aria-controls, aria-autocomplete=list)',
             box.get_attribute('role') == 'combobox' and box.get_attribute('aria-controls') and box.get_attribute('aria-autocomplete') == 'list',
             page.locator('form[role="search"]').inner_html()[:300])
        box.press_sequentially('بر', delay=60)
        two = wait_options(box, lambda got: has(got, bruf) and has(got, brufinal))
        step('typing "بر" opens the dropdown listing بروف… and بروفينال…', has(two, bruf) and has(two, brufinal), two)
        step('the request went through the patient-web proxy with the page language', any(u.endswith('q=بر&locale=ar') for u in asked), asked[-3:])

        box.press_sequentially('وف', delay=60)
        four = wait_options(box, lambda got: has(got, bruf) and has(got, brufinal) and all('بروف' in t for t in got))
        step('typing "بروف" narrows the list (every suggestion has a word starting with بروف)',
             has(four, bruf) and has(four, brufinal) and all('بروف' in t for t in four) and len(four) <= len(two), {'بر': two, 'بروف': four})
        marks = [m.inner_text() for m in listbox(box).locator('[role="option"] mark').all()]
        step('the <mark> wraps "بروف" in each suggestion', marks and all(m == 'بروف' for m in marks) and len(marks) == len(four), marks)
        step('no unapproved medicine in the dropdown', not has(four, pending), four)

        journey('issue 1544 on the web: keyboard')
        target = next((i for i, t in enumerate(four) if t.startswith(brufinal)), -1)
        for _ in range(target + 1):
            box.press('ArrowDown')
        active = box.get_attribute('aria-activedescendant')
        chosen = page.locator(f'[id="{active}"]') if active else None
        step('ArrowDown moves the active option (aria-activedescendant, aria-selected)',
             chosen is not None and chosen.get_attribute('aria-selected') == 'true' and chosen.inner_text().startswith(brufinal), active)
        href = chosen.get_attribute('href') if chosen else ''
        box.press('Enter')
        try:
            page.wait_for_url(lambda u: '/ar/p/' in u or '/ar/medicines/' in u, timeout=30000)
            page.wait_for_selector('h1', timeout=30000)
        except Exception as e:  # noqa: BLE001 - reported as the step's detail
            href = f'{href} ({str(e)[:120]})'
        heading = page.locator('h1').first.inner_text() if page.locator('h1').count() else ''
        step('Enter opens the medicine page of the highlighted suggestion', ('/ar/p/' in page.url or '/ar/medicines/' in page.url) and brufinal in heading,
             f'url={page.url} h1={heading[:80]} href={href}')

        box = field()
        box.press_sequentially('بروف', delay=60)
        wait_options(box, lambda got: has(got, bruf))
        box.press('Escape')
        page.wait_for_timeout(300)
        step('Esc closes the dropdown (aria-expanded=false, list hidden)',
             box.get_attribute('aria-expanded') == 'false' and not listbox(box).is_visible() and box.input_value() == 'بروف',
             f"expanded={box.get_attribute('aria-expanded')} value={box.input_value()}")
        box.press('Enter')
        page.wait_for_url(lambda u: '/ar/search' in u, timeout=30000)
        step('Enter with no highlighted suggestion opens the full results page', '/ar/search?q=' in page.url, page.url)

        journey('issue 1544 on the web: the search page and another language')
        box = field('/ar/search', 'input[role="combobox"]')
        box.press_sequentially('بروف', delay=60)
        got = wait_options(box, lambda got: has(got, bruf) and has(got, brufinal))
        step('the search page field suggests too', has(got, bruf) and has(got, brufinal), got)
        box = field('/en')
        n = len(asked)
        box.press_sequentially('B', delay=60)
        page.wait_for_timeout(600)
        step('in English one letter asks nothing', len(asked) == n, asked[n:])
        box.press_sequentially(f'ru', delay=60)
        got = wait_options(box, lambda got: has(got, f'Bruf 600 {tag}'))
        marks = [m.inner_text() for m in listbox(box).locator('[role="option"] mark').all()]
        step('from two letters the English names are suggested, the match marked', has(got, f'Bruf 600 {tag}') and marks and all(m.lower() == 'bru' for m in marks), {'options': got, 'marks': marks})

        journey('issue 1544: the search suggestions kill switch')
        owner, _ = j_admin.login(OWNER_EMAIL, OWNER_PASSWORD)
        r = set_flag(owner, False, 'live gate: suggestions kill switch drill')
        step('the owner turns search suggestions off', r.ok, r)
        try:
            r = suggest(anon, 'بروف')
            step('the server answers no suggestions and disabled: true', r.ok and r.get('disabled') is True and names_of(r) == [], r)
            box = field()
            n = len(asked)
            box.press_sequentially('بروف', delay=60)
            page.wait_for_timeout(1500)
            step('no dropdown appears while it is off', len(asked) > n and box.get_attribute('aria-expanded') == 'false' and not listbox(box).is_visible(),
                 f"asked={asked[n:]} expanded={box.get_attribute('aria-expanded')}")
        finally:
            r = set_flag(owner, True, 'live gate: suggestions back on')
            step('the owner turns search suggestions back on', r.ok, r)
        step('suggestions answer again', bruf in names_of(suggest(anon, 'بروف')), '')
    except Exception as e:  # noqa: BLE001 - reported as a failed step
        step('web search suggestions flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
