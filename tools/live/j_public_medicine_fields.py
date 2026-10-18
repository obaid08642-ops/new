"""Journey (backend, anonymous): public medicine and catalogue routes return public fields of published items only (issue 1555).
  - The admin creates and approves two medicines with the same active ingredient and a barcode, one of them prescription
    only, and creates a third one that is never approved (TEST data).
  - Each public route is fetched anonymously (alternatives, detail, details, list, autocomplete, by-barcode,
    lookup-barcode, compare, hot, stream, recommendations, SEO resolve, global search, entity graph); no internal field
    (provenance, source*, review state, eligibility flags, stock counts, audit fields, _id, __v...) appears at any depth.
  - Alternatives answer with the public product card (as /public/products/search), with no old price on the
    prescription item.
  - The unapproved medicine is not returned by any of them.
  Stack: backend :8002.
"""
import re
import uuid

from lib import Client, journey, step

FORBIDDEN = {
    '_id', '__v', 'provenance', 'source', 'source_product_id', 'pending_revision', 'review_reason', 'created_by',
    'created_by_user_id', 'created_by_role', 'updated_by', 'deleted_at', 'is_deleted', 'aggregate_stock', 'pharmacies_count',
    'medical_review_status', 'public_eligibility', 'indexing_eligibility', 'approved_by', 'approved_at', 'rejected_reason',
    'change_requests', 'translation_conflict', 'usage_count', 'verified', 'version', 'search_text',
}
# Public by owner decision (2026-10-16): the date of the last medical review is a trust signal.
ALLOWED = {'last_reviewed'}
PATTERNS = [re.compile(p, re.I) for p in (r'review', r'^provenance', r'^source', r'^created_by', r'^updated_by', r'password|secret')]


def leaked(value, path='$'):
    out = []
    if isinstance(value, list):
        for i, v in enumerate(value):
            out += leaked(v, f'{path}[{i}]')
    elif isinstance(value, dict):
        for k, v in value.items():
            if k not in ALLOWED and (k in FORBIDDEN or any(p.search(k) for p in PATTERNS)):
                out.append(f'{path}.{k}')
            out += leaked(v, f'{path}.{k}')
    return out


def ids_in(value):
    """Every `id` value at any depth (a medicine row, a card, a list or an envelope)."""
    found = set()
    if isinstance(value, list):
        for v in value:
            found |= ids_in(v)
    elif isinstance(value, dict):
        if isinstance(value.get('id'), str):
            found.add(value['id'])
        for v in value.values():
            found |= ids_in(v)
    return found


