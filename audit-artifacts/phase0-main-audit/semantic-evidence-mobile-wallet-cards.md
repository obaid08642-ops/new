# Semantic evidence — Mobile Wallet Cards

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/wallet/cards.tsx:58–74` reads `/wallet/cards` and exposes only a spinner; errors are logged with no visible retry/error/unauthorized state. `setDefaultCard` is explicitly optimistic “for now” and only rewrites local `isDefault` flags (`:76–84`); no backend endpoint, persistence, ownership, conflict handling, idempotency or reload verification exists. A subsequent reload can silently undo the apparent selection.

Deletion calls `DELETE /wallet/cards/{cardId}` (`:86–117`) and displays a generic failure, but has no visible Idempotency-Key, ownership/404 proof, in-flight per-card state, replay handling or rollback. The UI prevents deleting a default card only locally when more than one exists; this is not a server invariant. Response cards are consumed as an unvalidated `SavedCard` shape.

The bottom “إضافة بطاقة جديدة” action opens an alert whose Visa and Mada callbacks submit hard-coded test-like values `cardNumber: "1234567890124521"`, `holderName: "Ahmed"`, and fixed expiry dates to `POST /wallet/cards` (`:327–376`). This is explicit synthetic/test data in a live user action, with no input screen, tokenization/hosted PCI flow, 3DS, rate-limit, idempotency, error handling or user confirmation. It conflicts with the visible security claim that cards are PCI DSS protected and full data is not retained (`:256–274`), which is not proven by this source.

Stored card display masks to last four digits, but renders holder name and expiry directly (`:154–176`) with no schema/expiry validation. Supported methods are hard-coded to Visa/Mastercard/Mada (`:298–323`), and there is no card verification/default-card server state, add-card success confirmation, pagination, or payment-method eligibility handling. No Phase 0 remediation was made.
