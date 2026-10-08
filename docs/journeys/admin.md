# Admin journeys (code walk)

_Read-only audit, 2026-10-08. Each step names the file and line walked; nothing was run against a live backend (no admin account was signed in). Findings are also in `docs/design/needs-review/admin-journeys.json` with the same wording and a `[client]` / `[backend]` / `[owner]` tag. Verdicts: WORKS, BROKEN, GAP._

How a request travels: page -> `adminFetch` / `adminMutation` (`admin/src/lib/admin-client.ts`) or `fetchWithAdminGuard` / `apiFetch` (`admin/src/utils/api.ts`, adds `x-admin-csrf`) -> Next BFF `pages/api/admin/[...path].ts` (cookie to bearer, `/api/admin/<x>` -> backend `/api/v1/<x>`, adds the admin gate header) -> `JwtAuthGuard` (role, then `@RequirePermissions`) -> controller.

## 1. Provider approval: pending provider -> licence review -> approve / reject -> provider notified

| Step | Where | Verdict |
|---|---|---|
| Pending list | `provider-moderation.tsx:65` `GET /admin/providers?status=pending&limit=100` (+ GeoPicker filter); backend maps `pending` to `PENDING_ADMIN_APPROVAL` (`provider-admin.service.ts:57`) | WORKS |
| Open the file | `:44` `GET /admin/providers/:id` -> `ProviderFullDetail.tsx` (profile, KYC documents, bank, onboarding file, signed contract PDF download via `GET /provider-onboarding/admin/contracts/:id`, a visibility checkbox) | WORKS |
| Licence review | `ProviderFullDetail.tsx:219-290` shows licence numbers and `license_status`; `:519-523` lists licence document links. No per-document approve/reject, no number/expiry check | GAP |
| Approve | `:104-130` three `window.prompt` (reason >= 5 chars, cash %, insurance %) then `POST /admin/providers/:id/approve`. Backend `approve` (`provider-admin.service.ts:132-200`): status -> APPROVED, role flip + `token_version` bump (sessions revoked), commission saved, **all pending documents and bank accounts approved in bulk, `license_verified=true`**, public/indexing eligibility on, audit row, SEO pipeline | WORKS (but licence "verified" is automatic) |
| Reject | Only the red button at `:285` -> modal -> `handleSuspend` -> `POST /admin/providers/:id/suspend`. State machine forbids `PENDING_ADMIN_APPROVAL -> SUSPENDED` (`provider.enums.ts:46`), so the call fails with `invalid transition`. `POST /reject` and `/request-changes` exist (`provider.controllers.ts:156,178`) and no page calls them | **BROKEN** |
| Provider notified | `ProviderAdminService.approve/reject/requestChanges/suspend` write audit only; no notification event. `provider.approved` -> notification exists only in the older `providers.service.ts:223` (`notifications.service.ts:677`) | **GAP** |
| Provider edits (deltas) | `:81` list, `:175/:195` approve / reject with a prompt reason | WORKS |
| Guard | Page needs `doctor.read`; all provider writes are role-only (`@Roles(ADMIN)` on the class, no permission) | GAP |

Also: reject purges every uploaded image (`provider-admin.service.ts:224`) while REJECTED -> PENDING_ADMIN_APPROVAL stays allowed.

## 2. Price review -> catalogue item: items-to-review queue -> edit -> price / requires_prescription / controlled with confirmation and change log

