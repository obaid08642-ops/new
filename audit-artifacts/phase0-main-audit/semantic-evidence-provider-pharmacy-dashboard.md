# Semantic evidence — Provider PharmacyDashboard

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:2–22` declares a broad provider pharmacy scope: order broadcast/accept/partial/reject, order detail, prescription processing, refills, price comparison, inventory, product approval, expiry/recall, shortage, B2B procurement, history, delivery tracking, QR menu, reviews, wallet and settings.

The navigator includes biometric gating through `Vault`/`Biometric` on app open (`:73–96`) and exposes many operational screens (`:138–170`). The main tab state starts as `home` while the tab list starts with `orders`, then maps both to `PharmacyHomeTab` (`:98–126`), creating a state/label ambiguity that needs UI verification.

`PharmacyHomeTab` begins a polling fallback for pharmacy broadcasts when online (`:187–225`), with an audio alert asset (`:198–214`). The source comment calls this a simulated WebSocket connection with polling fallback; live subscription, duplicate suppression, acknowledgement, retry and ordering semantics require verification. The screen imports many operational components and security helpers, but this file alone does not prove backend route/schema, provider ownership, financial settlement, prescription PHI controls, inventory audit, or withdrawal authorization.

## Cross-layer verification required

1. Read the rest of PharmacyDashboard and imported extended screens for every button/action and route.
2. Reconcile broadcast/accept/partial/reject routes with backend pharmacy contracts and idempotency.
3. Verify biometric lock does not replace server authorization and that logout/account switch clears sensitive state.
4. Verify prescription image/PHI handling, inventory mutations, recall/shortage workflows and admin approval.
5. Verify polling is truthful, handles duplicates/stale data/errors and does not claim realtime without a socket.
6. Trace delivery, wallet, withdrawal, reviews and support actions to roles, audit and financial tests.

No Phase 0 remediation was made.
