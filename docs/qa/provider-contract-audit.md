# Provider contract and its PDF: audit (owner item, 2026-11-01)

Code read end to end: `backend/src/modules/provider-onboarding/contract-pdf.service.ts`, `provider-onboarding.module.ts` (submit, `provider_contracts`, the three contract routes), `backend/src/modules/legal/legal.module.ts` (policies, acceptance, pending), `legal-enterprise.service.ts` (acceptance archive), provider-app `ContractModal.tsx`, `ReviewStep.tsx`, `RegistrationSuccess.tsx`, admin `ProviderFullDetail.tsx`.
A sample contract was generated with the real service and rasterised to check the Arabic by eye (nothing was run on a live stack or a device). Status: **OK** = works as the owner asked; **fixed** = client fix in this PR; **backend gap** = listed with file:line, not changed here.

## 1. Contract text

| Question | Finding | Status |
|---|---|---|
| Which text is shown to the provider? | The modal asks `GET /legal/policy/provider_agreement?lang=` (versioned, admin-edited, ar/en). When that answered nothing the old modal showed a hard-coded 5-article text of its own, in the app. | **fixed**: the modal shows only the server text; a failed or empty load says so and offers a retry, with no agree path |
| Is the text versioned and admin-editable? | Yes: `legal_policies` with version, effective date, change log; `PUT /admin/legal/policy/:key` (`legal.module.ts:184`), minor edit = new minor version, `major: true` = new major that must be accepted again (`legal.module.ts:85-88`). | OK |
| Is the policy published? | Nothing in the repo or the live seed publishes `provider_agreement` (`tools/live/seed_legal.py` seeds the patient policies only; the text exists as `docs/legal/03_PROVIDER_AGREEMENT.ar.md`). On a database where an admin has not published it, every provider saw the fallback. | **backend gap 1** |
| Is the text the same as what is signed in the PDF? | **No.** The PDF prints 11 terms written in `contract-pdf.service.ts:212-225`; the app showed the policy text (or its own 5-article fallback). Three different texts exist. | **backend gap 2** (the app now shows the policy; the PDF still prints its own) |
| Per provider type? | No. One `provider_agreement` key for all types; the PDF only inserts the type name in one sentence (`contract-pdf.service.ts:199`). `applies_to` knows `patient`/`provider`, not a type (`legal.module.ts:134-139`). | **backend gap 3** |
| Arabic and English? | The policy has `content_ar` and `content_en` and the app asks for its language: OK for the screen. The PDF is Arabic only (one English title line, which renders as empty boxes, see 3). | screen OK; PDF **backend gap 4** |

## 2. Signing

| Question | Finding | Status |
|---|---|---|
| Read to the end | The old "I Agree" was always enabled. | **fixed**: "I Agree" stays off until the text is scrolled to the end (a text shorter than the window counts as read) and says why |
| Explicit accept | Pressing "I Agree" posted `/legal/accept/provider_agreement` and swallowed every error, then closed: an acceptance could be lost silently, and the registration did not require it. | **fixed**: the error is shown and the modal stays open; the version the server recorded comes back to the registration; sending the code is refused (and the contract opened) until a version was accepted |
| Drawn signature, scanned before use | Drawn on a canvas, uploaded to storage, embedded only when the stored object is servable (`contract-pdf.service.ts:115`, quarantine and infected files are never embedded). | OK |
| Signature scan still pending | When the scan is deferred the signature is not embedded and the PDF is stored anyway with "(no electronic signature attached)" (`contract-pdf.service.ts:115,249`). The provider sees "submitted" and the admin gets an unsigned "signed contract". | **backend gap 5** |
| Name, time, IP, device | `legal_acceptances` records user, policy key, **version**, time, device id, IP, platform, user agent for the acceptance (`legal.module.ts:97-112`), plus an audit row. The signer name and role are stored in `provider_contracts` (`provider-onboarding.module.ts:337-338`) but the contract document itself has no IP, device or acceptance link. | acceptance record OK; link to the contract **backend gap 6** |
| Contract version signed | Recorded with the acceptance (above). Not stored on the contract row and not printed on the PDF. | **backend gap 6** |
| New version requires a re-sign | The server lists what is pending and a new major version is pending again (`legal.module.ts:124-141`). The provider app never asked (`/legal/pending` was not called anywhere). | **fixed**: a logged-in provider whose agreement is pending gets the contract with no close button until it is accepted |
| Server enforces the re-sign | Nothing stops a provider with a pending major version from using the API; and submit does not check that the acceptance exists (`provider-onboarding.module.ts:272`). | **backend gap 7** |

