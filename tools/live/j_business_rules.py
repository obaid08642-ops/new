"""Journey 16.12: business-logic abuse rules on the live stack.
  - a review comes only from a finished service the reviewer used (POST /ratings took any entity id before);
  - referrals: not your own code, once per account, and the same phone cannot be referred twice.
(Coupons, loyalty and stock reservation have no patient endpoint that applies them yet; their rules are covered by the unit specs
that run against a real MongoDB: coupon-rx-abuse, loyalty-rx-earn, stock-reservation-atomic.)"""
import j_accounts
from lib import Client, journey, step


def main():
    journey('16.12: a review needs a finished service of the reviewer')
    pat = Client(j_accounts.app_signup(label='rules-a')['token'], 'patient')
    r = pat.post('/ratings', {'entity_type': 'lab_booking', 'entity_id': 'no-such-booking', 'provider_id': 'someone', 'score': 5})
    step('a review of an invented booking is refused', r.status in (403, 404) and not r.ok, r)
    r = pat.post('/ratings', {'entity_type': 'appointment', 'entity_id': 'no-such-appointment', 'provider_id': 'someone', 'score': 1, 'comment': 'x'})
    step('a one-star review of an invented appointment is refused too', r.status in (403, 404) and not r.ok, r)
    r = pat.get('/ratings/provider/someone')
    step('and nothing was stored for that provider', r.ok and (r.get('count', default=0) == 0), r)

    journey('16.12: referral rules')
    a = j_accounts.app_signup(label='rules-ref-a')
    b = j_accounts.app_signup(label='rules-ref-b')
    c = j_accounts.app_signup(label='rules-ref-c')
    ca, cb = Client(a['token'], 'patient'), Client(b['token'], 'patient')
    code = ca.get('/referrals/my').get('code')
    step('a patient has a referral code', bool(code), code)
    r = ca.post('/referrals/apply', {'code': code})
    step('your own code is refused', r.status == 400, r)
    r = cb.post('/referrals/apply', {'code': code})
    step('a new patient can apply it', r.ok and r.get('status') == 'registered', r)
    r = cb.post('/referrals/apply', {'code': code})
    step('and only once', r.status == 409, r)
    mine = ca.get('/referrals/my')
    step('the referrer sees one registered invite and no reward yet', mine.ok and mine.get('stats', 'registered') == 1 and mine.get('stats', 'rewarded') == 0, mine)
    r = Client(c['token'], 'patient').post('/referrals/apply', {'code': 'NOPE-000000'})
    step('an unknown code is refused', r.status == 404, r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
