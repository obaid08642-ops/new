"""Journey (API + script + patient-web, real browser): owner decision D (issue 1556) — one product with a picker.
  - The admin publishes four lens records of one product (TEST data): Hazel -1.00 / -2.50 / +1.25 and Brown -1.00, each
    with its own price, and an unrelated product.
  - The grouping script's dry-run reports the group and writes nothing; --apply sets variant_group/variant on the four;
    a second --apply changes nothing (idempotent). Nothing is deleted.
  - GET /public/product-variants/:locale/:id lists the four with their own SKU, price and attribute; the unrelated
    product has no variants.
  - The product page draws the picker; choosing -2.50 puts ?v=<id> in the URL and shows that variant's price; add to cart
    stores that variant's record; opening the shared URL (?v=) comes back with -2.50 chosen.
  Stack: backend :8002 (DB_NAME = the TEST database), patient-web :3100, local Mongo (the script runs on the TEST database only).
"""
import json
import os
import subprocess
import uuid

from lib import Client, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')
BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'backend')
SCRIPT = 'scripts/migrations/2026-10-catalogue-variant-groups.ts'


# The product page sometimes holds a second, hidden copy of the picker for a moment (CI runs 39769485707 and the #1774
# and #1771 runs: strict mode found 2; local runs and 250 ms sampling found 1). The user sees the visible one, so the
# journey waits for that, then requires exactly ONE visible picker (a real visible duplicate still fails), and prints
# where any hidden copy sits so the cause can be traced.
VISIBLE_PICKER = '[data-testid="variant-picker"]:visible'


