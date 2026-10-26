"""Journey (QA P-11, P-12, P-13): card payment for a pharmacy order when it fails, is retried, and is refunded by cancel.
  P-11 the hosted checkout is declined (fake Moyasar status=failed): the order stays unpaid, the payment record is failed.
       3DS challenge is not modelled by the test double, so it is not covered here.
  P-12 the patient retries: a new payment intent is created for the same order and the second checkout is paid.
  P-13 the paid order is cancelled by the patient: money goes back through the cancel path (patient-ux refund route
       answers Gone, see patient-ux.module.ts), checked in MongoDB (pharmacy_orders, transactions).
Collections: pharmacy_orders (order state), transactions (one row per payment attempt, booking_kind pharmacy)."""
import json
import subprocess

from lib import Client, journey, step
from j_nursing import fake_pay
from j_pharmacy import admin_adds_medicines, pharmacy_prices_items, patient_address, _send_order, _quote
import uuid


def mongo_json(js):
    out = subprocess.run(['docker', 'exec', 'mongo', 'mongosh', '--quiet', 'nabd_live', '--eval', f'JSON.stringify({js})'],
                         capture_output=True, text=True).stdout.strip()
    return json.loads(out) if out and out != 'null' else None


def order_row(oid):
    return mongo_json(f'db.pharmacy_orders.findOne({{id: "{oid}"}}, {{_id: 0, id: 1, status: 1, payment_status: 1, payment_method: 1}})')


def payments_for(oid):
    return mongo_json(f'db.transactions.find({{booking_id: "{oid}", booking_kind: "pharmacy"}}, {{_id: 0, id: 1, status: 1, booking_kind: 1, gateway_intent_id: 1}}).toArray()') or []


def intent(pat, oid):
    r = pat.post(f'/payments/intent/pharmacy/{oid}', {}, headers={'Idempotency-Key': f'payment-pharmacy-{oid}-{uuid.uuid4()}'})
    txn = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    return r, txn


def sellable_order(pat, ph, admin, meds, addr):
    """Order sent, offer submitted, offer selected (cash coverage), final quote accepted if the server asks for it."""
    oid, bc = _send_order(pat, ph, meds, addr)
    if not bc:
        return None
    _quote(ph, oid, bc)
    offer = next(iter(pat.get(f'/patient/pharmacy/orders/{oid}/offers').items()), None)
    if not offer:
        return None
    r = pat.post(f"/patient/pharmacy/orders/{oid}/offers/{offer.get('id')}/select", {'coverage_mode': 'cash'}, headers={'Idempotency-Key': f'sel-{oid}'})
    step('patient selects the offer for card payment', r.ok, r)
    order = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = order.body.get('data', order.body) if isinstance(order.body, dict) else {}
    if order.get('governed_state') == 'FINAL_QUOTE_READY' or order.get('selected_offer_hash'):
        fq = order.get('governed_state') == 'FINAL_QUOTE_READY'
        pat.post(f'/patient/pharmacy/orders/{oid}/final-quote/accept', {'quote_hash': order.get('pending_final_quote_hash' if fq else 'selected_offer_hash'),
                 'quote_revision': order.get('pending_final_quote_revision' if fq else 'selected_offer_revision')}, headers={'Idempotency-Key': f'fq-{oid}'})
    return oid


def run(pat, ph, admin, meds, addr):
    oid = sellable_order(pat, ph, admin, meds, addr)
    journey('payment P-11: the hosted checkout is declined')
    step('an order with a selected offer is ready to pay', bool(oid), oid)
    if not oid:
        return
    r, txn = intent(pat, oid)
    step('payment intent created (amount from the server)', r.ok and txn.get('id') and txn.get('amount'), r)
    fake_pay(txn.get('gateway_intent_id'), status='failed')
    r = pat.post(f"/payments/verify/{txn.get('id')}", {})
    step('the declined payment is not verified as paid', r.ok and r.get('status') != 'paid', r)
    pays = payments_for(oid)
    failed = [p for p in pays if p.get('status') == 'failed']
    step('MongoDB: the payment record is failed', bool(failed), pays)
    row = order_row(oid)
    step('MongoDB: the order is still unpaid', bool(row) and str(row.get('payment_status') or '').lower() != 'paid', row)
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('patient reload shows the order unpaid', r.ok and str(order.get('payment_status') or '').lower() != 'paid', r)

    journey('payment P-12: the patient retries and pays')
    r, txn2 = intent(pat, oid)
    step('a new payment intent is created for the retry', r.ok and txn2.get('id') and txn2.get('id') != txn.get('id'), r)
    fake_pay(txn2.get('gateway_intent_id'), status='paid')
    r = pat.post(f"/payments/verify/{txn2.get('id')}", {})
    step('the retry is verified as paid', r.ok and r.get('status') == 'paid', r)
    row = order_row(oid)
    step('MongoDB: the order is paid after the retry', bool(row) and str(row.get('payment_status') or '').lower() == 'paid', row)
    pays = payments_for(oid)
    step('MongoDB: one failed and one paid payment record', any(p.get('status') == 'paid' for p in pays) and any(p.get('status') == 'failed' for p in pays), pays)

    journey('payment P-13: the patient cancels the paid order and the money is refunded')
    r = pat.post(f'/patient/pharmacy/orders/{oid}/cancel', {'reason': 'QA refund probe'}, headers={'Idempotency-Key': f'cancel-{oid}'})
    step('the paid order is cancelled', r.ok, r)
    row = order_row(oid)
    step('MongoDB: the order is cancelled', bool(row) and str(row.get('status')).lower() in ('cancelled', 'canceled'), row)
    pays = payments_for(oid)
    step('MongoDB: the payment is refunded', any(p.get('status') == 'refunded' for p in pays), pays)
    r = pat.get(f'/patient/pharmacy/orders/{oid}')
    order = r.body.get('data', r.body) if isinstance(r.body, dict) else {}
    step('patient reload shows the order cancelled and refunded', r.ok and str(order.get('status')).lower() in ('cancelled', 'canceled'), r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding
    from lib import summary
    admin, _ = j_admin.login()
    p = j_onboarding.register_pharmacy()
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    meds = admin_adds_medicines(admin)
    ph = Client(p['token'], 'pharmacy')
    r = ph.req('POST', '/provider/ops/availability/toggle-instant', None, idem=False)
    step('pharmacy goes online', r.ok, r)
    pharmacy_prices_items(ph, admin, meds)
    pat = Client(j_accounts.app_signup(label='pay-paths')['token'], 'patient')
    run(pat, ph, admin, meds, patient_address(pat))
    summary()