| Step | Where | Verdict |
|---|---|---|
| Items-to-review queue | Decision 12 (unmapped pharmacy lines, "price not verified") has no backend: `sfda_price*` appears nowhere in `backend/src`; `GET /medicines/admin/pending-review` is 410 Gone (`medicines.controller.ts:413`). Existing queues: `change-requests` (`medicines-catalog.tsx:109`), medical review (`catalog-manager.tsx:143` approve / bulk-approve), shortage reports, image suggestions | **GAP** |
| Search | `medicines-catalog.tsx:96` `GET /medicines/admin/catalog?q=` (name, ingredient, barcode, manufacturer, brand) | WORKS |
| Edit | `:147-170` form -> `PATCH /medicines/admin/catalog/:id` (needs `catalog.update` + `catalog.price.write`, page needs `catalog.read`) | WORKS |
| Price change | Backend requires `reason` >= 5 chars when price differs and writes `medicine_price_history` (`medicines.service.ts:1732,1762`). Form asks for the reason only on a price diff (`:165`). No "old -> new" confirmation | partial |
| requires_prescription | Checkbox `:297`, saved with the form, no confirm, no reason, only the generic audit log | **GAP** |
| controlled | On the schema (`medicine.schema.ts:56`) but not in `EDITABLE_FIELDS` (`medicines.service.ts:1439`) or the DTO: admin cannot set it | **GAP** |
| Side effect | Any edit of an approved item resets `verified`, `public_eligibility`, `medical_review_status='pending'` (`:1749-1760`): a price fix hides the item until re-approved; the UI does not say so | **GAP** |
| Change log | Price: `catalog-governance.tsx:63` per item, `price-override-audit.tsx:44` all items. Other fields: audit log only | partial |
| Other editors | `catalog-manager` medicines tab uses PUT / DELETE (`:119,134`) but the backend has PATCH and `POST :id/delete`, so edit / delete there fail; insurance and specialties tabs likewise | **BROKEN** |

## 3. Refund: order or payment -> refund -> status

Four ways in, with different results:

| Path | Where | Verdict |
|---|---|---|
| Order console | `orders/[kind]/[id].tsx:37-54` action `refund`: reason >= 10 chars, amount <= `refundable_max`, `window.confirm`, `POST /admin/orders/:kind/:id/refund`. Backend (`orders-console.service.ts:325-372`) computes max from payments minus prior refunds, calls `RefundExecutor.execute` (Moyasar to the original method, cash = ledger record, notifies the patient), mirrors the payment status, sets `refund_status`, audits. Permission `order.refund` | WORKS; label says "to wallet" (`:10`) but nothing goes to a wallet |
| Returns | `returns.tsx:47-52` prompt then `POST /admin/returns/:id/decide`; approve executes the refund (`returns.service.ts:380`) and marks `completed` | WORKS (role-only) |
| Refund queue | `insurance-queue.tsx:39,55` `GET /admin/finance/refunds/queue`, `POST .../decide` (no confirm). Backend `RefundService.decide` (`insurance-engine.module.ts:850`) only sets APPROVED / REJECTED. Execution is `POST /admin/finance-engine/refunds/:id/execute` (`finance-engine.module.ts:1096`, maker-checker above the large-refund threshold): no admin page calls it | **BROKEN** (approved refund never paid) |
| Unused routes | `POST /admin/refunds/:id/decide` (patient-ux), `POST /payments/refund/:txn`, `POST /moyasar/payments/:id/refund`: no UI | owner |

Status shown afterwards: order page reloads (`:51`) and shows `refund_status` / payments block; the patient sees it through the notification of the executor.

## 4. Feature switch: toggle -> effect on clients

| Step | Where | Verdict |
|---|---|---|
| Toggle | `system-ops.tsx:18` `POST /admin/governance-controls/feature-flags` (key free text, enabled, rollout %, reason >= 5), permission `ops.queues.manage`; backend writes both `feature_flags` and `featureflags` and audits (`admin-governance-controls.controller.ts:82`) | WORKS |
| Read by backend | Only the AI gateway reads the `featureflags` collection (`ai-gateway.service.ts:80`); no module checks a flag, so routes of a "disabled" module still answer | **GAP** |
| Read by clients | `patient-app`, `patient-web`, `provider-app` never call `GET /feature-flags` (public, `feature-flags.controller.ts:15`). `patient-app/src/services/FeatureFlags.ts` has static defaults and an update hook but no fetch | **GAP** |
| Kill switch / maintenance | `config-portal.tsx:183-215` handler and `PUT /admin/governance/trigger-emergency-maintenance` exist; button at `:344` is permanently disabled. `/kill-switches` has no UI | BROKEN |
| Theme | `theme-control.tsx:38-48` writes localStorage and a raw `fetch` to `/api/admin/theme` (no CSRF header, no such route, error swallowed) then shows "saved" | **BROKEN**, owner (identity is fixed) |

Result: toggling a switch changes a database row and an audit entry, and nothing else.