## 3. PDF (generated with the real service, rasterised and looked at)

| Question | Finding | Status |
|---|---|---|
| Arabic font and shaping | Amiri (regular) or Noto Naskh (bold) is registered (`contract-pdf.service.ts:170-175`), letters join correctly. Defects seen: (a) `ar()` reverses the word order of a whole paragraph **before** pdfkit wraps it (`:22-24,226`), so each wrapped paragraph reads from its last line to its first and the number "1." lands at the end; (b) brackets are mirrored wrongly ("(…" at the end of the line); (c) the English title line and the dash print as empty boxes (Latin and "—" are missing from the Arabic font, `:182-184`); (d) in the bold font the brackets around "(المزود)" print as boxes (`:237`); (e) word gaps in headings are tight. | **backend gap 8** |
| Carries the contract text | The 11 hard-coded terms only (gap 2). | **backend gap 2** |
| Both parties | Platform and provider, with licence, CR, city, email, phone: yes. | OK |
| Signature image | Embedded when servable (gap 5 when not). | OK / gap 5 |
| Date | The date is `new Date()` of the moment of generation (`:188`), not the moment of acceptance; a contract rebuilt on demand (`ensureContract`, `provider-onboarding.module.ts:355`) is dated that day. | **backend gap 6** |
| Version | Not printed. | **backend gap 6** |
| Stored with a hash, cannot change | The "SHA-256" is a 24-character prefix of a hash of the bytes written **before** `doc.end()` plus the profile id (`:262-263`): not the hash of the stored file, so nobody can verify the file with it. The row is written with `updateOne … $set pdf_base64` (`provider-onboarding.module.ts:333-345`): every re-submission overwrites the previous signed PDF, there is no history, nothing is immutable. | **backend gap 9** |

## 4. Access

| Question | Finding | Status |
|---|---|---|
| Provider can view their signed PDF | Only a one-time "download" on the success screen after registering. After that nothing in the app reached `GET /provider-onboarding/contract`. | **fixed**: a "Signed partnership contract" row in the settings of doctor, lab, nursing, pharmacy (system settings card), radiology and facility opens the contract: signing date, document fingerprint, download; 403 and 404 each say what they mean |
| Download | Android: folder picker; iOS: written to the app's documents folder with no way to open it. | **fixed** (shared helper, one file name per document) |
| Share | No share anywhere. Android's built-in share carries text only; sharing a file needs `expo-sharing`, which is not installed. | iOS **fixed** (a Share button opens the share sheet with the saved file); Android: a message says to share it from the files app; adding the module is a native rebuild: **backend gap 10** (client dependency, listed here for the lead) |
| In-app viewer | There is no PDF viewer module in the app. | **backend gap 10** |
| Admin sees it on the provider's page | `ProviderFullDetail` had a download button and showed the fingerprint and the "share with provider" switch only **after** the first download. | **fixed**: "View contract" opens it in a tab; the signing date and signer show with the fingerprint after the first fetch. The page cannot show them before the PDF is fetched because the route returns the whole PDF: **backend gap 11** (a metadata-only route) |
| Admin can hide it from the provider | `visible_to_provider` defaults to true but an admin can switch it off, and then the provider gets 403 on their own signed contract (`provider-onboarding.module.ts:375`). The owner's rule is that the provider can always view it. | **backend gap 12** (remove the switch) |
| A copy is emailed after signing | Nothing sends one: no mail call in submit or in `generateAndStoreContract`. `MailService.sendViaSes` takes an attachment but turns its content into a UTF-8 string (`mail.module.ts:331`), which corrupts a PDF; `ProviderMailerService`'s `NodemailerAdapter.send` has no attachment at all (`provider-mailer.service.ts:56-62`). | **backend gap 13** |
| The acceptance certificate PDF | `legal/archive/:id/pdf` and `legal/policy/:key/pdf` are built by `buildPdf`, which replaces every non-ASCII character with a space (`legal-enterprise.service.ts:57`): an Arabic acceptance certificate is blank. | **backend gap 14** |

## Backend gaps (one line each, nothing changed here)

