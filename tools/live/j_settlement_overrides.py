"""Journey (settlement with an admin override and a promotion, owner decisions of 2026-11-01), end to end on the seeded stack.

  1. the admin gives a doctor an override of 8% and a promo of 0% for the first 2 orders
     (PUT /admin/provider-commissions/:id and /promo), and sees both
  2. three consultations are paid by card and finished: the earnings are charged 0%, 0% and 8%
     (the promo counts completed orders and then falls back by itself; VAT is on the commission only, never on the price)
  3. the provider statement (GET /provider/settlements) shows what the settlement wrote: the same percents, the commission and the
     VAT on the commission only, never VAT on the order total
  4. payout: the doctor asks for the whole balance, two admins approve, the transfer is executed, and the ledger balances to zero
Delivery-fee VAT (the platform collects the fee) is on the patient document, which needs a VAT number in finance_config; this stack
has none (receipt mode), so that rule is covered by the billing specs (billing-invoice-api.spec.ts, vat-model-a.spec.ts).
"""
import uuid
from lib import Client, journey, step, summary

IBAN = 'SA0380000000608010167519'
OWNER_EMAIL = 'owner@nabd.test'
OWNER_PASSWORD = 'Own3r!Live-Pass'
REASON = 'مراجعة المبلغ والحساب البنكي مكتملة'
WHY = 'قرار المالك: عرض الانطلاق للمزودين الجدد'
r2 = lambda x: round(float(x) + 1e-9, 2)


def earnings(doctor):
    r = doctor.get('/provider/ops/wallet/ledger')
    rows = (r.get('transactions') or []) if r.ok else []
    return sorted([x for x in rows if x.get('type') == 'provider_earning'], key=lambda x: str(x.get('createdAt')))


def finish_consultation(doc, aid):
    r = doc.get('/provider/jobs/queue?status=incoming&kind=consultation')
    inc = [j.get('id') for j in (r.body if isinstance(r.body, list) else r.items())]
    if aid in inc:
        step('doctor accepts', doc.post(f'/provider/jobs/consultation/{aid}/accept', {}).ok)
    for action in ('check-in', 'start'):
        r = doc.req('PATCH', f'/care/appointments/{aid}/{action}', {})
        step(f'appointment {action}', r.ok, r)
    r = doc.post(f'/care/appointments/{aid}/finish', {'diagnosis': 'متابعة', 'notes': 'راحة', 'recommendations': 'مراجعة عند الحاجة'})
    return step('doctor finishes the visit', r.ok, r)


