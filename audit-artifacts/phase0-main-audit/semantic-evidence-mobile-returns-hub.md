# Semantic evidence — Mobile Returns and Refunds Hub

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/returns/hub.tsx:61–109` fetches only `/pharmacy/returns`, but maps `service_type` as pharmacy, consultation, diagnostics, nursing or insurance (`:47–53,69–97`). The source does not prove that the pharmacy endpoint is authorized to return cross-service requests or that the type mapping is contract-backed. Any fetch failure only sets `loading=false` and leaves the existing requests state unchanged (`:69–105`), so initial failure can appear as a normal empty list and refresh behavior is absent.

The screen hard-codes a refund policy—100% before 24 hours, 50% before 12 hours, zero below 12 hours—and displays a default refund destination of Nabd wallet for unknown methods (`:55–59,166–184,88–90`). No backend policy/version, service-specific exception, cancellation window, payment settlement, eligibility or legal source is shown. Unknown statuses default to processing (`:25–45,238–241`), and `totalPending` sums raw amounts without numeric validation/currency semantics (`:114–116`).

It provides navigation to `/returns/new-request` and `/returns/detail` with `returnId` (`:123–134,243–249,306–315`), but no non-empty ID validation, owner/stranger/unauth proof, cancel/withdraw action, receipt, evidence upload, or detail lifecycle is present here. Summary labels and timeline text are locally derived, including “within 24–48 hours” for all non-terminal states (`:91–97`).

No explicit states exist for unavailable versus empty, submitted/under review/approved/partially refunded/settled/failed/reversed/disputed, or refund webhook delay. The hub therefore cannot prove a truthful end-to-end return/refund journey. No Phase 0 remediation was made.
