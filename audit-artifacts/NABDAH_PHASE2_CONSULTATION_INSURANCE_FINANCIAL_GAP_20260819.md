# Phase 2 Patient — consultation booking insurance and financial-truthfulness gap

## Verified contract behavior

The Patient confirmation screen creates a real appointment through `POST /care/appointments`. Card payments create a payment intent afterward. Backend appointment creation calculates its own service, platform, home-visit, and transportation fees, and intentionally leaves card appointments pending until payment confirmation.

The same Backend code automatically confirms every non-card appointment, including `payment_method: insurance`, immediately after it stores the client-provided insurance provider/member fields. No verified insurance decision, approval request, or owned copay-payment intent is required by this path.

## Confirmed gaps

| Surface | Evidence | Required disposition |
|---|---|---|
| Insurance booking state | Patient may send `payment_method: insurance`; Backend auto-confirms non-card appointments | **P0 FIX — create/attach a server-side insurance request, keep appointment pending until a verified insurance decision, and charge only server-authoritative copay after approval** |
| Insurance identity | A logged-in patient without a saved policy can select company/category, but the client sends no policy/member identifier; category is not sent at all | **P0 FIX — require an owned validated policy or a governed manual-insurance request; reject incomplete identity rather than auto-confirming** |
| Coverage transport | Patient bypasses `apiFetch` and reconstructs a base URL with a brittle string replacement/fallback | **P1 FIX — use the central authenticated API client and the configured production base URL; propagate structured coverage errors** |
| Financial display | Patient locally computes 15% VAT and a zero home fee, while Backend recomputes price plus service/home/transport fees | **P1 FIX — request/display a server quote or returned appointment financial breakdown before payment; do not present client-derived totals as authoritative** |
| Visit mode | Confirmation allows all three visit modes again, independent of the selected slot/provider capability | **FIX — lock to the validated selected mode or re-query slot/provider availability before submit** |
| Insurance UI claim | UI says coverage is checked via NPHIES even when contract/auth/profile conditions are incomplete | **FIX — show only verified coverage status and a fail-closed pending/error state** |

## Positive controls

Card flow is correctly routed to a payment intent and passes transaction metadata to the processing screen. Slot creation is server-owned and duplicate slots are protected by the Backend unique constraint. These controls do not make the insurance flow safe.

## Decision

Consultation insurance must be **FIX/BLOCKED** until insurance identity, approval, price/coplay authority, and payment handoff are server-bound and tested through sandbox cases for online, clinic, and home visits.
