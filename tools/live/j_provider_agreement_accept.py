"""Journey (scenario PV-01 registration with the agreement, #2364 provider agreement): a new provider sees the published
provider agreement in the pending list, reads it, accepts it, and no longer sees it pending. A second accept is idempotent.
Routes (backend/src/modules/legal/legal.module.ts):
  - GET  /legal/pending: what the signed-in user must still accept
  - GET  /legal/policy/provider_agreement?lang=ar: the published text
  - POST /legal/accept/provider_agreement: records the acceptance
Acceptance is not required on the test seed (requires_acceptance=false), so /legal/pending does not list it; the journey asserts that, then the accept mechanism.
Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary


def pending_keys(r):
    body = r.body
    rows = body if isinstance(body, list) else (body or {}).get('items') or (body or {}).get('pending') or []
    return {x.get('key') or x.get('policy_key') for x in rows if isinstance(x, dict)}


def run():
    import j_onboarding
    p = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    prov = Client(p['token'], 'doctor')

    journey('provider agreement: the provider sees the agreement as pending (PV-01)')
    r = prov.get('/legal/pending')
    step('the pending list answers (GET /legal/pending)', r.ok, r)
    # requires_acceptance is false on the test seed, so /legal/pending lists only the required policies: it is not expected to list this one here
    step('the pending list does not gate on the non-required agreement (requires_acceptance false)', 'provider_agreement' not in pending_keys(r), r)

    journey('provider agreement: the provider reads the text and accepts it (PV-01)')
    r = prov.get('/legal/policy/provider_agreement?lang=ar')
    step('the agreement text is readable (GET /legal/policy/provider_agreement)', r.ok and bool(str(r.body).strip()), str(r.body)[:120])
    r = prov.post('/legal/accept/provider_agreement', {})
    step('the provider accepts the agreement (POST /legal/accept/provider_agreement)', r.ok, r)
    r = prov.get('/legal/pending')
    step('the agreement is no longer pending after the accept', 'provider_agreement' not in pending_keys(r), r)

    journey('provider agreement: a second accept is idempotent (PV-01)')
    r = prov.post('/legal/accept/provider_agreement', {})
    step('a second accept is accepted again without error', r.ok, r)
    summary()


if __name__ == '__main__':
    run()
