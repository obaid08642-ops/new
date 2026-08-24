# Semantic evidence — Mobile Return Detail

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/returns/detail.tsx:53–74` requests `/pharmacy/returns/{returnId}` but, on any failure, populates a synthetic record with fixed order ID `ORD-984321`, amount `80`, reason, wallet refund method, processing status and the current timestamp. This is explicit fabricated fallback data on an error path and can present a failed/unavailable/non-owner return as a real request.

The page maps only four statuses and defaults unknown status to the processing label (`:24–29,132–134`). It renders amount, order ID, reason and refund method with local fallbacks (`:152–164`), without typed validation, currency/settlement evidence, owner/stranger/unauth distinction or a not-found state.

The timeline is locally derived from status and always uses generic text about request review and 24–48-hour processing from the hub; it does not use server event timestamps, actor, decision reason, refund transaction ID, settlement/webhook state or dispute/reversal state (`:93–112,198–230`). There are no actions to withdraw/cancel, upload evidence, contact escalation, retry, or reconcile the refund.

This screen is a confirmed truthfulness/security risk because the catch block creates a believable synthetic return record. No Phase 0 remediation was made.
