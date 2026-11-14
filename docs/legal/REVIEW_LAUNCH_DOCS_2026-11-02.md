# Review of the launch legal texts: patient terms, privacy policy, telehealth consent, refund policy (2026-11-02)

> The four texts (Arabic prevails, English alongside) are final wording for publication, as the owner decided. **A licensed Saudi lawyer should still review them.** Several legal points below are **unverified**: they come from secondary sources or from the code, not from the official Arabic texts.

Companion to `REVIEW_2026-11-01.md` (the provider agreement). Same approach: platform name "منصة نبض الطبية"; commercial registration, VAT number and address written as "as registered with the competent authorities and shown on the Platform"; no blank `[ ]` left (the publish tool refuses a text with one, or with the word "draft").

## 1. URGENT: publishing one policy alone blocks patient registration

Both patient clients ask `GET /legal/policies` before registering:
- `patient-app/src/auth/patientAuth.ts` (`currentConsents`) and `patient-web/app/api/auth/register/route.ts`.
- No policy at all: they send a `v1` fallback and the backend skips the check.
- **Some policy present, but no `patient_terms` / `privacy_policy` with `requires_acceptance` not false: both return `null` and registration fails** (`registration_policy_configuration_missing`; the web route answers HTTP 503).

So publishing `provider_agreement` into an empty `legal_policies` (run 86) makes **new patient registration fail in the app and on the web** until the two patient texts are published. The tool therefore **refuses any run that would leave that state** (`ALLOW_REGISTRATION_BLOCK=yes` overrides it), publishes in a safe order (privacy policy, patient terms, telehealth consent, refund policy, and the provider agreement last), and checks every selected text before the first write. Existing patients are not affected by this: no patient client calls `GET /legal/pending`.

## 2. Which client screen requires acceptance of which key

