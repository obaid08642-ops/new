"""Journey (patient-web in a real browser, 390 px, Arabic/RTL): the product page of issue 1547.
  The admin publishes TEST medicines: one with three real catalogue pictures (CDN files) whose active ingredient is a
  combination, one equivalent spelled differently (other order, other case, other separator), a product with no
  equivalent but a neighbour in its category, and a product with neither.
  - The pictures: every picture of the stage is a plain link to the full picture (works before hydration); a touch
    swipe moves to the next picture (right to left: the finger moves to the right), the arrow keys move, the counter
    says "n / 3".
  - The full-screen viewer: a tap opens it over the whole screen on the inverse surface; a double tap zooms, the wheel
    zooms, a touch swipe down and Esc close it.
  - Equivalents by the normalized ingredient; "similar products" when there is none; no heading when both are empty.
  - The cart: "add to cart" in the sticky bar becomes "in cart (1)" with the link to the cart, the header badge says 1,
    the line is kept on the device and no cart request reaches the backend; the sticky bar covers nothing at 390 and 360.
  Stack: backend :8002, admin :3001, patient-web :3100.
"""
import json
import os
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
# real catalogue pictures (one production product carries these three files on the CDN)
PICTURES = ['https://cdn.nabd.plus/252418_img_1.webp', 'https://cdn.nabd.plus/252418_2.webp', 'https://cdn.nabd.plus/252418_3.webp']
ASCII = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')


