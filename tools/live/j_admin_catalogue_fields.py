"""Journey: admin catalogue fields and the lines fixed with them (needs-review admin-catalogue#18/#19/#20,
final-pass#2/#3), through the real API.

  - #18/#20 admin/src/components/MedicineQuickEdit.tsx: the admin sets `controlled` (decision 10) with a typed reason;
    a prescription-flag, controlled or availability change leaves a per-item history row (who, when, old -> new, reason).
  - #19 admin/src/components/PriceReviewQueue.tsx (medicines-catalog "أصناف للمراجعة"): offer lines a pharmacy priced
    without a catalogue reference price are listed with the pharmacy, item, price, order and date; the admin closes them.
  - final-pass#2 provider-app MedicalJobsScreen.tsx: a signed-in provider's applications come from
    GET /recruitment/applications/my (the device-bound /recruitment/guest/mine is for visitors only).
  - final-pass#3: the admin's public directory pages were removed (f0232ca7d); the six directories are public API data.
Stack: backend :8002, admin BFF :3001, smtp_sink :2525.
"""
import datetime
import uuid

from lib import Client, WebClient, journey, step

KEY = lambda tag: f'mobile-{tag}-{uuid.uuid4()}'


def rows_of(r):
    return r.body if isinstance(r.body, list) else (r.get('data') or r.get('items') or [])


def catalogue_fields(admin):
    """MedicineQuickEdit.tsx save(): PATCH /medicines/admin/catalog/:id and POST .../availability, then the history."""
    journey('admin catalogue: controlled flag, prescription flag and availability with a reason (history per item)')
    tag = uuid.uuid4().hex[:6]
    body = {'name_ar': f'ترامادول اختبار {tag}', 'name_en': f'Tramadol test {tag}', 'active_ingredient': 'tramadol', 'generic_name': 'tramadol',
            'manufacturer': 'Nabd QA', 'category': 'pain', 'form': 'capsule', 'strength': '50mg', 'package_size': '10',
            'price': 30, 'requires_prescription': False, 'controlled': False, 'images': [],
            'description_ar': 'مسكن', 'description_en': 'analgesic', 'reason': 'إنشاء صنف جديد عبر واجهة الإدارة'}
    r = admin.post('/medicines/admin/catalog', body)
    mid = r.get('id')
    step('admin creates a catalogue item (medicines-catalog create form)', r.ok and mid, r)
    if not mid:
        return
    base = f'/medicines/admin/catalog/{mid}'
    r = admin.patch(base, {'controlled': True})
    step('a controlled-flag change without a reason is refused (flag_change_reason_required)', r.status == 400 and 'flag_change_reason_required' in str(r.body), r)
    reason = f'جدول المواد المراقبة {tag}'
    r = admin.patch(base, {'controlled': True, 'reason': reason})
    step('admin sets controlled with a typed reason (PATCH accepts it: DTO + EDITABLE_FIELDS)', r.ok and 'controlled' in (r.get('updated') or []), r)
    r = admin.get(f'/medicines/admin/catalog?q={tag}&page=1&limit=5')
    hit = next((m for m in rows_of(r) if m.get('id') == mid), None)
    step('the stored item is controlled', r.ok and hit and hit.get('controlled') is True, r)
    rx_reason = f'يصرف بوصفة فقط {tag}'
    r = admin.patch(base, {'requires_prescription': True, 'reason': rx_reason})
    step('admin sets the prescription flag with a reason', r.ok, r)
    av_reason = f'توقف المصنع مؤقتاً {tag}'
    r = admin.post(f'{base}/availability', {'status': 'availability_may_be_limited', 'reason': av_reason})
    step('admin changes availability with a reason', r.ok and r.get('status') == 'availability_may_be_limited', r)
    r = admin.get(f'{base}/price-history?page=1&limit=20')
    hist = rows_of(r)
    ctrl = next((h for h in hist if h.get('field') == 'controlled'), None)
    step('history row for controlled: old -> new, reason, who, when',
         r.ok and ctrl and ctrl.get('before') in (None, False) and ctrl.get('after') is True and ctrl.get('reason') == reason
         and ctrl.get('changed_by') and ctrl.get('changed_by_name') and ctrl.get('createdAt'), r)
    rx = next((h for h in hist if h.get('field') == 'requires_prescription'), None)
    step('history row for the prescription flag carries the reason', rx and rx.get('after') is True and rx.get('reason') == rx_reason, hist)
    av = next((h for h in hist if h.get('field') == 'availability_status'), None)
    step('history row for availability: none -> may be limited, with the reason',
         av and av.get('before') == 'none' and av.get('after') == 'availability_may_be_limited' and av.get('reason') == av_reason, hist)


