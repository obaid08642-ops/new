# Store declarations — Apple privacy labels and Google Play Data safety

Phase 19, task 19.10. The store **submissions are the owner's**; this file is the implementer's
share: the data inventory the two declarations are filled from, so the answers are taken from the
code instead of guessed.

Source of truth: `docs/architecture/DATA_MAP.md` (review session). Everything below was read from
that map and from `package.json` on `main`; nothing here is invented. Where the code does not answer
a question the row says **unknown** and names what has to be checked — do not fill a store form with
a guess.

Apps covered:

| app | store ids / names |
|---|---|
| Nabd+ (patient) | patient-app, Expo/React Native |
| Nabd+ Business (provider) | provider-app, Expo/React Native |
| Nabd+ web | patient-web, Next.js — no store label, listed for completeness |

---

## 1. Apple — App Privacy (nutrition label)

Apple asks, per data type: is it **linked to the user**, is it used to **track** them, and what is it
used for. "Tracking" under Apple's App Tracking Transparency rules means linking data from the app
with third-party data for ad purposes or sharing it with a data broker. **Nabd+ runs no advertising
or marketing SDK** — see §3 — so nothing below is declared as tracking. Every "Tracking" cell is
`No`.

| Data type | Collected | Linked to user | Tracking | Purposes | Where it comes from |
|---|---|---|---|---|---|
| Contact info — name | Yes | Yes | No | App functionality, Analytics | `patient_profiles`, `provider_profiles` |
| Contact info — phone number | Yes | Yes | No | App functionality | auth/OTP, `users` |
| Contact info — email address | Yes | Yes | No | App functionality | `users`, mailer |
| Health & fitness — health records | Yes | Yes | No | App functionality | `medicalreports`, `consultation_notes`, `encounterrecords`, `medicalprofiles` |
| Health & fitness — workout / vitals | Yes | Yes | No | App functionality | vitals, wearables pairing, `monitoring` rows |
| Health & fitness — medications | Yes | Yes | No | App functionality | `prescriptions`, `medication_plans`, `medicationreminders` |
| Health & fitness — pregnancy / maternity | Yes | Yes | No | App functionality | `maternityprofiles`, `infantgrowthlogs` |
| Health & fitness — mental health entries | Yes | Yes | No | App functionality | `mood_entries` |
| Health & fitness — nutrition entries | Yes | Yes | No | App functionality | `nutrition_profiles` |
| Financial info — payment info | Yes | Yes | No | App functionality | `moyasar_payments`, `transactions`, `providerwithdrawals`, `wallet_transactions` |
| Financial info — insurance details | Yes | Yes | No | App functionality | `insurancedetails`, `insuranceresponses` |
| Financial info — credit score | No | — | — | — | not collected |
| Location — precise geolocation | Yes | Yes | No | App functionality | provider clinic `geo`, order delivery coordinates |
| Location — coarse geolocation | Yes | Yes | No | App functionality | city/district filters, pharmacy broadcast radius |
| Sensitive info — health (PDPL "sensitive") | Yes | Yes | No | App functionality | the health rows above; treated as sensitive under the Saudi PDPL |
| Contacts | Yes (family/emergency) | Yes | No | App functionality | family members, `emergency_requests` contacts |
| User content — photos or videos | Yes | Yes | No | App functionality | DATA_MAP §2.2 uploads 1–31 (avatars, prescriptions, reports, chat, evidence) |
| User content — customer support | Yes | Yes | No | App functionality | `supportrequests` (+ attachments) |
| User content — other in-app content | Yes | Yes | No | App functionality | `chat_messages`, article ratings, `reviews` |
| Browsing history / search history | Yes | Yes | No | App functionality | `search` queries, catalogue views |
| Identifiers — user ID | Yes | Yes | No | App functionality | internal `id` per collection |
| Identifiers — device ID | Yes | Yes | No | App functionality | push tokens (`pushtokens`) |
| Identifiers — national ID / iqama | Yes | Yes | No | App functionality | provider KYC, insurance eligibility |
| Purchases | Yes | Yes | No | App functionality | orders, bookings, loyalty points |
| Usage data — product interaction | Yes | Yes | No | Analytics, App functionality | Sentry breadcrumbs (see §3) |
| Usage data — advertising data | **No** | — | — | — | no ad SDK |
| Diagnostics — crash / performance | Yes | Yes | No | App functionality | Sentry (`@sentry/react-native`, `@sentry/nextjs`, `@sentry/nestjs`) |
| Other data collected | Yes | Yes | No | App functionality | provider licences/KYC, contracts, reports (§2.2 #3–#8, #13–#21) |

Notes for the owner:

- **Lab and radiology results are health data** (`labresults`, `labbookings`, `radiologybookings`,
  `orderresults`) and must be declared as Health & fitness / Sensitive info.
- **"Analytics" purpose is claimed only for Sentry-derived interaction data.** There is no product
  analytics SDK; if the owner wants usage analytics, that is a new vendor decision.
- If a vendor is added later (analytics, ads, attribution), this table and §3 must be updated **before**
  the next submission.

## 2. Google Play — Data safety form

Google's form asks: is the data **collected**, **shared** with third parties, is it **optional**,
is it **processed on device**, and can the user **request deletion**. The collecting/sharing/purpose
mapping is the same inventory as §1; the differences are below.

| Google category | Collected | Shared | Purpose | Optional | Deletion route |
|---|---|---|---|---|---|
| Personal info — name, phone, email | Yes | Yes — payment gateway, mail/SMS providers | App functionality, Communications | No | `DELETE /users/me`, admin user delete (DATA_MAP §4) |
| Personal info — address | Yes | Yes — couriers, nursing providers | App functionality | No | as above |
| Personal info — national ID / iqama | Yes | Yes — insurance and provider KYC review | App functionality, Legal/Compliance | No | as above |
| Financial info — payment details | Yes | Yes — **Moyasar** only | App functionality, Payments | No | payment records are **retained** by decision (DATA_MAP §4.4) |
| Health and fitness | Yes | Yes — the licensed provider the patient books | App functionality | No | as above |
| Messages — chat | Yes | No | App functionality | No | soft delete only (DATA_MAP §2.2 #22) |
| Photos and videos | Yes | Yes — Cloudinary / R2 storage, AI OCR | App functionality | No | **partial** — see the gaps below |
| Audio/Voice | **unknown** | — | — | — | LiveKit video consultations exist; whether any voice note is stored is **unknown** from DATA_MAP. Check before submitting. |
| Files and docs | Yes | Yes — storage back-ends, providers | App functionality | No | partial |
| App info and performance | Yes | Yes — Sentry | App functionality, Diagnostics | No | n/a |
| Device identifiers | Yes | Yes — Google FCM (push) | App functionality | No | with the account |

**Third-party sharing for payments and health data is inherent to the product** (the patient books a
provider who must see the details), so it must be declared as shared. Do not mark these "not shared".

### Google "data deletion" answer

A deletion path exists (`DELETE /users/me` → `pdpl.service.ts`, and an admin hard delete), but
DATA_MAP §4 records that the three deletion paths **disagree**: the patient's self-erasure hard-deletes
medical records and misses 21 of the 37 collections it names, and `invoices` / `orders` are never
anonymised. Declare a deletion request route (it exists), and treat the reconciliation as a known gap
(§4). Do not claim records are fully deleted on every path until that is fixed.

## 3. Third parties and processors

Declared vendors, from the code and `package.json`:

| Vendor | Category | Data | Source |
|---|---|---|---|
| **Moyasar** | Payment gateway | payment session, amount, reference — **never** card PAN/CVV | `modules/payments`, `paymob.service.ts` |
| **Cloudflare R2** (`S3_BUCKET`) | Object storage | uploads listed in DATA_MAP §2.2 | `modules/storage` |
| **Cloudinary** | Media storage | processed profile photos, private provider files (`authenticated`) | `modules/storage`, `provider-image-processor` |
| **AI providers**: Google Gemini, OpenAI, Groq, Cerebras, OpenRouter, DeepSeek, Qwen (Alibaba), Replicate | AI inference | prompt text sent for OCR, leaflets, report help | `modules/ai/ai-gateway.service.ts:6-7,42-46` |
| **Firebase Cloud Messaging** | Push | device push token | `provider-app` `@react-native-firebase/messaging`, backend `firebase-admin` |
| **Sentry** | Error/diagnostics | stack traces, breadcrumbs, performance | `@sentry/*` in all four packages |
| **LiveKit** | Video consultations | call media | video module |
| **Mail / SMS providers** | Transactional messages | recipient address/number, message body | `modules/mail`, `modules/notifications` |

**AI providers are the item to think hardest about.** Prescription OCR, medicine images and insurance
card images are forwarded to an external provider (§2.2 rows 15, 16, 28, 29). Phase 13 task `13.R21`
already requires stripping names, phone numbers and IDs before text is sent to a provider — until that
is implemented and verified, **health data leaves the Kingdom to whichever AI provider is enabled**. The
owner should confirm this is acceptable under the PDPL before launch (this is the same open question as
Phase 19.1 / decision 21).

## 4. Tracking statement

- **No advertising or marketing SDK** is installed in any of the four packages. Verified: no Google
  Analytics, Firebase Analytics, Mixpanel, Amplitude, PostHog, AppsFlyer, Adjust or Branch in any
  `package.json`.
- **No data broker**, and patient health data is never exposed to unauthenticated crawlers.
- Sentry receives error/diagnostic data; Firebase Messaging delivers push. Neither is used to build a
  cross-app advertising profile, so Apple's "tracking" answers are `No` across the board.

If a vendor that does track is ever added, the App Tracking Transparency prompt and both store forms
must be updated in the same change.

## 5. Known gaps the owner must decide before submitting

1. **Audio/voice data** — unknown whether any voice note is persisted. Check before the Google form.
2. **Deletion completeness** — the three erasure paths disagree (DATA_MAP §4). Google asks for a
   deletion route; one exists, but the answer should not claim every record is removed.
3. **Retention** — DATA_MAP §4 records no retention period in code except the `slotlocks` TTL, so
   "data is deleted after X" cannot be declared. Fix the retention rules first or leave the field empty.
4. **File hosting rule violations** — DATA_MAP §3 lists places that break the owner's storage rule
   (inline base64 in MongoDB, provider files on R2 instead of Cloudinary). Declarations should describe
   intended behaviour, but the code should be brought in line first.
5. **Huawei AppGallery** — `BLOCKED: owner decision on AppGallery`. A build without Google services must
   replace FCM (push), `react-native-maps` (Google Maps) and Google sign-in, all of which the two Expo
   apps depend on today (`patient-app/package.json`, `provider-app/package.json`). The owner must say
   whether an AppGallery listing is wanted before the work is scoped.