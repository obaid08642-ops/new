# Semantic evidence — Mobile Family Join

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/join.tsx:1–18` is marked `@ts-nocheck` and imports `apiFetch`, route params and UI controls. The invitation code is initialized from `params.code` and relation from a local selector (`:29–37`).

The primary `lookupCode` action sends `POST /family/join` with `invite_code`, a hard-coded `display_name: "عضو عائلة"`, and optional relation label (`:39–51`). The code treats `res.ok` as the signal to populate a local `found` object, but the returned response is not used to display the actual inviter/group/permissions; instead it creates `{ name: "المجموعة العائلية", relation, permissions: [] }` locally (`:52–58`). This is not a separate lookup/preview operation.

After the POST succeeds, `joined` is set immediately and the UI reports “تم الانضمام للعائلة” (`:57–60,72–101`). The visible `accept` handler does not call any API; it only sets `joined` to true and is marked as safety behavior because joining already occurred during lookup (`:67–70`). The displayed accept/reject review screen is therefore unreachable after a successful join. The reject button only navigates back and sends no decline/revocation request (`:212–225`).

The source provides no validation beyond non-empty input, no distinct expired/used/invalid/unauthorized states, no one-time/replay/idempotency handling, no explicit consent confirmation before sharing/accepting permissions, no owner/invitee binding proof, and no response-derived permission list. The QR scan route `/family/scan` is only navigated to; scan and contract behavior are not proven (`:168–173`).

The success route goes to `/health/family-hub` without a returned group/member identifier or membership context (`:95–101`). No Phase 0 remediation was made.
