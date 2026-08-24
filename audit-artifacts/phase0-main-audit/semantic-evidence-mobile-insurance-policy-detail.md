# Semantic evidence — Mobile Insurance Policy Detail

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/insurance/policy-detail.tsx:23–39` loads `/users/me/profile` and renders `profile.insurance`. Any failure becomes `policy=null`, producing the same “no policy registered” state as a legitimate absence (`:66–75`); no retry/error/offline or policy freshness state is shown. The detail is not parameterized by a policy ID and does not prove active-policy ownership, verification source, eligibility or server status transition.

The UI renders provider, policy number, member name, national ID, network, class, expiry date and `verified` status directly (`:30–39,76–104`). National ID and member identifiers are displayed without masking or disclosure/consent controls. The verified/review status is derived from a client field and there is no evidence here of verification timestamp, rejection reason, expiry/renewal lifecycle, duplicate policy handling or document provenance.

The “check coverage” action navigates to `/insurance/coverage-check` without passing a policy ID, provider/network/class context or a coverage-request correlation ID (`:106–120`). Thus downstream coverage can depend on local/free-text inputs instead of the policy being viewed. No edit/remove/replace/upload/document action is present. No Phase 0 remediation was made.
