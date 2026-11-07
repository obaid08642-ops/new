"""Journey: a patient's refill reaches the pharmacies, and the pharmacy's refills screens list it (audit-3 gap 14).
  - the patient repeats an earlier order (POST /patient/pharmacy/orders/:id/refill): a NEW order is broadcast with the same lines and no price;
  - the pharmacies that were asked to price it list it in GET /provider/pharmacy/refills, with the order it repeats and its state; the first
    order is not a refill; a pharmacy that was not asked does not see it; the patient's identity is not in the row;
  - another patient cannot refill this order; a refill of an unknown order is 404.
Stack: backend :8002, admin BFF :3001, smtp_sink :2525."""
import uuid

from lib import Client, journey, step


def run(pat, pat2, ph_a, meds, addr):
    import j_pharmacy
    journey('audit-3 gap 14: refills')
    oid, row = j_pharmacy._send_order(pat, ph_a, meds, addr, items=j_pharmacy._draft_body(meds, count=1))
    step('the first order reaches the pharmacy', bool(row), row)
    if not row:
        return
    r = ph_a.get('/provider/pharmacy/refills')
    step('the first order is not a refill, so the refills list does not hold it', r.ok and not any(x.get('order_id') == oid for x in r.items()), r)
    r = pat.post(f'/patient/pharmacy/orders/{oid}/refill', {}, headers={'Idempotency-Key': f'refill-{uuid.uuid4()}'})
    new_id = r.get('id')
    step('the patient refills the order: a new order is created and broadcast', r.ok and new_id and new_id != oid, r)
    if not new_id:
        return
    r = ph_a.get('/provider/pharmacy/refills')
    rows = r.items()
    mine = next((x for x in rows if x.get('order_id') == new_id), None)
    step('the pharmacy lists the refill, pointing at the order it repeats', r.ok and mine and mine.get('refill_of') == oid, mine or r.status)
    step('the row carries the lines, their quantities and the state, and no patient identity',
         bool(mine) and bool(mine.get('items')) and mine.get('order_status') and 'patient' not in mine and 'patient_name' not in mine and 'phone' not in str(mine), mine)
    r = ph_a.get('/provider/pharmacy/broadcasts')
    step('the refill is also an ordinary broadcast the pharmacy can answer', any(x.get('order_id') == new_id for x in r.items()), r.status)
    d, sub = j_pharmacy._quote(ph_a, new_id, next(x for x in r.items() if x.get('order_id') == new_id))
    step('the pharmacy prices the refill like any order', d.ok and sub.ok, f'{d} / {sub}')
    r = pat2.post(f'/patient/pharmacy/orders/{oid}/refill', {}, headers={'Idempotency-Key': f'refill-{uuid.uuid4()}'})
    step('another patient cannot refill this order (404)', r.status == 404, r)
    r = pat.post('/patient/pharmacy/orders/00000000-0000-4000-8000-00000000dead/refill', {}, headers={'Idempotency-Key': f'refill-{uuid.uuid4()}'})
    step('refilling an unknown order is 404', r.status == 404, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_pharmacy
    from lib import summary
    admin, _ = j_admin.login()
    accounts = []
    for _i in range(2):
        p = j_onboarding.register_pharmacy()
        j_onboarding.admin_review(admin, p)
        j_onboarding.provider_after_approval(p)
        ph = Client(p['token'], 'pharmacy')
        r = ph.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
        step('the pharmacy switches to "online - ready for orders"', r.ok and r.get('instant_available') is True, r)
        accounts.append(ph)
    pat = Client(j_accounts.app_signup(label='refill-buyer')['token'], 'patient')
    pat2 = Client(j_accounts.app_signup(label='refill-other')['token'], 'patient')
    meds = j_pharmacy.admin_adds_medicines(admin)
    for ph in accounts:
        j_pharmacy.pharmacy_prices_items(ph, admin, meds)
    addr = j_pharmacy.patient_address(pat)
    run(pat, pat2, accounts[0], meds, addr)
    summary()
