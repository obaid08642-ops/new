"""Journey: loyalty & referrals, patient-app loyalty/{hub,rewards,challenges,referrals} + pharmacy/wishlist.
Points must come from real completed services (consultation completed + review), then rewards/claim."""
from lib import Client, journey, step

LOYALTY_GETS = ['/loyalty/account', '/loyalty/config', '/loyalty/rewards', '/loyalty/challenges', '/loyalty/leaderboard?limit=50',
                '/loyalty/transactions?page=1', '/referrals/my', '/users/me/wishlist']


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def run(pat, friend):
    journey('loyalty: screens load')
    for path in LOYALTY_GETS:
        r = pat.get(path)
        step(f'GET {path}', r.ok, r)

    journey('loyalty: points from the completed consultation and its review')
    r = pat.get('/loyalty/account')
    pts = r.get('points') or 0
    step('points were awarded for the completed visit and the review', r.ok and pts > 0, r)
    r = pat.get('/loyalty/transactions?page=1')
    reasons = [t.get('reason') for t in (r.get('transactions') or [])]
    step('history shows booking_completed and review_submitted', 'booking_completed' in reasons and 'review_submitted' in reasons, reasons)

    journey('loyalty: rewards')
    r = pat.get('/loyalty/rewards')
    rewards = rows(r)
    affordable = [x for x in rewards if (x.get('points_cost') or x.get('cost') or 10**9) <= pts]
    step('reward catalogue', r.ok, f'{len(rewards)} rewards, {len(affordable)} affordable with {pts} pts')
    if affordable:
        rw = affordable[0]
        r = pat.post(f"/loyalty/rewards/{rw['id']}/claim", {})
        step('claim an affordable reward', r.ok, r)
        r = pat.get('/loyalty/account')
        step('points were deducted', r.ok and (r.get('points') or 0) < pts, r)
    expensive = [x for x in rewards if (x.get('points_cost') or x.get('cost') or 0) > pts]
    if expensive:
        r = pat.post(f"/loyalty/rewards/{expensive[0]['id']}/claim", {})
        step('a reward the patient cannot afford is refused', r.status in (400, 403, 409), r)
    ch = rows(pat.get('/loyalty/challenges'))
    if ch:
        r = pat.post(f"/loyalty/challenges/{ch[0]['id']}/join", {})
        step('join a challenge', r.ok, r)

    journey('referrals: a friend applies the patient code')
    code = pat.get('/referrals/my').get('code')
    step('patient has a referral code', code, code)
    r = friend.post('/referrals/apply', {'code': code})
    step('friend applies it', r.ok, r)
    r = friend.post('/referrals/apply', {'code': code})
    step('applying twice is refused', not r.ok, r)
    r = pat.post('/referrals/apply', {'code': code})
    step('own code is refused', not r.ok, r)


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
    pat = Client(j_accounts.app_signup(label='loyal')['token'], 'patient')
    j_consultation.run(pat, doc, admin)
    friend = Client(j_accounts.app_signup(label='friend')['token'], 'patient')
    run(pat, friend)
    summary()
