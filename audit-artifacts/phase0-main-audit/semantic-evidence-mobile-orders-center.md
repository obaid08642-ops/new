# Semantic evidence — Mobile Unified Orders Center

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/orders/index.tsx:74–88` loads eight sources in parallel: appointments, orders, labs, radiology, nursing, insurance claims, returns and active emergency. Every source is wrapped by a `safe` helper that returns `null` on failure and only increments a global failure count (`:74–90`). The screen therefore cannot distinguish unauthorized, forbidden, not found, unavailable, or genuinely empty per domain.

The nursing source calls `/home-care/bookings/my` (`:79–87`), which conflicts with the previously verified backend correction that the patient list route is `/unified-bookings/mine`; this consumer route must be rechecked against the live controller before production. Labs and radiology items route to a generic `/diagnostics/orders` without passing the item ID (`:112–128`), insurance claims route to `/insurance/claim-tracking` without claim ID (`:139–146`), and emergency routes to a generic tracking page without active request ID (`:157–165`). These links cannot reliably open the selected resource or prove ownership context.

The screen normalizes heterogeneous backend status values through local sets/maps (`:17–32,51–55`). Unknown statuses default to the pending bucket, and state families across appointments/orders/labs/radiology/claims/returns are collapsed into three generic buckets. This can mislabel new, terminal, rejected, refunded, expired or failed states. It also uses local fallback titles/subtitles such as “موعد استشارة”, “حجز تحاليل”, “مطالبة تأمين” and empty strings (`:94–165`), which can hide missing server identity fields.

The UI does provide aggregate retry, pull-to-refresh, loading and empty states (`:221–243,229–237`), but retry reloads all sources rather than the failed domain. There is no per-resource authorization/error detail, cancellation/reorder/refund/payment continuation, or verification that every list item has a non-empty ID before navigation (`:239–257`). No Phase 0 remediation was made.
