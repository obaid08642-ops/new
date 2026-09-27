"""Journey: admin operations through the admin BFF (payouts.tsx, users-management.tsx, legal-policies.tsx, commissions.tsx)
against real data: a doctor who earned from a completed consultation asks for a payout (provider-app SharedScreens)."""
import uuid
from lib import Client, journey, step


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def payouts(admin, doctor):
    journey('payouts: provider asks, admin executes (payouts.tsx)')
    r = doctor.get('/provider/payouts/balance')
    bal = float(r.get('available') or r.get('balance') or 0)
    step('provider balance reflects the completed consultation', r.ok and bal > 0, r)
    r = doctor.post('/provider/payouts/request', {'amount': bal, 'iban': 'SA0380000000608010167519', 'idempotency_key': f'payout_{uuid.uuid4()}'})
    pid = r.get('id') or r.get('withdrawal', 'id') or r.get('payout', 'id')
    step('provider requests the payout', r.ok and pid, r)
    r = doctor.post('/provider/payouts/request', {'amount': bal * 10 + 1000, 'iban': 'SA0380000000608010167519', 'idempotency_key': f'payout_{uuid.uuid4()}'})
    step('asking for more than the balance is refused', r.status in (400, 409, 422), r)
    r = admin.get('/admin/finance/withdrawals/pending')
    step('admin payouts page lists it', r.ok and pid and pid in str(r.body), r)
    if pid:
        r = admin.post(f'/admin/finance/withdrawals/{pid}/execute', {})
        step('admin executes it', r.ok, r)
        r = doctor.get('/provider/payouts/mine')
        step('provider sees it paid', r.ok and any(x.get('id') == pid and str(x.get('status')).lower() in ('paid', 'executed', 'completed') for x in rows(r)), r)


def users(admin, pat, pat_email):
    journey('users: admin suspends and restores a patient (users-management.tsx)')
    r = admin.get(f'/admin/users?q={pat_email}')
    u = next((x for x in rows(r) if x.get('email') == pat_email), None)
    step('admin finds the patient', r.ok and u, r)
    if not u:
        return
    uid = u.get('id') or u.get('_id')
    r = admin.get(f'/admin/users/{uid}/overview?days=30')
    step('user overview opens', r.ok, r)
    r = admin.post(f'/admin/users/{uid}/ban', {})
    step('admin bans the patient', r.ok, r)
    r = pat.get('/users/me/profile')
    step('the banned patient is locked out', r.status in (401, 403), r)
    r = admin.post(f'/admin/users/{uid}/unban', {})
    step('admin restores the patient', r.ok, r)


def legal_and_commissions(admin):
    journey('legal policies and commissions (legal-policies.tsx, commissions.tsx)')
    text = f'سياسة الخصوصية — تحديث {uuid.uuid4().hex[:6]}'
    r = admin.put('/admin/legal/policy/privacy', {'content_ar': text, 'change_note': 'admin edit from dashboard'})
    step('admin publishes a privacy policy change', r.ok, r)
    r = Client(None, 'anon').get('/legal/policy/privacy')
    step('the public policy shows the new text', r.ok and text in str(r.body), r)
    r = admin.get('/legal/policies')
    step('policies list includes it', r.ok and 'privacy' in str(r.body), r)
    r = admin.get('/admin/finance/commissions')
    step('commissions load', r.ok, r)
    cur = r.body if isinstance(r.body, dict) else {}
    st = dict((cur.get('service_types') or {}))
    ph = dict(st.get('pharmacy') or {})
    old = ph.get('percent')
    ph['percent'] = 11
    st['pharmacy'] = ph
    r = admin.put('/admin/finance/commissions', {'service_types': st})
    step('admin changes the pharmacy commission', r.ok, r)
    r = admin.get('/admin/finance/commissions')
    step('the change is saved', r.ok and ((r.get('service_types') or {}).get('pharmacy') or {}).get('percent') == 11, r)
    if old is not None:
        st['pharmacy']['percent'] = old
        admin.put('/admin/finance/commissions', {'service_types': st})
    r = admin.get('/admin/finance/ledger/summary')
    step('ledger summary loads', r.ok, r)


if __name__ == '__main__':
    import j_admin, j_accounts, j_onboarding, j_consultation
    from lib import summary
    admin, _ = j_admin.login()
    specs = Client(None, 'anon').get('/catalogs/specialties')
    spec = next((x.get('code') or x.get('id') for x in (specs.body if isinstance(specs.body, list) else specs.items())), 'cardiology')
    p = j_onboarding.register_type('doctor', {'specialty': spec, 'academic_degree': 'consultant'})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    doc = Client(p['token'], 'doctor')
    j_consultation.doctor_publishes_hours(doc, admin)
    pa = j_accounts.app_signup(label='ops-patient')
    pat = Client(pa['token'], 'patient')
    j_consultation.run(pat, doc, admin)
    payouts(admin, doc)
    users(admin, pat, pa.get('email'))
    legal_and_commissions(admin)
    summary()
