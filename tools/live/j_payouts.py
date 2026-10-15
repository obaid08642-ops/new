"""Journey: provider wallet and withdrawals (provider-journeys scenario 5; issues 1179 and 1181, provider-journeys#20).
  A doctor earns from a real paid consultation, the bank account is approved, and the doctor withdraws
  (provider-app ProviderWalletScreen and WithdrawalWorkflow; admin payouts page).
  - the wallet card and the withdrawal screen read one balance (the ledger the withdrawal check uses);
  - the withdrawal minimum is the server's (finance_config), returned with the balance;
  - a request waiting for the second admin approval is open: a second request is refused until it is paid or rejected.
  The live stack takes both approvals for every payout, holds no escrow and has a 1 SAR minimum (start-backend.sh).
"""
from lib import Client, journey, step
import uuid

IBAN = 'SA0380000000608010167519'


def run():
    import j_admin, j_accounts, j_concurrency
    from j_admin_ops import bank_setup
    admin, _ = j_admin.login()
    # The live env has no escrow hold and a 1 SAR minimum (start-backend.sh SETTLEMENT_DELAY_DAYS, PAYOUT_MINIMUM_SAR).
    pat = j_accounts.app_signup(label='payout-patient')
    if not j_concurrency.completed_consultation(Client(pat['token'], 'patient')):
        return step('a paid consultation the doctor finished', False, 'see the failed booking/visit step above')
    doctor = j_concurrency.DOCTOR_CLIENT
    bank_setup(admin, doctor)

    journey('payouts: one balance, the server minimum')
    b = doctor.get('/provider/payouts/balance')
    bal = float(b.get('available') or 0)
    step('the doctor has an available balance from the consultation', b.ok and bal > 0, b)
    step('the balance carries the minimum the server enforces (1 SAR)', b.get('minimum_withdrawal') == 1, b)
    w = doctor.get('/provider/wallet')
    step('the wallet card shows the same available balance as the withdrawal screen', w.ok and w.get('available') == b.get('available'), f"wallet={w.get('available')} balance={b.get('available')}")

    journey('payouts: a request waiting for the second approval is open')
    first = round(bal / 2, 2)
    r = doctor.post('/provider/payouts/request', {'amount': first, 'iban': IBAN, 'idempotency_key': f'payout_{uuid.uuid4()}'})
    pid = r.get('request', 'id')
    step('the doctor asks for half of the balance', r.ok and pid, r)
    if not pid:
        return
    r = admin.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': 'مراجعة المبلغ والحساب البنكي مكتملة'})
    step('the first admin approval leaves it awaiting the second', r.ok and r.get('state') == 'AWAITING_SECOND_APPROVAL', r)
    r = doctor.post('/provider/payouts/request', {'amount': 1, 'iban': IBAN, 'idempotency_key': f'payout_{uuid.uuid4()}'})
    step('a second request is refused while the first is open (pending_withdrawal_exists)',
         r.status == 400 and 'pending_withdrawal_exists' in str(r.body), r)
    r = doctor.get('/provider/payouts/mine')
    step('the doctor sees the request as awaiting the second approval',
         r.ok and any(x.get('id') == pid and x.get('state') == 'AWAITING_SECOND_APPROVAL' for x in (r.body if isinstance(r.body, list) else r.items())), r)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