def picker_copies(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('[data-testid="variant-picker"]')].map((el) => {
      const hidden = el.closest('[hidden], [style*="display: none"], [aria-hidden="true"]');
      return { visible: el.getClientRects().length > 0, hidden_by: hidden ? hidden.outerHTML.slice(0, 120) : null };
    })""")


def one_visible_picker(pg, label):
    pg.locator(VISIBLE_PICKER).first.wait_for(timeout=30000)
    pg.wait_for_timeout(500)
    copies = picker_copies(pg)
    if len(copies) > 1:
        print(f'  NOTE {label}: {len(copies)} picker elements in the DOM: {json.dumps(copies)[:400]}')
    step(f'{label}: exactly one visible picker', sum(1 for c in copies if c['visible']) == 1, copies)


def grouping(*args):
    """Runs the grouping script on the TEST database (start-backend.sh's DB_NAME); returns its last JSON line."""
    env = {**os.environ, 'DB_NAME': os.environ.get('DB_NAME') or 'nabd_live',
           'MONGO_URL': os.environ.get('MONGO_URL') or 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', 'NODE_ENV': 'development'}
    out = subprocess.run(['npx', 'ts-node', '--transpile-only', SCRIPT, *args], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=300)
    lines = [l for l in out.stdout.strip().splitlines() if l.startswith('{')]
    try:
        return json.loads(lines[-1]) if lines else {'error': (out.stderr or out.stdout)[-300:]}
    except ValueError:
        return {'error': lines[-1][:300]}


def medicine(admin, name_en, name_ar, maker, price):
    body = {'name_ar': name_ar, 'name_en': name_en, 'active_ingredient': 'contact lens', 'generic_name': 'contact lens', 'manufacturer': maker, 'brand': maker,
            'category': 'vitamins', 'sub_category': '', 'form': 'lens', 'strength': '', 'package_size': '2', 'barcode': '', 'price': price,
            'requires_prescription': False, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار للخيارات'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid:
        admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
    step(f'admin publishes {name_en} (TEST data)', r.ok and mid, r)
    return mid


def main():
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    maker = f'Nabd Test Lens {tag}'
    ids = {
        'h-1.00': medicine(admin, f'Vartest{tag} Monthly Lenses Hazel -1.00', f'عدسات فارتست {tag} عسلي -1.00', maker, 51),
        'h-2.50': medicine(admin, f'Vartest{tag} Monthly Lenses Hazel -2.50', f'عدسات فارتست {tag} عسلي -2.50', maker, 57.5),
        'h+1.25': medicine(admin, f'Vartest{tag} Monthly Lenses Hazel +1.25', f'عدسات فارتست {tag} عسلي +1.25', maker, 53),
        'b-1.00': medicine(admin, f'Vartest{tag} Monthly Lenses Brown -1.00', f'عدسات فارتست {tag} بني -1.00', maker, 52),
    }
    solo = medicine(admin, f'Vartest{tag} Eye Drops 10 ml', f'قطرة فارتست {tag}', maker, 20)
    if not all(ids.values()) or not solo:
        return

    journey('decision D: the grouping script (dry-run first, then apply, idempotent)')
    report = f'/tmp/variant-groups-{tag}.json'
    dry = grouping('--report', report)
    step('the dry-run reports groups and writes nothing', dry.get('mode') == 'dry-run' and dry.get('would_set', 0) >= 4, dry)
    try:
        rep = json.load(open(report))
        mine = [g for g in rep.get('groups', []) if g.get('manufacturer') == maker.lower()]
        members = {m['id']: m for g in mine for m in g['members']}
        step('the report has one colour-and-power group with the four lenses (not the drops)',
             len(mine) == 1 and mine[0]['kind'] == 'colour_power' and set(members) == set(ids.values()), mine)
    except (OSError, ValueError) as e:
        step('the report was written', False, str(e))
    finally:
        if os.path.exists(report):
            os.remove(report)
    anon = Client(None, 'anon')
    before = anon.get(f'/public/product-variants/en/{ids["h-1.00"]}')
    step('before --apply the product has no variants', before.ok and not before.get('variants'), before)
    first = grouping('--apply')
    step('--apply sets the group on the records', first.get('mode') == 'apply' and first.get('updated', 0) >= 4, first)
    again = grouping('--apply')
    step('a second --apply changes nothing (idempotent)', again.get('mode') == 'apply' and again.get('updated') == 0 and again.get('cleared') == 0, again)

    journey('decision D: the variants API')
    res = anon.get(f'/public/product-variants/en/{ids["h-1.00"]}')
    vs = res.get('variants') or []
    order = [v.get('id') for v in vs]
    step('four variants, colour then power (Brown -1.00; Hazel -1.00, -2.50, +1.25)',
         order == [ids['b-1.00'], ids['h-1.00'], ids['h-2.50'], ids['h+1.25']], [(v.get('variant'), v.get('price')) for v in vs])
    h250 = next((v for v in vs if v.get('id') == ids['h-2.50']), {})
    step('each variant is its own record (id, SKU field, price, attribute); admin-added TEST records have no SKU number',
         h250.get('price') == 57.5 and h250.get('variant', {}).get('power') == -2.5 and h250.get('variant', {}).get('colour') == 'hazel'
         and len({v.get('id') for v in vs}) == 4 and 'sku' in h250, h250)
    none = anon.get(f'/public/product-variants/en/{solo}')
    step('the drops (no group) have no variants, and every record still exists', none.ok and none.get('variants') == []
         and all(anon.get(f'/public/product-by-id/en/{i}').ok for i in ids.values()), none)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return step('web', False, 'python playwright not installed')
    slug = anon.get(f'/public/product-by-id/en/{ids["h-1.00"]}').get('slug')
    pw = sync_playwright().start()
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM') or None)
    try:
        journey('decision D: the product page picker (web)')
        page = browser.new_context(locale='en-US', viewport={'width': 1280, 'height': 900}).new_page()
        page.goto(f'{WEB}/en/p/{slug}', wait_until='load', timeout=60000)
        one_visible_picker(page, 'desktop 1280')
        step('the picker shows the colours and the chosen colour\'s powers', page.get_by_role('radio', name='Brown').count() == 1
             and page.get_by_role('radio', name='-1.00').count() == 1 and page.get_by_role('radio', name='-2.50').count() == 1)
        page.wait_for_timeout(1500)  # hydration
        page.get_by_role('radio', name='-2.50').click()
        page.wait_for_function(f'() => location.search.includes("v={ids["h-2.50"]}")', timeout=15000)
        step('choosing -2.50 puts ?v=<its id> in the URL', f'v={ids["h-2.50"]}' in page.url, page.url)
        price_text = page.locator('[data-testid="variant-price"]:visible').first.inner_text()
        step("the price is that variant's own (57.50)", '57.50' in price_text, price_text)
        page.get_by_role('button', name='Add to cart').first.click()
        page.wait_for_timeout(800)
        cart = page.evaluate('() => Object.keys(localStorage).filter((k) => k.startsWith("nabd_cart_v2:") && k !== "nabd_cart_v2:owner").map((k) => localStorage.getItem(k)).join("\\n")')
        step('add to cart stores the -2.50 record (its id is the SKU the order sends)', ids['h-2.50'] in cart and ids['h-1.00'] not in cart, cart[:300])
        shared = page.url
        page2 = browser.new_context(locale='en-US', viewport={'width': 390, 'height': 844}).new_page()
        page2.goto(shared, wait_until='load', timeout=60000)
        one_visible_picker(page2, 'shared URL at 390')
        page2.wait_for_function('() => [...document.querySelectorAll(\'[role="radio"][aria-label="-2.50"]\')].some((el) => el.getClientRects().length && el.getAttribute("aria-checked") === "true")', timeout=15000)
        step('the shared URL opens with -2.50 chosen', True)
    except Exception as e:
        step('web flow', False, str(e)[:300])
    finally:
        browser.close()
        pw.stop()


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
