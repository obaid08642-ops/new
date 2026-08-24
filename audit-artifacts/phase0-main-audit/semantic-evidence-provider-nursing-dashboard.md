# Semantic evidence — Provider NursingDashboard

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:57–214` defines a large navigator with home/orders/jobs/drugs/settings and many operational screens: order detail, checklist, check-in, care plan, progress notes, visit report, supplies, wallet, promotions, CRM, SOS, GPS, chat, insurance requests, notifications, security and more. This confirms Provider Nursing scope is materially broader than one dashboard.

The dashboard fetches incoming/active/completed queues from `/provider/jobs/queue?kind=nursing&status=...` (`:80–103`) and silently converts all failures to an empty jobs list (`:94–97`). It then exposes accept/reject actions using `/nursing/visits/{id}/respond` (`:128–164`) even though the backend compatibility contract defines `/home-care/bookings/{id}/respond` (`home-care-compat.module.ts:141–149`). This is a direct route drift candidate requiring live/controller reconciliation.

The queue UI displays patient address and hard-coded fallback patient age/gender (`:293–318`, especially `:300–306`), and displays a hard-coded distance `3.2 KM` in the emergency request sheet (`:134–139`). The home tab shows derived revenue from client job objects (`:234–264`) and a bell icon without a visible action (`:249–252`).

Online toggle posts `/home-care/provider/availability` with `{ available: nextVal }` (`:226–232`), while the backend contract expects `{ online, available_now }` (`home-care-compat.module.ts:209–212`); this is another payload drift candidate. The quick actions route to GPS/checklist/care-plan/progress/report/supplies/wallet using the currently active/first job (`:266–286`), which may pass an unrelated record when no active job exists.

The screen is broad and uses many local/static UI labels/icons. It needs a full action-by-action mapping to Provider backend roles, ownership, state transitions, PHI minimization, audit and notification behavior. No Phase 0 remediation was made.