def medicine(admin, name_ar, name_en, ingredient, category, strength='500 mg', price=20, images=()):
    body = {'name_ar': name_ar, 'name_en': name_en, 'active_ingredient': ingredient, 'generic_name': ingredient,
            'manufacturer': 'Nabd Test', 'brand': name_en, 'category': category, 'sub_category': '', 'form': 'tablet', 'strength': strength,
            'package_size': '20', 'barcode': '', 'price': price, 'requires_prescription': False, 'online_exclusive': False,
            'images': list(images), 'image': images[0] if images else '',
            'description_ar': 'صنف اختبار', 'description_en': 'test item', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار لصفحة المنتج'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid:
        a = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step(f'admin publishes {name_en} (TEST data)', a.ok, a)
    else:
        step(f'admin adds {name_en}', False, r)
    return mid


def main():
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    cat = f'Journey {tag}'
    lone_cat = f'Lone {tag}'
    a = medicine(admin, f'إكوِفول {tag}', f'Equivol {tag}', f'Equivol-{tag} + Caffeine', cat, images=PICTURES)
    b = medicine(admin, f'إكوِفول بلس {tag}', f'Equivol Plus {tag}', f'caffeine/EQUIVOL-{tag}', f'Other {tag}', strength='500mg', price=15)
    d = medicine(admin, f'وحيدول {tag}', f'Solol {tag}', f'Solol-{tag}', cat, price=30)
    e = medicine(admin, f'جارول {tag}', f'Nearol {tag}', f'Nearol-{tag}', cat, price=12)
    f = medicine(admin, f'منفردول {tag}', f'Alonol {tag}', f'Alonol-{tag}', lone_cat, price=9)
    if not all([a, b, d, e, f]):
        return
    anon = Client(None, 'anon')
    slug = {k: anon.get(f'/public/product-by-id/ar/{v}').get('slug') for k, v in {'a': a, 'd': d, 'f': f}.items()}
    step('the TEST medicines have public pages', all(slug.values()), slug)
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web product page', False, 'python playwright not installed')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    ctx = browser.new_context(locale='ar-SA', viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, device_scale_factor=2)
    page = ctx.new_page()
    backend_cart = []
    page.on('request', lambda req: backend_cart.append(f'{req.method} {req.url}') if '/cart' in req.url and '/api/' in req.url else None)
    cdp = ctx.new_cdp_session(page)

    def hydrated(selector):
        page.wait_for_function(
            "(s) => { const el = document.querySelector(s); return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps')); }",
            arg=selector, timeout=60000)

    def counter():
        return (page.locator('[class*="_counter_"]').first.inner_text() or '').translate(ASCII).replace(' ', '')

    def swipe(selector, dx, dy):
        box = page.locator(selector).first.bounding_box()
        cdp.send('Input.synthesizeScrollGesture', {
            'x': box['x'] + box['width'] / 2 - dx / 2, 'y': box['y'] + box['height'] / 2 - dy / 2,
            'xDistance': dx, 'yDistance': dy, 'gestureSourceType': 'touch', 'speed': 1200, 'preventFling': True})
        page.wait_for_timeout(700)

    try:
        journey('issue 1547: the pictures swipe, and each one opens in full')
        page.goto(f'{WEB}/ar/p/{slug["a"]}', wait_until='load', timeout=60000)
        links = page.locator('ul[class*="_stageTrack_"] a')
        hrefs = [links.nth(i).get_attribute('href') for i in range(links.count())]
        step('every picture of the stage is a plain link to the full picture (a tap before hydration opens it)', hrefs == PICTURES, hrefs)
        hydrated('ul[class*="_stageTrack_"] a')
        step('the counter says 1 / 3', counter() == '1/3', counter())
        swipe('ul[class*="_stageTrack_"]', 260, 0)
        left = page.locator('ul[class*="_stageTrack_"]').evaluate('(el) => el.scrollLeft')
        step('a touch swipe (finger to the right, right to left page) shows the second picture', counter() == '2/3' and left < 0, f'{counter()} scrollLeft={left}')
        page.locator('ul[class*="_stageTrack_"]').focus()
        page.keyboard.press('ArrowLeft')
        page.wait_for_timeout(700)
        step('the arrow key (mirrored) moves to the third picture', counter() == '3/3', counter())
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(700)
        step('and back to the second', counter() == '2/3', counter())

        journey('issue 1547: the full-screen viewer')
        page.locator('ul[class*="_stageTrack_"] li').nth(1).locator('a').click()
        dialog = page.locator('dialog[class*="_viewer_"]')
        dialog.wait_for(state='visible', timeout=10000)
        box = dialog.bounding_box()
        step('it covers the whole screen', box and abs(box['width'] - 390) < 1 and abs(box['height'] - 844) < 1, box)
        colours = dialog.evaluate("(el) => { const probe = document.createElement('div'); probe.style.background = 'var(--nabd-color-bg-inverse)'; document.body.append(probe); const want = getComputedStyle(probe).backgroundColor; probe.remove(); return [getComputedStyle(el).backgroundColor, want]; }")
        step('on the inverse (ink) token, not a raw colour', colours[0] == colours[1], colours)
        shown = (page.locator('[class*="_viewerCounter_"]').inner_text() or '').translate(ASCII).replace(' ', '')
        step('it opens on the picture that was tapped (2 / 3)', shown == '2/3', shown)
        slide = page.locator('[class*="_viewerSlide_"]').nth(1)
        sbox = slide.bounding_box()
        page.touchscreen.tap(sbox['x'] + sbox['width'] / 2 + 40, sbox['y'] + sbox['height'] / 2)
        page.wait_for_timeout(80)
        page.touchscreen.tap(sbox['x'] + sbox['width'] / 2 + 40, sbox['y'] + sbox['height'] / 2)
        page.wait_for_timeout(400)
        transform = slide.locator('img').evaluate('(el) => el.style.transform')
        step('a double tap zooms in at the tapped point', 'scale(2.5)' in transform and slide.get_attribute('data-zoomed') == 'true', transform)
        step('while zoomed the strip does not scroll away (pan instead)', page.locator('[class*="_viewerTrack_"]').get_attribute('data-locked') == 'true')
        page.touchscreen.tap(sbox['x'] + sbox['width'] / 2, sbox['y'] + sbox['height'] / 2)
        page.wait_for_timeout(80)
        page.touchscreen.tap(sbox['x'] + sbox['width'] / 2, sbox['y'] + sbox['height'] / 2)
        page.wait_for_timeout(400)
        step('a second double tap zooms back out', slide.get_attribute('data-zoomed') == 'false', slide.locator('img').evaluate('(el) => el.style.transform'))
        page.mouse.move(sbox['x'] + sbox['width'] / 2, sbox['y'] + sbox['height'] / 2)
        page.mouse.wheel(0, -300)
        page.wait_for_timeout(300)
        transform = slide.locator('img').evaluate('(el) => el.style.transform')
        step('the wheel zooms too (a desktop)', 'scale(' in transform and slide.get_attribute('data-zoomed') == 'true', transform)
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        step('Esc closes the viewer', not dialog.is_visible())
        page.locator('ul[class*="_stageTrack_"] li').nth(1).locator('a').click()
        dialog.wait_for(state='visible', timeout=10000)
        step('a picture zoomed before closing opens at full view again', page.locator('[class*="_viewerSlide_"][data-zoomed="true"]').count() == 0)
        swipe('[class*="_viewerSlide_"] >> nth=1', 0, 220)
        step('a touch swipe down closes the viewer', not dialog.is_visible())

        journey('issue 1547: equivalents by the normalized active ingredient')
        eq = page.locator('section[data-testid="product-equivalents"]')
        step('the equivalent spelled differently ("caffeine/EQUIVOL" for "Equivol + Caffeine") is listed', eq.count() == 1 and f'إكوِفول بلس {tag}' in eq.inner_text(), eq.inner_text()[:200] if eq.count() else 'no section')
        step('no "similar products" when there are equivalents', page.locator('section[data-testid="product-similar"]').count() == 0)

        journey('issue 1547: the cart button follows the cart (local-first)')
        bar = page.locator('.nabd-sticky-footer')
        bar.get_by_role('button', name='أضف للسلة').click()
        link = bar.locator('a[href="/ar/cart"]')
        link.wait_for(timeout=10000)
        text = (link.inner_text() or '').translate(ASCII)
        step('"add to cart" became "in cart (1)" with the way to the cart', '(1)' in text, text)
        step('the card button changed with it (no second add)', page.get_by_role('button', name='أضف للسلة').count() == 0)
        badge = page.locator('a[class*="_cartLink_"]:visible [class*="_cartBadge_"]')
        step('the header cart badge says 1 at once', badge.count() == 1 and (badge.inner_text() or '').translate(ASCII) == '1', badge.count())
        stored = page.evaluate("() => Object.entries(localStorage).filter(([k]) => k.startsWith('nabd_cart')).map(([k, v]) => [k, v])")
        step('the line is kept on the device', any(a in v for _, v in stored), json.dumps(stored)[:300])
        step('and no cart request reached the backend', backend_cart == [], backend_cart)
        page.locator('button[aria-label*="زيادة"], button[aria-label*="Increase"]').first.click()
        page.wait_for_timeout(300)
        text = (bar.locator('a[href="/ar/cart"]').inner_text() or '').translate(ASCII)
        step('the stepper edits the cart line (in cart (2))', '(2)' in text and (badge.inner_text() or '').translate(ASCII) == '2', text)

        for width in (390, 360):
            page.set_viewport_size({'width': width, 'height': 780})
            page.wait_for_timeout(300)
            page.evaluate('() => window.scrollTo(0, document.documentElement.scrollHeight)')
            page.wait_for_timeout(500)
            geo = page.evaluate("""() => {
              const bar = document.querySelector('.nabd-shell__bottom').getBoundingClientRect();
              const main = document.querySelector('.nabd-shell__main');
              const last = [...main.querySelectorAll('*')].filter((el) => el.getClientRects().length).map((el) => el.getBoundingClientRect().bottom);
              return { barTop: bar.top, contentBottom: Math.max(...last), overflow: document.documentElement.scrollWidth - window.innerWidth };
            }""")
            step(f'at {width} px the sticky bar covers no content and nothing scrolls sideways', geo['contentBottom'] <= geo['barTop'] + 1 and geo['overflow'] <= 0, geo)
        page.set_viewport_size({'width': 390, 'height': 844})

        journey('issue 1547: similar products when there is no equivalent, nothing when both are empty')
        page.goto(f'{WEB}/ar/p/{slug["d"]}', wait_until='load', timeout=60000)
        sim = page.locator('section[data-testid="product-similar"]')
        step('a product without equivalents shows "similar products" of its category', sim.count() == 1 and f'جارول {tag}' in sim.inner_text(), sim.inner_text()[:200] if sim.count() else 'no section')
        step('and no equivalents heading', page.locator('section[data-testid="product-equivalents"]').count() == 0)
        page.goto(f'{WEB}/ar/p/{slug["f"]}', wait_until='load', timeout=60000)
        page.locator('h1').first.wait_for(timeout=30000)
        step('a product with neither has no section and no heading', page.locator('section[data-testid="product-similar"], section[data-testid="product-equivalents"]').count() == 0
             and page.get_by_role('heading', name='منتجات مشابهة').count() == 0)
    except Exception as ex:
        step('web product page flow', False, str(ex)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
