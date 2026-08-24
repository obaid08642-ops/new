# Semantic evidence — Mobile Family Invite

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/invite.tsx:1–10` is marked `@ts-nocheck` and uses `apiFetch`, device `Share`, and a QR renderer. The screen immediately creates an invite through `POST /family/invite` on mount without sending the optional name or relation fields captured later (`:12–40,76–84`). Thus the displayed member metadata is not proven to be bound to the generated invitation.

The invite response is assumed to expose `res.invite_code` with no typed parsing or server provenance check (`:27–39`). The source shows loading/error/retry states, but all failures are presented as inability to create a code and the copy says the caller must own a family group (`:60–73`); exact 401/403/404 semantics and owner enforcement require backend evidence.

Link, QR and code modes all embed/share `https://nabdahplus.app/join/{inviteCode}` (`:86–130`). The QR contains the same link, and device sharing includes the code and URL (`:42–47,107–115`). No expiry display, one-time-use guarantee, revoke/resend lifecycle, audience binding, consent, rate limiting, idempotency or invite audit trail is shown. Invite codes are sensitive bearer capabilities and require secure redaction/logging and abuse controls.

The `copyCode` callback only toggles a local `copied` state and does not access a clipboard API (`:42–50,95–103,119–127`), so the UI can claim copied without proving a copy occurred. The optional name/relation inputs are not used in any request. The permissions preview claims that the invite recipient can later control/report/vitals/booking permissions (`:133–142`), requiring explicit consent and state-machine evidence.

No Phase 0 remediation was made.
