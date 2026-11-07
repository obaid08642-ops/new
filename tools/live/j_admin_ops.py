"""Journey: admin operations through the admin BFF (payouts.tsx, users-management.tsx, legal-policies.tsx, commissions.tsx)
against real data: a doctor who earned from a completed consultation asks for a payout (provider-app SharedScreens)."""
import datetime, os, uuid
from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def live_env_hold_zero(admin):
    # Live env only: escrow matures immediately and the payout minimum is lifted
    # so the payout flow can complete in one run (production keeps the delay
    # and the 100 SAR minimum).
    journey('payouts: live env releases the escrow hold')
    r = admin.post('/admin/admin/finance/commissions/config', {'settlement_delay_days': 0, 'minimum_payout_sar': 0,
                                                              'reason': 'live env: no escrow hold and no payout minimum'})
    step('settlement hold set to 0 for the live env', r.ok, r)


def bank_setup(admin, doctor):
    journey('payouts: provider bank account verified (WithdrawalWorkflow)')
    r = doctor.post('/provider/bank-account', {'bank_code': 'rajhi', 'holder_name': 'عيادة الاختبار الحي',
                                                'iban': 'SA0380000000608010167519'})
    step('provider submits the bank account', r.ok, r)
    aid = doctor.get('/provider/me').get('account', 'id')
    step('provider account id resolves', bool(aid), aid)
    if aid:
        r = admin.post(f'/admin/admin/providers/{aid}/approve-bank', {})
        step('admin approves the bank account', r.ok, r)
    r = doctor.get('/provider/bank-account')
    step('the account reads back approved', r.ok and r.get('review_status') == 'approved', r)


def payouts(admin, doctor, owner):
    journey('payouts: provider asks, admin approves and records the transfer (payouts.tsx)')
    r = doctor.get('/provider/payouts/balance')
    bal = float(r.get('available') or r.get('balance') or 0)
    step('provider balance reflects the completed consultation', r.ok and bal > 0, r)
    r = doctor.post('/provider/payouts/request', {'amount': bal, 'iban': 'SA0380000000608010167519', 'idempotency_key': f'payout_{uuid.uuid4()}'})
    pid = r.get('request', 'id') or r.get('id') or r.get('withdrawal', 'id') or r.get('payout', 'id')
    step('provider requests the payout', r.ok and pid, r)
    r = doctor.post('/provider/payouts/request', {'amount': bal * 10 + 1000, 'iban': 'SA0380000000608010167519', 'idempotency_key': f'payout_{uuid.uuid4()}'})
    step('asking for more than the balance is refused', r.status in (400, 409, 422), r)
    r = admin.get('/admin/admin/finance/payouts?status=PENDING_ADMIN_APPROVAL&page=1&limit=50')
    step('admin payouts page lists it', r.ok and pid and pid in str(r.body), r)
    if pid:
        reason = 'journey check: bank record verified'
        r = admin.post(f'/admin/admin/finance/payouts/{pid}/execute', {'reason': reason})
        step('a payout cannot be paid before it is approved', r.status == 400, r)
        r = admin.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': reason})
        step('admin approves it (the live env asks for two admins: it now awaits the second)', r.ok and r.get('state') == 'AWAITING_SECOND_APPROVAL', r)
        r = admin.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': reason})
        step('the same admin cannot give the second approval', not r.ok, r)
        r = admin.post(f'/admin/admin/finance/payouts/{pid}/execute', {'reason': reason})
        step('a payout awaiting its second approval cannot be paid', r.status == 400, r)
        r = owner.post(f'/admin/admin/finance/payouts/{pid}/approve', {'reason': reason})
        step('a second, distinct admin approves it', r.ok and r.get('state') == 'APPROVED_FOR_PAYOUT', r)
        r = admin.post(f'/admin/admin/finance/payouts/{pid}/execute', {'reason': reason})
        step('admin records the transfer (PAID)', r.ok, r)
        r = doctor.get('/provider/payouts/mine')
        step('provider sees it paid', r.ok and any(x.get('id') == pid and str(x.get('state') or x.get('status')).upper() == 'PAID' for x in rows(r)), r)


def users(admin, pat, pat_email):
    journey('users: admin suspends and restores a patient (users-management.tsx)')
    r = admin.get(f'/admin/admin/users?q={pat_email}')
    u = next((x for x in rows(r) if x.get('email') == pat_email), None)
    step('admin finds the patient', r.ok and u, r)
    if not u:
        return
    uid = u.get('id') or u.get('_id')
    r = admin.get(f'/admin/admin/users/{uid}/overview?days=30')
    step('user overview opens', r.ok, r)
    r = admin.post(f'/admin/admin/users/{uid}/ban', {})
    step('admin bans the patient', r.ok, r)
    r = pat.get('/users/me/profile')
    step('the banned patient is locked out', r.status in (401, 403), r)
    r = admin.post(f'/admin/admin/users/{uid}/unban', {})
    step('admin restores the patient', r.ok, r)


def legal_and_commissions(admin):
    today = datetime.date.today()
    report = f'/admin/admin/finance/commissions?from={today - datetime.timedelta(days=30)}&to={today}'   # the report needs a date range
    journey('legal policies and commissions (legal-policies.tsx, commissions.tsx)')
    text = f'سياسة الخصوصية — تحديث {uuid.uuid4().hex[:6]}'
    r = admin.put('/admin/admin/legal/policy/privacy', {'content_ar': text, 'change_note': 'admin edit from dashboard'})
    step('admin publishes a privacy policy change', r.ok, r)
    r = Client(None, 'anon').get('/legal/policy/privacy')
    step('the public policy shows the new text', r.ok and text in str(r.body), r)
    r = admin.get('/legal/policies')
    step('policies list includes it', r.ok and 'privacy' in str(r.body), r)
    r = admin.get(report)
    step('commissions load', r.ok and isinstance(r.get('config_used', 'percents'), dict), r)
    old = (r.get('config_used', 'percents') or {}).get('pharmacy')
    r = admin.post('/admin/admin/finance/commissions/config', {'percents': {'pharmacy': 11}, 'reason': 'journey check: commission edit'})
    step('admin changes the pharmacy commission', r.ok, r)
    r = admin.get(report)
    step('the change is saved', r.ok and float((r.get('config_used', 'percents') or {}).get('pharmacy', -1)) == 11, r)
    if old is not None:
        r = admin.post('/admin/admin/finance/commissions/config', {'percents': {'pharmacy': old}, 'reason': 'journey check: commission restored'})
        step('the commission is put back', r.ok, r)
    r = admin.get('/admin/admin/finance/ledger/summary')
    step('ledger summary loads', r.ok, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    owner, _ = j_admin.login(os.environ.get('LIVE_OWNER_EMAIL', 'owner@nabd.test'), os.environ.get('LIVE_OWNER_PASSWORD', 'Own3r!Live-Pass'))
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin)
    live_env_hold_zero(admin)
    bank_setup(admin, doc)
    pa = j_accounts.app_signup(label='ops-patient')
    pat = Client(pa['token'], 'patient')
    j_consultation.run(pat, doc, admin)
    payouts(admin, doc, owner)
    users(admin, pat, pa.get('email'))
    legal_and_commissions(admin)
    summary()
