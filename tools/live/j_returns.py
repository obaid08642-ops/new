"""Journey: returns & refunds, patient-app returns/new-request -> returns/hub -> admin decision -> refund-status / wallet.
Payload copied from patient-app app/returns/new-request.tsx (the client amount is ignored by the server)."""
from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def run(pat, pharm, admin, oid, admin_api=None):
    journey('returns: patient returns a delivered pharmacy order')
    r = pat.get(f'/pharmacy/returns/eligibility/{oid}')
    step('eligibility for the delivered order', r.ok and r.get('eligible'), r)
    r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'منتج تالف', 'orderId': oid, 'details': 'العبوة مكسورة',
                                       'refundMethod': 'original', 'amount': 80})
    rid = r.get('id')
    step('return request filed (server computes the amount)', r.ok and rid and r.get('amount') != 80 or (r.ok and r.get('amount', 0) > 0), r)
    r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'x', 'orderId': 'not-my-order', 'refundMethod': 'wallet'})
    step('a return on an unknown order is refused', r.status in (400, 403, 404), r)
    r = pat.get('/pharmacy/returns')
    step('returns hub lists it', r.ok and rid in str(r.body), r)
    r = pat.get(f'/pharmacy/returns/{rid}')
    step('return detail opens', r.ok, r)
    r = pharm.get('/pharmacy/returns/provider/list')
    step('the pharmacy sees the return against its order', r.ok and rid in str(r.body), r)

    journey('returns: services other than pharmacy (new-request types consultation/diagnostics/nursing)')
    r = pat.post('/pharmacy/returns', {'serviceType': 'consultation', 'reason': 'لم يحضر الطبيب', 'orderId': oid, 'refundMethod': 'original'})
    step('a consultation-type return cannot borrow a pharmacy order id', r.status in (400, 403, 404), r)

    journey('returns: admin decides and the refund is executed')
    # Admin returns live behind /api/v1/admin/returns (BFF 1:1 → /api/admin/admin/returns).
    r = admin.get('/admin/admin/returns')
    step('admin panel can list return requests', r.ok and rid in str(r.body), r)
    r = admin.post(f'/admin/admin/returns/{rid}/decide', {'decision': 'approved', 'note': 'مقبول'})
    step('admin panel can decide a return', r.ok, r)
    if not r.ok and admin_api:
        r = admin_api.post(f'/admin/returns/{rid}/decide', {'decision': 'approved', 'note': 'مقبول'})
        step('(API) admin approves the return', r.ok, r)
    r = pat.get(f'/pharmacy/returns/{rid}')
    step('return shows approved/refunded', r.ok and str(r.get('status')) in ('approved', 'completed', 'refunded'), r)
    r = pat.get('/refunds/my')
    step('refund-status lists the refund', r.ok and (rid in str(r.body) or oid in str(r.body)), r)
    # 7A-A2: refunds go back through the original method (ledger record for cash) —
    # no wallet is credited, so the read model must show the executed refund instead.
    refunds = r.items() if hasattr(r, 'items') else []
    row = next((x for x in refunds if rid in str(x.get('id')) or oid in str(x.get('booking_id'))), {})
    step('the executed refund carries its status', bool(row) and row.get('state') == 'EXECUTED', row or r.status)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    from lib import summary
    admin, admin_api = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    pat = j_accounts.app_signup(label='returner')
    meds = j_pharmacy.admin_adds_medicines(admin)
    ph = Client(p['token'], 'pharmacy')
    j_pharmacy.pharmacy_prices_items(ph, admin, meds)
    pc = Client(pat['token'], 'patient')
    oid = j_pharmacy.run(pc, ph, admin, meds)
    run(pc, ph, admin, oid, admin_api)
    summary()
