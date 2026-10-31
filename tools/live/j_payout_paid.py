"""Journey (payout to PAID, #2232 one payout state machine): a provider withdrawal goes through both approvals (the first
admin, then a second distinct admin, because 1 SAR and above needs two), is approved to APPROVED_FOR_PAYOUT, is executed to
PAID, and the doctor sees PAID. A second execution is refused. If j_payouts left a request waiting, this journey completes it.
  - admin: POST /admin/admin/finance/payouts/:id/approve {reason}; POST .../execute {reason}
  - doctor: GET /provider/payouts/mine (state)
"""
from lib import Client, journey, step, summary

IBAN = 'SA0380000000608010167519'
OWNER_EMAIL = 'owner@nabd.test'
OWNER_PASSWORD = 'Own3r!Live-Pass'
OPEN = ('PENDING_ADMIN_APPROVAL', 'AWAITING_SECOND_APPROVAL', 'APPROVED_FOR_PAYOUT')
REASON = 'مراجعة المبلغ والحساب البنكي مكتملة'


def mine(doctor):
    r = doctor.get('/provider/payouts/mine')
    rows = r.body if isinstance(r.body, list) else r.items()
    return r, [x for x in rows if isinstance(x, dict)]


def run():
    import j_admin, j_accounts, j_concurrency
    from j_admin_ops import bank_setup
    admin, _ = j_admin.login()
    owner, _ = j_admin.login(OWNER_EMAIL, OWNER_PASSWORD)
    pat = Client(j_accounts.app_signup(label='payout-paid-patient')['token'], 'patient')
    if not j_concurrency.completed_consultation(pat):
        return step('a paid consultation the doctor finished', False, 'see the failed booking/visit step above')
    doctor = j_concurrency.DOCTOR_CLIENT
    bank_setup(admin, doctor)

    journey('payout to PAID: a payout request is open and goes through both approvals')
    b = doctor.get('/provider/payouts/balance')
    bal = float(b.get('available') or 0)
    step('the doctor has an available balance', b.ok and bal >= 1, b)
    _, open_rows = mine(doctor)
    open_rows = [x for x in open_rows if x.get('state') in OPEN]
    if not open_rows:
        r = doctor.post('/provider/payouts/request', {'amount': round(bal, 2), 'iban': IBAN, 'idempotency_key': f'payout_paid_{__import__("uuid").uuid4()}'})
        pid = r.get('request', 'id')
        step('the doctor requests the payout', r.ok and pid, r)
        if not pid:
            return summary()
        open_rows = [{'id': pid, 'state': 'PENDING_ADMIN_APPROVAL'}]
    pid = open_rows[0]['id']
    state = open_rows[0].get('state')
    step(f'the open payout is waiting in a state the approvals can take (now {state})', state in OPEN, state)

    if state == 'PENDING_ADMIN_APPROVAL':
        r = admin.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': REASON})
        step('the first admin approves (stage one, AWAITING_SECOND_APPROVAL)', r.ok and r.get('state') == 'AWAITING_SECOND_APPROVAL', r)
        state = 'AWAITING_SECOND_APPROVAL'
    if state == 'AWAITING_SECOND_APPROVAL':
        r = owner.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': REASON})
        step('a second, distinct admin approves (APPROVED_FOR_PAYOUT)', r.ok and r.get('state') == 'APPROVED_FOR_PAYOUT', r)

    journey('payout to PAID: the transfer is executed once, and the doctor sees PAID')
    r = admin.post(f'/admin/admin/finance/payouts/{pid}/execute', {'reason': REASON})
    step('the admin executes the approved payout to PAID (POST .../execute)', r.ok and r.get('state') == 'PAID', r)
    _, rows = mine(doctor)
    row = next((x for x in rows if x.get('id') == pid), None)
    step('the doctor sees the payout as PAID', row is not None and row.get('state') == 'PAID', row)
    r = admin.post(f'/admin/admin/finance/payouts/{pid}/execute', {'reason': REASON})
    step('a second execution is refused (not_executable_in_state_PAID)', not r.ok and 'PAID' in str(r.body), r)
    summary()


if __name__ == '__main__':
    run()
