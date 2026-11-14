"""Journey: insurance per item (ordering model M5; ORDERING_UX_SPEC step 6).
  A lab contracts a company (M1), a patient with that policy books two insured tests at home with an uploaded doctor's
  request (M3); the booking waits as an estimate; only the booking's lab decides each item (POST /provider/ordering/bookings/:id/
  item-decisions); the patient reads the approval (GET /ordering/bookings/:id/approval) and answers a partial one
  (POST .../partial-choice). Checked on the real stack: another lab is refused, a decision is taken once, the home fee stays cash
  unless approved, a partial approval waits for the choice and 'covered only' drops the rejected test and recomputes the total."""
import uuid

from lib import Client, journey, step

LAT, LNG = 24.7, 46.7


def run():
    import j_admin, j_accounts, j_onboarding, j_insurance, j_lab, j_lab_preparation_langs as prep
    admin, _ = j_admin.login()
    tag = uuid.uuid4().hex[:6]
    code = j_insurance.admin_adds_company(admin)
    companies = admin.get('/insurance/companies/all')
    company = next((c for c in j_insurance.rows(companies) if c.get('code') == code), {})
    company_id = company.get('id') or company.get('_id')
    step('the company has an id', bool(company_id), company)
    r, t1 = prep.admin_test(admin, tag, 'Insured CBC', {})
    r2, t2 = prep.admin_test(admin, tag, 'Insured HbA1c', {})
    step('the admin publishes two tests', r.ok and r2.ok and t1 and t2, [r.body, r2.body])

    journey('insurance per item: the lab contracts the company and prices two tests')
    p = j_onboarding.register_type('lab', {'test_categories': [t1, t2]})
    j_onboarding.admin_review(admin, p)
    j_onboarding.provider_after_approval(p)
    lab = Client(p['token'], 'lab')
    other_p = j_onboarding.register_type('lab', {'test_categories': [t1, t2]})
    j_onboarding.admin_review(admin, other_p)
    j_onboarding.provider_after_approval(other_p)
    other = Client(other_p['token'], 'lab')
    r = lab.put('/provider/ordering/settings', {'modes': ['home'], 'home_fee': 30, 'home_radius_km': 20, 'auto_accept': False,
                                                'accepted_insurance': [{'company_id': company_id, 'classes': ['A'], 'active': True}]})
    step('the lab declares home visits and the contracted company and class', r.ok, r)
    for t, price in ((t1, 60), (t2, 90)):
        r = lab.put('/provider/ordering/items', {'service_kind': 'lab', 'catalog_id': t, 'prices': {'home': price}})
        step('the lab prices a test for home', r.ok, r)

    journey('insurance per item: the patient books insured and waits for the lab')
    pat = Client(j_accounts.app_signup(label='ins-item-patient')['token'], 'patient')
    r = pat.post('/users/me/insurance', {'provider': company_id, 'class': 'A', 'policy_number': 'P-' + tag})
    step('the patient saves the policy with its class', r.ok, r)

    def book():
        q = pat.post('/ordering/quote', {'service_kind': 'lab', 'items': [t1, t2], 'context': {'mode': 'home', 'lat': LAT, 'lng': LNG, 'payer': 'insurance'}})
        b = pat.post('/ordering/bookings', {'quote_id': q.get('quote_id'), 'selections': {'home': {'provider_id': (q.get('best_match') or {}).get('provider_id'), 'window': {'asap': True}}},
                                            'payment_method': 'insurance', 'documents': j_lab.home_insurance_proof()})
        return q, b

    q, b = book()
    step('the quote is an estimate and the lab is in network', q.ok and q.get('estimate') is True and (q.get('best_match') or {}).get('provider_id'), q)
    bk = (b.get('bookings') or [{}])[0]
    step('the insured home booking waits for approval and says estimate', b.status == 201 and bk.get('status') == 'awaiting_approval' and bk.get('estimate') is True, b)
    bid = bk.get('id')
    a = pat.get(f'/ordering/bookings/{bid}/approval')
    step('the approval is pending with the home fee as cash', a.ok and a.get('status') == 'pending' and a.get('final') is False and (a.get('home_fee') or {}).get('covered') is False, a)

    journey('insurance per item: only the booking\'s lab decides')
    body = {'decisions': [{'catalog_id': t1, 'decision': 'approved', 'patient_share': 10}, {'catalog_id': t2, 'decision': 'rejected'}]}
    r = other.post(f'/provider/ordering/bookings/{bid}/item-decisions', body)
    step('another lab is refused', r.status in (403, 404), r)
    r = pat.post(f'/provider/ordering/bookings/{bid}/item-decisions', body)
    step('the patient cannot decide', r.status == 403, r)
    r = lab.post(f'/provider/ordering/bookings/{bid}/item-decisions', body)
    step('the lab approves one test and rejects the other', r.ok and r.get('status') == 'partial', r)
    r = lab.post(f'/provider/ordering/bookings/{bid}/item-decisions', body)
    step('a second decision is refused (409)', r.status == 409, r)
    a = pat.get(f'/ordering/bookings/{bid}/approval')
    step('the patient sees a partial approval waiting for a choice, the rejected test at its cash price',
         a.ok and a.get('status') == 'partial' and a.get('final') is False and 'covered_only' in (a.get('choices') or [])
         and next((i for i in a.get('items') or [] if i.get('catalog_id') == t2), {}).get('patient_share') == 90, a)
    r = pat.post(f'/ordering/bookings/{bid}/partial-choice', {'choice': 'covered_only'})
    step('"covered only" is accepted', r.ok, r)
    a = pat.get(f'/ordering/bookings/{bid}/approval')
    step('the rejected test is gone and the total is the share plus the home fee (10 + 30)', a.ok and [i.get('catalog_id') for i in a.get('items') or []] == [t1] and a.get('patient_share_total') == 40, a)
    r = pat.post(f'/ordering/bookings/{bid}/partial-choice', {'choice': 'cancel_free'})
    step('a second choice is refused (409)', r.status == 409, r)
    r = pat.get(f'/labs/bookings/{bid}')
    step('the booking no longer carries the rejected test', r.ok and t2 not in str(r.get('items')), r)

    journey('insurance per item: all approved, home fee approved')
    q, b = book()
    bid2 = ((b.get('bookings') or [{}])[0]).get('id')
    r = lab.post(f'/provider/ordering/bookings/{bid2}/item-decisions', {'decisions': [{'catalog_id': t1, 'decision': 'approved', 'patient_share': 10}, {'catalog_id': t2, 'decision': 'approved', 'patient_share': 14}], 'home_fee_approved': True})
    step('the lab approves both and the home fee', r.ok and r.get('status') == 'approved', r)
    a = pat.get(f'/ordering/bookings/{bid2}/approval')
    step('the final share is 24 with no home fee', a.ok and a.get('final') is True and a.get('patient_share_total') == 24, a)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