1. `tools/live/seed_legal.py` and the production seed do not publish `provider_agreement` (text exists in `docs/legal/03_PROVIDER_AGREEMENT.ar.md`); until an admin does, `GET /legal/policy/provider_agreement` answers `null`.
2. `contract-pdf.service.ts:212-226` prints 11 hard-coded Arabic terms instead of the policy text the provider read and accepted. **FIXED `fdb7f5c9f` (integrity PR):** the PDF prints the policy text and version recorded in the provider's acceptance (exact text kept in `legal_policy_snapshots`); the 11 built-in terms are gone.
3. `legal.module.ts:134-139` and the single key: no per-type agreement (doctor, lab, pharmacy, nursing, radiology, facility); `contract-pdf.service.ts:199` only names the type.
4. `contract-pdf.service.ts:182-184` the PDF has no English text (and the English title prints as boxes).
5. `contract-pdf.service.ts:115,247-250` a signature still being scanned is left out and the PDF is stored as the signed contract; generation should wait for the scan or fail so the provider signs again. **FIXED `fdb7f5c9f`:** a signature still being scanned stops the submit with 423 `signature_pending_scan` (nothing saved); infected or missing is 400 `signature_unusable`; no contract exists without a clean signature.
6. `provider-onboarding.module.ts:316-350` the contract row stores no policy version, acceptance time, IP, device or link to the `legal_acceptances` row, and the PDF prints neither the version nor the acceptance time (`contract-pdf.service.ts:188` prints the generation date). **FIXED `fdb7f5c9f`:** the contract row stores policy key/version/text hashes, the acceptance id, time, IP and device and the signing time; the PDF prints the acceptance (time, IP, device, version) and the signing date and time.
7. `provider-onboarding.module.ts:272` submit does not require an acceptance of the current agreement; nothing server-side blocks a provider whose major version is pending. **FIXED `fdb7f5c9f`:** `ProviderAgreementGuard` refuses every /provider/ call of a provider whose accepted version has an older major with 403 `provider_agreement_required`; submit needs a published agreement and an acceptance (409 `provider_agreement_not_accepted`, 400 `provider_agreement_not_published`). The app opens the contract on that code.
8. `contract-pdf.service.ts:22-24,226` word-reversal before wrapping breaks paragraph and bracket order; `:184,237` Latin text, "—" and brackets in the bold face print as boxes. A real bidi step (wrap in logical order, then reorder each line) and a font with Latin glyphs are needed. **FIXED `fdb7f5c9f`:** the PDF uses the shared `pdf-bidi` helper (copied unchanged from #2362) with Noto Naskh, wraps in reading order, aligns the baselines of Arabic and Latin pieces; rendered and checked by eye.
9. `contract-pdf.service.ts:262-263,270` the stored `sha256` is not the hash of the stored bytes; `provider-onboarding.module.ts:333-345` each submit overwrites the signed PDF: store the full SHA-256 of the final bytes, keep every signed version append-only (new row or object), and refuse to change a stored one. **FIXED `fdb7f5c9f`:** the stored `sha256` is the full SHA-256 of the final bytes; `provider_contracts` is insert-only: a re-submit adds version N+1, nothing stored is rewritten.
10. Client dependency: viewing a PDF in the app and sharing a file on Android need `expo-sharing` (and a viewer such as `expo-print`/a PDF view); both mean a native rebuild.
11. `provider-onboarding.module.ts:576-581` no metadata-only admin route: the page has to fetch the whole PDF to show the date, signer and fingerprint.
12. `provider-onboarding.module.ts:375,584-590` the admin "visible to provider" switch can hide the signed contract from its own signer.
13. `provider-onboarding.module.ts:300-306` no email after signing; `mail.module.ts:331` converts attachment content to UTF-8 (a PDF breaks) and `provider-mailer.service.ts:56-62` has no attachment field.
14. `legal-enterprise.service.ts:57` the acceptance certificate PDF strips every non-ASCII character, so an Arabic certificate is empty. **FIXED `fdb7f5c9f`:** the acceptance certificate and the policy PDF go through the same writer (Arabic kept, long text paginated).

## What changed in this PR (client only)

provider-app: `ContractModal` (server text only, retry, read-to-the-end, accept errors, version and date, no raw colours, all text from the ar/en files), `ContractGate` (re-accept when a new major version is pending), `MyContractRow` in six settings screens, `ReviewStep` (contract must be accepted before the code is sent), `RegistrationSuccess` (shared file helper), `utils/contractFile.ts`. admin: `ProviderFullDetail` (view the PDF, signing date and signer). Tests: `ContractModal.test.tsx` (9), `contractFile.test.ts` (4).
