# Provider AmbulanceRegistration: manual semantic review

Reviewed `src/screens/ambulance/AmbulanceRegistration.tsx`, lines 1–257.

| ID | evidence | defect / gap | closure requirement |
|---|---|---|---|
| P-AMB-012 | 72–95 | account-start failure falls back to login and advances; it can obscure which registration state actually exists | server must return an explicit resumable application state and never use login success as evidence that identity/application creation is valid |
| P-AMB-013 | 130–155 and 164–188 | MOH/CR, vehicle counts, crew, equipment, coverage and 24/7 assertions are input fields only | verify licenses, organization ownership, crew credentials, assets/equipment, operational capacity and service area server-side before approval/discoverability |
| P-AMB-014 | 197–235 | onboarding collects IBAN and payout identity and submits it with provider data without evidence of encryption/tokenization, ownership verification, financial consent or access segregation | use dedicated financial onboarding, server validation/verification, access controls/audit and payment-provider approved handling |
| P-AMB-015 | 229 | submit sends coordinates from an undeclared `data.location` fallbacking to `0,0` | confirmed invalid location fallback; require explicit consented geocoding/location selection and reject missing/invalid coordinates |
| P-AMB-016 | 206–228 | stages send overlapping facts with `accepts_cash`, empty insurance, and hardcoded 24/7 hours; no idempotency/retry transaction boundary shown | define one versioned onboarding state machine, transaction/replay behavior, insurance/payment/capability contracts and review state |