| Key | Required by | What happens when it is published | Locks anyone out? |
|---|---|---|---|
| `patient_terms`, `privacy_policy` | **Sign-up only**: patient app `registerPatient` and web `register-form.tsx` -> `api/auth/register`; the backend (`auth.service.ts` `enforceSignupConsents`) needs the **exact current version** of both | New sign-ups send the version read live from `/legal/policies`; a later version bump needs no client change. Existing patients are never asked again (no patient client reads `/legal/pending`). Read-only views: `AboutView`, `LegalKit` (app), policy pages (web) | **No** for existing patients. New sign-ups fail if only one of the two is published, or either has `requires_acceptance: false` (section 1) |
| `telehealth_consent` | **First video booking**: `appointments.service.ts` `create` (video) answers 400 `telehealth_consent_required`; app `BookingConfirmForm` + `TelehealthConsentSheet`; web `appointment-booking-form`, `booking-flow`, and **joining a call** `call-token-launcher` (`livekit.service.ts` also refuses the patient side until accepted) | Every patient accepts once, at their next video booking. Published with `requires_acceptance: true` (with false the backend treats it as "nothing to accept" and the consent is never asked) | **Partly: a patient who already has a video appointment booked and has not accepted cannot join the call from the patient APP** (the app asks for consent at booking only, not at call join; the web asks at both). Publish `telehealth_consent` when no such appointment is near, or leave it out of `POLICIES` and publish it with the app fix |
| `refund_policy` | Nothing: display only (`AboutView`, the invoice footer link `/ar/refund-policy`); shown before payment | Published with `requires_acceptance: false` | No |
| `provider_agreement` | Providers: `provider-app` `ContractGate`/`ContractModal` (`GET /legal/pending`), `ProviderAgreementGuard` (#2364), registration submit | `REQUIRE_ACCEPTANCE=no` (default in `99p`): nobody is locked out, new registrations accept before submitting. With `yes`: every provider gets 403 `provider_agreement_required` until they accept | Only with `REQUIRE_ACCEPTANCE=yes` |

The refund policy text in `legal_policies` is separate from the **numbers** the system applies (`system_configs { key: 'refund_policy' }`, defaults in `backend/src/modules/refund-policy/refund-policy.defaults.ts`). If the admin changes the numbers, the published text must be updated by hand; the policy says the numbers shown at payment apply.

## 3. Consistency checks

| Point | Where | Result |
|---|---|---|
| Refund numbers | code defaults: consultation full refund from 2 h, 50 % late, 0 % no-show, 1 free reschedule at 2 h or more, home-visit trip fee SAR 40, pharmacy delivery fee refunded before dispatch | The refund policy and patient terms 8 state exactly these; a spec in `publish-legal-policy.spec.ts` fails if the repository text drifts from the 2 h / 50 % / SAR 40 figures |
| VAT model A | provider is the supplier; invoice in the provider's name issued by the platform; platform VAT on its own fees only | Patient terms 7.2 and the provider agreement 5.6 say the same. **The invoice code (#2362) still names the platform as issuer**, so the patient-facing text is ahead of the code until the Model A changes in `REVIEW_2026-11-01.md` section 5 are made |
| Provider agreement | data roles, breach notice, courts of Riyadh, 30-day notice of amendments | Same roles in the privacy policy section 1 (provider = controller of the medical record; platform = processor of hosted health content); same court; same notice |
| Insurance | patient terms 6, privacy 4.2, refund policy | Same: the facility, not the platform, deals with the insurer (NPHIES) |
| Telehealth | consent text vs patient terms 4 and agreement Annex B | Same: recording only with separate consent, 997 for emergencies |
| Arabic prevails | all | Stated in every text that is translated |

## 4. Sources and what was verified

| Source | Used for | Verification |
|---|---|---|
| Electronic Transactions Law (M/18, 1428H), Arts 5, 9, 14 | electronic acceptance has the effect of a signature (patient terms 13.1) | **Read** in the MISA English translation |
| E-Commerce Law (M/126, 1440H), Arts 8, 9, 13 | itemised invoice; 7-day withdrawal for a service not yet used, the consumer bearing the cost unless agreed (refund policy, patient terms 8.3) | **Read** in the MISA English translation; the Executive Regulations were not read |
| Personal Data Protection Law and regulations | roles, sensitive health data needs explicit consent, 72 h breach notice to SDAIA, 30-day reply to requests, cross-border safeguards | **Secondary sources only** (Clyde & Co); **no article numbers verified**; a 2026 draft amendment to the regulations (data localisation, lower breach threshold) was seen only in a search summary: check its status |
| Ministry of Health and SFDA rules | health records retention, medicine returns | Not read; the texts refer to "the period the rules require" and give no number |
| `refund-policy.defaults.ts`, `commission-defaults.ts`, `auth.service.ts`, `appointments.service.ts`, `livekit.service.ts`, the patient clients | figures and the acceptance matrix | **Read in the repository** |

## 5. Where this repository contradicts a statement the old drafts made (fixed, but decide)

- **"Data is hosted inside the Kingdom."** The old privacy policy said so. **Nothing in the repository supports it**: `docs/ops/SERVER_MOVE.md` says production runs on OVH in Europe (a Gulf region is only an option) and that where the server and buckets are is "for counsel". The final text therefore says data **may** be hosted inside or outside the Kingdom and that any transfer outside needs the risk assessment and a safeguard from the transfer regulation, plus the Ministry of Health's rules for health data. **Whether keeping health data on a European host is lawful today is the biggest open legal question in this set**; the lawyer must answer it before launch, and if the answer is no the host has to move, not the sentence.
- The old telehealth text ended with a checkbox line `[ ] أوافق`. It is replaced by a sentence about the consent button; acceptance is recorded by the app/web (version, time, device).

## 6. Choices made here, not from the owner or the code (the owner may change them)

Complaints answered within 5 working days; security logs kept 12 months; account data deleted or anonymised within 30 days of a request; requests answered within 30 days; material changes notified 30 days ahead; health records and invoices kept "for the statutory period" (no number); support by the e-mail and phone shown on the Platform (no figure written); the data protection officer reachable from the settings "Privacy and data" section (no name written).

## 7. Publishing

`backend/src/scripts/publish-legal-policy.ts` (dry run by default, `APPLY=yes` publishes), run on production by `tools/ops/tasks/99p-publish-agreement.sh` (`POLICIES="all"` by default). Per key: back up the existing row to `legal_policy_backups`, write the PUBLISHED row (effective date = the publish date, change-log line) and the immutable `legal_policy_snapshots` copy, refuse a version that is not higher than the published one. Fixed values: `privacy_policy`, `patient_terms`, `telehealth_consent` with acceptance required (the clients depend on it), `refund_policy` without, `provider_agreement` per `REQUIRE_ACCEPTANCE`.
