# Provider RadiologyRegistration: manual semantic review

## Scope

تمت قراءة `src/screens/radiology/RadiologyRegistration.tsx` كاملًا، lines 1–1859، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. هو implementation مستقل، لا wrapper؛ لذلك سُجل منفصلًا رغم تشابهه الكبير مع `LabRegistration.tsx`.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-RREG-001 | 32–36, 115–136, 204–209 | metadata/comments/text are copied incorrectly: lab option English is `Radiology`, both is `Radiology + Radiology`, and navigator is labeled LAB registration | remove copy-paste identity errors; one radiology-specific onboarding taxonomy and approved provider type |
| P-RREG-002 | 179–201, 577–601 | account is created/logged in before KYC; location step repeats start/login and fallback login continues | server-owned pending application that cannot access operations/PHI until verified; idempotent workflow state |
| P-RREG-003 | 162–175, 269–284, 338–359 | technical officer license is not mandatory/verified; radiation safety/equipment are free fields using `as any` and no radiologist/technologist/equipment credential model exists | verified RSO, equipment registration, modality-specific licensed staff and center branch scope before service approval |
| P-RREG-004 | 362–459, 443–452, 510–550 | files accept `*/*`, compulsory cards are not validation gates, uploads force image MIME, and radiation-license document upload is commented out | mandatory typed/inspected MOH/RSO/equipment documents with verified registry links and immutable evidence metadata |
| P-RREG-005 | 667–760, 833–1118, 1640–1661 | copied home **sample collection** semantics, client-defined radius/fee/gender/collector count, catalog prices and test fields; not a radiology resource/home imaging capability model | genuine mobile imaging eligibility (portable modality, patient safety, radiographer/equipment/transport availability, service area) plus approved catalog/rate policy |
| P-RREG-006 | 1291–1523, 1575–1596 | schedule has no resource/time validation and evening-only inconsistency; insurer/plans are self selected but final payload retains only company IDs | machine/room/radiographer slot capacity and insurer network/plan source-of-truth, not client claims |
| P-RREG-007 | 1606–1610, 1617–1687 | OTP modal is opened after a failed send too; documents re-upload as PDFs, `step3` then `step2` twice then broad submit have no idempotency/atomicity proof | purpose-bound OTP, one atomic/idempotent submit with allowlisted fields, secure document storage and application revision/audit |
| P-RREG-008 | 1670–1687, 1752–1808 | bank, signer role and signature are unverified client claims; local agreement is separate from declared `termsAgreed` | bank ownership/signer authority/legal version verification and payout/activation hold until admin approval |
| P-RREG-009 | 1810–1830 vs 1541–1546 | pending-review copy says account starts receiving requests and can update catalog/prices immediately, contradicting admin approval warning | truthful `PENDING_REVIEW` lifecycle: no bookings, no public catalog, no payout before verified activation |

## Cross-journey conclusion

Radiology registration is a duplicated, partly relabeled Lab wizard rather than a safe radiology onboarding flow. It does not verify radiology equipment, radiation safety, radiologist/technologist credentials, secure PACS readiness, mobile imaging capacity, insurer contracts, or legal/payout entitlement. The source is a confirmed production blocker.
