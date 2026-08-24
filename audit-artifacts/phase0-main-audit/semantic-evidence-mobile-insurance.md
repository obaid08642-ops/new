# Semantic evidence — Mobile Insurance

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/profile/insurance.tsx:21–51` loads `/users/me/insurance`; any error is converted to `insurance=null`, the same state used for “لا يوجد تأمين مضاف.” This conflates unavailable/unauthorized/server failure with a genuine empty account. The screen guards form opening for guests (`:53–59`) but the exact auth/ownership/error contract is not shown.

The add/update form loads `/insurance/companies` and `/insurance/companies/{id}/networks`, but all failures are silently converted to empty arrays (`:60–77`). Required validation only checks company and policy number (`:80–84`); member ID is optional and there is no visible format/checksum, date, document upload, identity verification, eligibility, preauthorization, approval status, or insurer response handling.

The save payload derives provider/provider_name from client catalog data, sends a fixed `class: "A"`, and POSTs `/users/me/insurance` without visible idempotency or re-authentication (`:85–99`). On success it sets `insurance` to `saved || payload` and displays “تم حفظ بطاقة التأمين وستتم مراجعتها للتفعيل” even when the server response is absent, making the local payload appear authoritative (`:100–104`).

Rendered policy fields use `---` placeholders for absent values (`:151–184`), and the only post-save action is “تحديث الوثيقة”; no delete, verification-status detail, expiration lifecycle, insurer eligibility check, claim/preauthorization flow, or checkout branch selection is present. No Phase 0 remediation was made.