def price_review_queue(admin):
    """PriceReviewQueue.tsx: GET /admin/pharmacy/price-review (BFF /api/admin/admin/...), close."""
    import j_onboarding, j_accounts, j_pharmacy
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    tok = j_onboarding.provider_after_approval(p)
    ph = Client(tok, 'pharmacy')
    meds = j_pharmacy.admin_adds_medicines(admin)
    j_pharmacy.pharmacy_prices_items(ph, admin, meds)
    pat = Client(j_accounts.app_signup(label='review-buyer')['token'], 'patient')

    journey('admin catalogue: a pharmacy offer line without a catalogue reference price reaches the review queue')
    r = ph.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy goes online', r.ok, r)
    addr = j_pharmacy.patient_address(pat)
    draft = {
        'items': [{'raw_name': m['name_ar'], 'qty': 1, 'sku': m['id'], 'intake_source': 'cart'} for m in meds],
        'delivery_address': {'label': addr.get('label') or 'المنزل', 'street': addr.get('street') or '', 'city': addr.get('city') or '',
                             'lat': float(addr.get('lat') or 0), 'lng': float(addr.get('lng') or 0)},
        'prescription_attachments': [],
    }
    k = KEY('review-broadcast')
    r = pat.post('/patient/pharmacy/orders', draft, headers={'Idempotency-Key': k})
    oid = r.get('id')
    step('patient creates the order', r.ok and oid, r)
    if not oid:
        return p
    r = pat.post(f'/patient/pharmacy/orders/{oid}/submit', {}, headers={'Idempotency-Key': k + '-submit'})
    step('patient broadcasts it', r.ok, r)
    r = ph.get('/provider/pharmacy/broadcasts')
    mine = next((b for b in r.items() if b.get('order_id') == oid), None)
    step('the pharmacy sees the broadcast', r.ok and mine, r)
    if not mine:
        return p
    lines = mine.get('items') or mine.get('medicines') or []
    offer_items = [{'order_item_id': str(m.get('id') or m.get('order_item_id') or ''), 'availability': 'available',
                    'qty_offered': int(m.get('qty_requested') or m.get('qty') or 1)} for m in lines]
    r = ph.post(f'/provider/pharmacy/broadcasts/{oid}/offers/draft', {'items': offer_items})
    offer_id = r.get('id')
    step('pharmacy drafts its offer', r.ok and offer_id, r)
    r = ph.post(f'/provider/pharmacy/broadcasts/{oid}/offers/{offer_id}/submit')
    step('pharmacy submits the offer', r.ok, r)

    r = admin.get(f'/admin/admin/pharmacy/price-review?order_id={oid}&reason=not_verified')
    row = next((x for x in rows_of(r) if x.get('order_id') == oid), None)
    step('the review queue lists the offer of this order', r.ok and row, r)
    if not row:
        return p
    names = {m['name_ar'] for m in meds}
    line = next((ln for ln in row.get('lines') or [] if ln.get('name_ar') in names), None)
    step('a real pharmacy line: item name, offered price, reason not_verified',
         line and line.get('reason') == 'not_verified' and line.get('offered_price') is not None, row)
    step('the row names the pharmacy and carries the date', row.get('pharmacy_name_ar') and row.get('updatedAt'), row)
    step('a line that matches a catalogue item without a reference price says so (no "create" offered)',
         line and line.get('catalogue_item_id') in {m['id'] for m in meds}, line)
    r = admin.post(f"/admin/admin/pharmacy/price-review/{row['id']}/close", {})
    step('admin closes the reviewed row', r.ok and r.get('status') == 'closed', r)
    r = admin.get(f'/admin/admin/pharmacy/price-review?order_id={oid}&status=closed')
    step('the row is listed under closed', r.ok and any(x.get('id') == row['id'] for x in rows_of(r)), r)
    r = admin.post(f"/admin/admin/pharmacy/price-review/{row['id']}/close", {})
    step('closing it again answers 404', r.status == 404, r)
    return p


def provider_recruitment(admin, p):
    """MedicalJobsScreen.tsx inbox (signed in): GET /recruitment/applications/my."""
    import j_onboarding
    journey('provider jobs: a signed-in provider sees their own applications')
    tag = uuid.uuid4().hex[:6]
    r = admin.post('/recruitment/jobs', {'title': f'صيدلي مناوب {tag}', 'description': 'دوام مسائي', 'scfhs_role': 'pharmacist', 'post_type': 'offer',
                                         'contract_type': 'full_time', 'location': 'الرياض', 'requirements': ['ترخيص الهيئة'], 'status': 'published'})
    jid = r.get('id')
    step('a published job exists', r.ok and jid, r)
    prov = Client(p['token'], 'provider')
    cv = j_onboarding.upload(prov, 'cv.png')
    r = prov.post('/recruitment/candidate/profile', {'cv_url': cv, 'scfhs_license_number': f'SCFHS-{tag}', 'scfhs_license_expiry': (datetime.date.today() + datetime.timedelta(days=365)).isoformat()})
    step('provider completes the candidate profile (MedicalJobsApplicant.tsx)', r.ok, r)
    r = prov.post(f'/recruitment/jobs/{jid}/apply', {'cover_letter': 'الخبرة: 4 سنوات'})
    step('provider applies (MedicalJobsScreen handleApply)', r.ok, r)
    r = prov.get('/recruitment/applications/my')
    step("the provider's inbox lists the application with its job", r.ok and any((a.get('job') or {}).get('id') == jid for a in rows_of(r)), r)
    r = prov.get('/recruitment/guest/mine')
    step('the guest route without a device id stays 400 (visitors only; the signed-in screen no longer calls it)', r.status == 400, r)


def directories(admin_web):
    journey('directories: the admin public directory pages are gone; the data is public API')
    import j_admin
    web = WebClient(j_admin.ADMIN_WEB, 'admin-web')
    web.jar = admin_web.jar
    web.opener = admin_web.opener
    for page in ('/articles', '/doctors', '/facilities', '/home-care-services', '/lab-services', '/medicines'):
        r = web.req('GET', page, headers={'accept': 'text/html'})
        step(f'admin {page} is not routed any more (404)', r.status == 404, r.status)
    anon = Client()
    for ep in ('/articles?limit=50', '/care/doctors?limit=300', '/care/facilities?limit=300', '/home-care/services', '/labs/services', '/medicines'):
        r = anon.get(ep)
        body = r.body
        listed = body if isinstance(body, list) else (body.get('data') or body.get('items') or []) if isinstance(body, dict) else []
        step(f'public {ep} answers with a list', r.ok and isinstance(listed, list), r)


def main():
    import j_admin
    admin, _ = j_admin.login()
    catalogue_fields(admin)
    p = price_review_queue(admin)
    if p and p.get('token'):
        provider_recruitment(admin, p)
    directories(admin)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