def create(admin, tag, suffix, barcode, rx, approve):
    body = {'name_ar': f'فيلدول {tag} {suffix}', 'name_en': f'Fieldol {tag} {suffix}', 'active_ingredient': f'fieldol-{tag}',
            'generic_name': f'fieldol-{tag}', 'manufacturer': 'Nabd Test', 'brand': f'Fieldol {tag}', 'category': 'vitamins',
            'sub_category': '', 'form': 'tablet', 'strength': suffix, 'package_size': '20', 'barcode': barcode, 'price': 20,
            'requires_prescription': rx, 'online_exclusive': False, 'images': [], 'image': '',
            'description_ar': 'اختبار', 'description_en': 'test', 'usage_instructions_ar': '', 'usage_instructions_en': '',
            'indications_ar': [], 'indications_en': [], 'contraindications_ar': [], 'contraindications_en': [],
            'warnings_ar': [], 'warnings_en': [], 'side_effects_ar': [], 'side_effects_en': [], 'precautions_ar': [], 'precautions_en': [],
            'reason': 'صنف اختبار لحقول المسار العام'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    if mid and approve:
        a = admin.post(f'/medicines/admin/catalog/{mid}/approve', {'approve': True})
        step(f'admin approves Fieldol {suffix}', a.ok, a)
    step(f'admin creates Fieldol {suffix}' + ('' if approve else ' (left unapproved)'), r.ok and mid, r)
    return mid


def check(name, r, payload=None, hidden=None):
    body = r.body if payload is None else payload
    step(f'{name}: answers anonymously', r.ok, r)
    bad = leaked(body)
    step(f'{name}: no internal field in the answer', not bad, bad[:12])
    if hidden:
        step(f'{name}: the unapproved medicine is not returned', hidden not in ids_in(body), sorted(ids_in(body))[:10])


def main():
    import j_admin
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    base = str(6290000000000 + int(tag, 16) % 1000000)
    a = create(admin, tag, '500mg', base + '1', False, True)
    b = create(admin, tag, '250mg', base + '2', True, True)
    u = create(admin, tag, '100mg', base + '3', False, False)
    if not (a and b and u):
        return
    anon = Client(None, 'anon')

    journey('issue 1555: alternatives answer with the public product card')
    r = anon.get(f'/medicines/{a}/alternatives?locale=en')
    check('alternatives', r, hidden=u)
    cards = r.body if isinstance(r.body, list) else []
    rx_card = next((c for c in cards if c.get('id') == b), None)
    step('alternatives: the approved alternative is listed', rx_card is not None, cards)
    step('alternatives: card fields of /public/products/search (name, slug, url, is_rx)',
         rx_card is not None and {'name', 'slug', 'url', 'is_rx', 'price', 'currency'} <= set(rx_card), rx_card)
    step('alternatives: no old price on the prescription item', rx_card is not None and rx_card.get('is_rx') is True and rx_card.get('old_price') is None, rx_card)

    journey('issue 1555: every public medicine route returns public fields only')
    check('detail', anon.get(f'/medicines/{a}'))
    d = anon.get(f'/medicines/{a}/details')
    check('details', d, hidden=u)
    check('list (search)', anon.get(f'/medicines?search=Fieldol%20{tag}'), hidden=u)
    check('list (page)', anon.get(f'/medicines?search=Fieldol%20{tag}&page=1'), hidden=u)
    check('list (ordered)', anon.get(f'/medicines?search=Fieldol%20{tag}&sort=price_asc'), hidden=u)
    check('autocomplete', anon.get(f'/medicines/autocomplete?q=Fieldol%20{tag}'), hidden=u)
    bc = anon.get(f'/medicines/by-barcode/{base}1')
    check('by-barcode', bc, payload=bc.get('medicine'))
    step('by-barcode: finds the approved medicine', bc.get('medicine', 'id') == a, bc)
    ub = anon.get(f'/medicines/by-barcode/{base}3')
    step('by-barcode: the unapproved medicine is not found', ub.get('medicine', 'id') != u, ub)
    lb = anon.post('/medicines/lookup-barcode', {'code': base + '1'})
    check('lookup-barcode', lb, payload=lb.get('medicine'))
    check('compare', anon.post('/medicines/compare', {'ids': [a, b, u]}), hidden=u)
    check('hot', anon.get('/medicines/hot'))
    s = anon.get(f'/medicines/stream?search=Fieldol%20{tag}')
    check('stream', s, hidden=u)
    check('recommendations', anon.get(f'/medicines/{a}/recommendations'), hidden=u)
    slug = anon.get(f'/public/product-by-id/ar/{a}').get('slug')
    raw_slug = d.get('slug')
    if raw_slug:
        check('seo resolve', anon.get(f'/seo/resolve/medicine/{raw_slug}'))
    else:
        step('seo resolve: the medicine has a slug', False, d)
    step('the approved medicine has a public product page', slug, slug)
    g = anon.get(f'/search/global?q=Fieldol%20{tag}')
    check('global search', g, payload=g.get('results', 'medicines', default=[]), hidden=u)
    check('entity graph', anon.get(f'/entity-graph/related/medicine/{a}'), hidden=u)
    check('ai product feed', anon.get(f'/public/ai-catalog/products?search=Fieldol%20{tag}&limit=50'))
    feed = anon.get(f'/public/ai-catalog/products?search=Fieldol%20{tag}&limit=50')
    skus = ' '.join(str(p.get('sku')) for p in (feed.items() or []))
    step('ai product feed: the unapproved medicine is not listed', u not in skus, skus)

    journey('issue 1555: the unapproved medicine has no public page')
    step('detail of the unapproved medicine is 404', anon.get(f'/medicines/{u}').status == 404)
    step('details of the unapproved medicine is 404', anon.get(f'/medicines/{u}/details').status == 404)
    step('alternatives of the unapproved medicine is 404', anon.get(f'/medicines/{u}/alternatives').status == 404)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
