"""Journey (QA D-04 runtime, insurance copay cap): the patient's card has a copay cap; the provider decides a copay percent
that would exceed it. The copay the patient pays must be the cap.
  - the admin publishes the scans; a radiology centre registers with a scan at a price over 800 SAR and accepts insurance for it;
  - the patient saves an insurance card: copay 20 %, cap 500 SAR (POST /insurance/save-policy);
  - the patient books the scan with insurance; the request is opened; the centre decides approve_partial with copay 70 %;
  - expected: the copay is min(70 % of the price, 500) = 500 (GET /insurance/requests/:id/capabilities and the stored copay_amount).
Known defect (docs/qa/findings/insurance-copay.md, INS-CAP-1): the decision path ignores the card's cap, so the copay is 70 % of the price.
This journey is kept out of the gate (tools/live/gate_skip.txt) until the owner decides the fix. A missing route is a FAIL, never a PASS."""
import uuid

from lib import Client, journey, step, summary


def main():
    import j_admin, j_radiology, j_onboarding, j_accounts, j_insurance
    admin, _ = j_admin.login()
    journey('copay cap D-04: the admin publishes scans and a centre registers and accepts insurance')
    j_radiology.admin_publishes_scans(admin)
    scans = Client(None, 'anon').get('/radiology/services').items()
    scan = next((x for x in scans if (x.get('price') or 0) >= 800), None)
    step('a scan priced 800 SAR or more is public', scan is not None, len(scans))
    if not scan:
        summary()
        return
    price = float(scan['price'])
    code = j_insurance.admin_adds_company(admin)
    comps = Client(None, 'anon').get('/insurance/companies').items()
    company = next((x for x in comps if x.get('code') == code), None)
    step('the new insurance company is listed for patients', company is not None, code)

    centre = j_onboarding.register_type('radiology', {
        'scan_prices': {scan['id']: str(int(price))},
        'scan_insurance_map': {scan['id']: True},
    }, step3_extra={'equipment_list': [scan['id']]})
    j_onboarding.admin_review(admin, centre)
    j_onboarding.provider_after_approval(centre)
    c = Client(centre['token'], 'radiology')
    if company:
        j_insurance.accept_insurance(c, company)
    centre_id = c.get('/provider/me').get('account', 'id')

    journey('copay cap D-04: the patient saves a card with a copay of 20 % and a cap of 500 SAR')
    acct = j_accounts.app_signup(label='copay-cap')
    pat = Client(acct['token'], 'patient')
    r = pat.post('/insurance/save-policy', {'company_id': code, 'policy_number': f'POL-{uuid.uuid4().hex[:8].upper()}',
                                             'class': 'A', 'copay_percent': 20, 'copay_cap_sar': 500})
    step('the card is saved with copay 20 % and cap 500 SAR', r.ok, r)

    journey('copay cap D-04: the patient books the scan with insurance; the centre decides 70 %')
    rb = pat.post('/radiology/bookings', {'service_id': scan['id'], 'scheduled_at': j_radiology.tomorrow_at(15),
                                          'location_type': 'facility', 'payment_method': 'insurance', 'provider_account_id': centre_id})
    bid = rb.get('id')
    step('the insurance booking is created', rb.ok and bid, rb)
    if not bid:
        summary()
        return
    rq = pat.post('/insurance/requests', {'booking_kind': 'radiology', 'booking_id': bid})
    rid = rq.get('id')
    step('the insurance request is opened', rq.ok and rid, rq)
    if not rid:
        summary()
        return
    d = c.post(f'/insurance/requests/{rid}/decide', {'decision': 'approve_partial', 'copay_percent': 70, 'approval_ref': f'APR-{rid[:8]}'})
    step('the centre decides approve_partial with copay 70 %', d.ok, d)

    expected = min(round(price * 0.70, 2), 500.0)
    cap = pat.get(f'/insurance/requests/{rid}/capabilities')
    amount = float(cap.get('amount') or 0) if cap.ok else None
    step(f'the copay the patient pays is the 500 SAR cap (expected {expected}, the 70 % amount is {round(price * 0.70, 2)})',
         amount == expected, f'capabilities amount {amount}')
    stored = pat.get(f'/insurance/requests/{rid}')
    step('the stored copay is the cap', float(stored.get('copay_amount') or 0) == expected, stored.get('copay_amount'))
    summary()


if __name__ == '__main__':
    main()