def run():
    import j_admin, j_accounts, j_concurrency, j_consultation
    from j_admin_ops import bank_setup
    admin, _ = j_admin.login()
    owner, _ = j_admin.login(OWNER_EMAIL, OWNER_PASSWORD)
    pat = Client(j_accounts.app_signup(label='settlement-patient')['token'], 'patient')
    j_concurrency.DOCTOR, j_concurrency.DOCTOR_CLIENT = '', None
    j_concurrency.ensure_doctor()
    doctor = j_concurrency.DOCTOR_CLIENT
    acct = doctor.get('/provider/me').get('account', 'id')
    step('the doctor has an account id', bool(acct), acct)
    if not acct:
        return summary()

    journey('commission: the admin sets an override of 8% and a promo of 0% for the first 2 orders')
    base = f'/admin/admin/provider-commissions/{acct}'
    r = admin.req('PUT', base, {'cash': 8, 'reason': WHY})
    step('the override is saved (8%)', r.ok and r.get('override', 'cash') == 8, r)
    step('the doctor is charged 8% from the provider override', r.get('effective', 'cash', 'percent') == 8 and r.get('effective', 'cash', 'source') == 'provider_profile', r)
    r = admin.req('PUT', f'{base}/promo', {'percent': 0, 'reason': WHY})
    step('a promo with no end is refused (promo_needs_an_end)', r.status == 400 and 'promo_needs_an_end' in str(r.body), r)
    r = admin.req('PUT', f'{base}/promo', {'percent': 0, 'max_orders': 2, 'reason': 'x'})
    step('a change without a reason is refused', r.status == 400, r)
    r = admin.req('PUT', f'{base}/promo', {'percent': 0, 'max_orders': 2, 'reason': WHY})
    promo = (r.get('promos') or [{}])[0] if r.ok else {}
    step('the 0% promo for the first 2 orders is saved and active', r.ok and promo.get('state') == 'active' and promo.get('orders_left') == 2, r)
    step('the doctor is now charged 0% (provider_promo)', r.get('effective', 'cash', 'percent') == 0 and r.get('effective', 'cash', 'source') == 'provider_promo', r)
    r = admin.get(base)
    step('the admin sees the override and the promo', r.ok and r.get('override', 'cash') == 8 and len(r.get('promos') or []) == 1, r)
    r = admin.get('/admin/admin/audit-log?limit=50') if False else None

    journey('commission: three completed consultations are charged 0%, 0% and 8%')
    slots, _ = j_concurrency.free_slots(pat, 3)
    if len(slots) < 3:
        return summary()
    for i, slot in enumerate(slots[:3], 1):
        r = pat.post('/slot-locks/reserve', {'provider_id': j_concurrency.DOCTOR, 'booking_kind': 'consultation', 'slot_start': slot})
        lock = r.get('id')
        r = j_concurrency.book(pat, slot, lock)
        aid = r.get('id')
        step(f'consultation {i}: booked', r.ok and aid, r)
        if not aid:
            return summary()
        step(f'consultation {i}: paid by card', j_consultation.pay_card(pat, aid))
        if not finish_consultation(doctor, aid):
            return summary()
    rows = earnings(doctor)
    step('three earnings were credited', len(rows) == 3, [x.get('commission_percent') for x in rows])
    if len(rows) != 3:
        return summary()
    step('commission percents are 0, 0 and 8', [x.get('commission_percent') for x in rows] == [0, 0, 8], [x.get('commission_percent') for x in rows])
    step('the first two are the promo (with its id), the third the provider override',
         [x.get('commission_source') for x in rows] == ['provider_promo', 'provider_promo', 'provider_profile'] and rows[0].get('promo_id') == rows[1].get('promo_id') and not rows[2].get('promo_id'),
         [(x.get('commission_source'), x.get('promo_id')) for x in rows])
    g = [float(x.get('gross') or 0) for x in rows]
    step('the three consultations have the same price', len(set(g)) == 1 and g[0] > 0, g)
    gross = g[0]
    step('0% promo: no commission, no VAT, the doctor gets the whole price',
         all(float(rows[i].get('commission')) == 0 and float(rows[i].get('vat')) == 0 and r2(rows[i].get('amount')) == r2(gross) for i in (0, 1)), rows[:2])
    com = r2(gross * 8 / 100); vat = r2(com * 15 / 100)
    step(f'the third: commission 8% = {com}, VAT only on the commission = {vat} (15% of {com}), net = price - commission - VAT',
         r2(rows[2].get('commission')) == com and r2(rows[2].get('vat')) == vat and r2(rows[2].get('amount')) == r2(gross - com - vat), rows[2])
    r = admin.get(base)
    p = (r.get('promos') or [{}])[0]
    step('the promo is used up (2 of 2) and the normal override applies again by itself',
         p.get('state') == 'exhausted' and p.get('used_orders') == 2 and r.get('effective', 'cash', 'source') == 'provider_profile', r)

    journey('provider statement: the commission and the VAT on the commission only')
    r = doctor.get('/provider/settlements')
    srows = r.get('rows') or []
    step('the statement lists the three earnings', r.ok and len(srows) == 3, r)
    if len(srows) == 3:
        by_pct = sorted(float(x.get('commission_percent')) for x in srows)
        step('its commission percents are the ones the settlement charged (0, 0, 8)', by_pct == [0, 0, 8], by_pct)
        t = r.get('totals') or {}
        step('totals: commission and VAT on the commission only (VAT = 15% of the commission, not of the total)',
             r2(t.get('commission')) == com and r2(t.get('vat')) == vat and r2(t.get('total')) == r2(gross * 3), t)
        step('totals: net = total - commission - VAT', r2(t.get('net')) == r2(gross * 3 - com - vat), t)

    journey('payout: request, two approvals, execution, the ledger balances to zero')
    bank_setup(admin, doctor)
    b = doctor.get('/provider/payouts/balance')
    bal = float(b.get('available') or 0)
    expected = r2(gross * 3 - com - vat)
    step('the available balance is the sum of the three net earnings', b.ok and r2(bal) == expected, f'balance={bal} expected={expected}')
    r = doctor.post('/provider/payouts/request', {'amount': r2(bal), 'iban': IBAN, 'idempotency_key': f'payout_{uuid.uuid4()}'})
    pid = r.get('request', 'id')
    step('the doctor requests the whole balance', r.ok and pid, r)
    if not pid:
        return summary()
    r = admin.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': REASON})
    step('first admin approval (awaiting the second)', r.ok and r.get('state') == 'AWAITING_SECOND_APPROVAL', r)
    r = owner.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': REASON})
    step('second, distinct admin approval', r.ok and r.get('state') == 'APPROVED_FOR_PAYOUT', r)
    r = admin.post(f'/admin/admin/finance/payouts/{pid}/execute', {'reason': REASON})
    step('the transfer is executed (PAID)', r.ok and r.get('state') == 'PAID', r)
    b = doctor.get('/provider/payouts/balance')
    step('the available balance is now zero', b.ok and r2(b.get('available') or 0) == 0, b)
    led = doctor.get('/provider/ops/wallet/ledger')
    s = led.get('summary') or {}
    paid = r2(sum(abs(float(x.get('amount') or 0)) for x in (led.get('transactions') or []) if x.get('type') == 'payout'))
    step('the ledger balances: earned = paid out, nothing left', r2(s.get('earned')) == expected and paid == expected and r2(s.get('balance')) == 0, s)
    summary()


if __name__ == '__main__':
    run()
