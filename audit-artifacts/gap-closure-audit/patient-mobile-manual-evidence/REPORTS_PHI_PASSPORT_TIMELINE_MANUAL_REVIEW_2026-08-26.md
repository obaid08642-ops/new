# Patient Mobile: Reports, health passport and PHI sharing — manual review

## Scope boundary

This read-only review covers all five Reports inventory routes. It does not establish report/passport ownership, QR token cryptography or verification, patient consent, recipient identity, medical-record completeness, share/export retention, downloadable document integrity, clinical validity, or backend authorization.

| Reviewed source | Scope |
|---|---|
| `app/reports/hub.tsx` | Report index/filter and AI-analysis CTA |
| `app/reports/view-report.tsx` | Report detail and native share |
| `app/reports/timeline.tsx` | Medical timeline and PDF-download CTA |
| `app/reports/passport.tsx` | Health passport, QR token and PHI share |
| `app/reports/ai-analysis.tsx` | Redirect/deferred AI analysis |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-REP-001 | `STATIC_MATCHED_PARTIAL` | `reports/hub.tsx:32–44, 68–89, 172–260`; `reports/view-report.tsx:62–95, 115–249` | Hub and detail fetch real-looking report paths and present honest empty/error states, but classify types locally by linkage fields, consume unvalidated route IDs, and share summary/diagnosis/recommendations through native sharing with no recipient confirmation/minimum-necessary selection/audit. Static source cannot prove ownership, report integrity, marking read, download scope or permission enforcement. | Report/access controller and audit contract; owner/family/provider scope tests; recipient/consent/minimum-necessary share workflow; signed document/download/view evidence. |
| PM-REP-002 | `CONFIRMED_DEFECT` | `reports/timeline.tsx:40–63, 123–225` | Timeline “download PDF” CTA only shows a local alert saying download is in progress. It neither requests nor receives a document and therefore falsely represents a report-download action. | Signed/export endpoint, authorization/audit, native file handling and accurate success/failure/progress state. |
| PM-REP-003 | `CONFIRMED_DEFECT` | `reports/passport.tsx:37–55, 90–123, 126–274` | Passport shares name, blood type and allergies as plaintext through native Share, while the QR surface only renders opaque token metadata. The screen claims secure sharing but no recipient authorization/consent/audit/revocation is visible. Emergency-contact tap opens a local confirmation alert without initiating a call. Age/gender are locally derived/defaulted. | Passport token issuer/verifier/expiry/revocation/audit; recipient consent/identity and PHI-minimization policy; real emergency-call outcome; healthcare profile owner/version/freshness evidence. |
| PM-REP-004 | `MISSING_CAPABILITY` | `reports/ai-analysis.tsx:1–6`; `reports/hub.tsx:244–256`; `reports/view-report.tsx:242–248` | AI analysis CTAs are exposed in hub/detail but the destination explicitly redirects because clinical interpretation is unavailable. The feature is not implemented despite its visible discovery CTA. | Hide/label as unavailable or implement only after clinically governed report-interpretation, consent, provenance, escalation and safety validation. |

## Conclusion

The Reports sources can list and render PHI but do not establish a production-grade medical-record access or sharing model. They contain confirmed local-only download and contact actions and expose an unavailable AI-analysis CTA. Manual source review is complete only for these five inventory paths.
