# Semantic evidence — Mobile New Return Request

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/returns/new-request.tsx:19–48` defines service types, reasons, refund methods, and refund policies locally. The policy rates/conditions, refund durations and service coverage are not fetched from a versioned backend contract. The form permits a free-text order ID and details (`:172–207`) without validating order type, ownership, status, payment settlement, return eligibility or time window.

The “attach photos” control only appends labels such as `صورة 1` to local state (`:209–224`); it does not invoke a picker, upload file bytes, scan content, bind evidence to the return request, or retain an attachment ID. The confirmation summary displays the entered order ID or `غير محدد` (`:236–254`) and allows refund method selection without proving account/card/bank ownership or eligibility (`:256–280`).

Submit sends `POST /pharmacy/returns` with generic camelCase fields and a client-derived amount fixed to 250 for consultations, 120 for diagnostics and 80 for all other types (`:63–82`). There is no visible Idempotency-Key, server quote/amount lookup, source-order binding, consent, ownership/authorization test, or state precondition. The endpoint is pharmacy-named despite the UI allowing consultation/diagnostics/nursing/insurance returns.

On any successful HTTP response the screen shows success and generates `RET-${Date.now()...}` locally rather than using a returned server request ID (`:88–101`). It promises review within 24–48 hours regardless of service/policy, and only a generic alert appears on failure. This is a confirmed false-success/financial-integrity risk. No Phase 0 remediation was made.
