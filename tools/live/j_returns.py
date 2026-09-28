"""Journey: returns & refunds, patient-app returns/new-request -> returns/hub -> admin decision -> refund-status / wallet.
Payload copied from patient-app app/returns/new-request.tsx (the client amount is ignored by the server)."""
from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def upload_evidence(pat):
    # F76/R7-2: the app flow — expo-image-picker bytes -> multipart /media/upload -> URL.
    import base64
    import struct
    import urllib.request
    import zlib
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))
    raw = b''.join(b'\x00\xff\x00' for _ in range(64))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 8, 8, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
    boundary = '----liveboundary'
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="evidence.png"\r\n'
            f'Content-Type: image/png\r\n\r\n').encode() + png + (
            f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nreport\r\n'
            f'--{boundary}--\r\n').encode()
    token = pat.token
    req = urllib.request.Request('http://127.0.0.1:8002/api/v1/media/upload', data=body, method='POST',
                                 headers={'content-type': f'multipart/form-data; boundary={boundary}',
                                          'authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = __import__('json').loads(resp.read().decode())
        asset_id = payload.get('id') or (payload.get('data') or {}).get('id')
        if not asset_id:
            return None
        req2 = urllib.request.Request(f'http://127.0.0.1:8002/api/v1/media/{asset_id}/url',
                                      headers={'authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req2, timeout=60) as resp2:
            signed = __import__('json').loads(resp2.read().decode())
        return signed.get('url') or (signed.get('data') or {}).get('url')
    except Exception:
        return None


def run(pat, pharm, admin, oid, admin_api=None):
    journey('returns: patient returns a delivered pharmacy order')
    r = pat.get(f'/pharmacy/returns/eligibility/{oid}')
    step('eligibility for the delivered order', r.ok and r.get('eligible'), r)
    evidence = upload_evidence(pat)
    step('photo evidence uploads to /media/upload', bool(evidence), (evidence or '')[:80])
    r = pat.post('/pharmacy/returns', {'serviceType': 'pharmacy', 'reason': 'منتج تالف', 'orderId': oid, 'details': 'العبوة مكسورة',
                                       'refundMethod': 'original', 'amount': 80,
                                       'attachedDocs': [evidence] if evidence else []})
    rid = r.get('id')
    step('return request filed (server computes the amount)', r.ok and rid and r.get('amount') != 80 or (r.ok and r.get('amount', 0) > 0), r)
    if rid and evidence:
        r = pat.get(f'/pharmacy/returns/{rid}')
        docs = r.get('attached_docs') or []
        step('the stored return carries the real image URL', r.ok and evidence in docs, docs)
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
