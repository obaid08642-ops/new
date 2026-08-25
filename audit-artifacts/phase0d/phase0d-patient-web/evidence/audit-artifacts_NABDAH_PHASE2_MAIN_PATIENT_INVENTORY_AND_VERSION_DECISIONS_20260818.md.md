# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MAIN_PATIENT_INVENTORY_AND_VERSION_DECISIONS_20260818.md`
- **Member SHA-256:** `5aec7a476cd0861e0b64500b47bd4a09a83267255acec3fe9a3ed165311ccf29`
- **Line count:** 53
- **Read range:** `1-53`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: The second controller pass reduced false positives in the 32-item review queue. The Chat controller is declared under both `chat` and `chats` and exposes `POST chat/threads/direct`, `POST chat/threads/booking`, `GET/POST chat/threads/:threa`
- `6: The queue should therefore distinguish route-compiler omissions from genuine defects. Remaining likely defects include client calls that use collection POST instead of item-specific mutation routes (wishlist), POST where a read-only balance`
- `9: ## Corrected 32-call classification using the actual route column`
- `11: The first open-contract classifier used the wrong TSV field name and incorrectly labelled every item as no-route. After re-running against the actual `route` column, the queue is now separated correctly: many items are method mismatches aga`
- `16: The copay contract is not absent from Backend main: the exact route is `POST /insurance/patient/pay-copay` in `insurance-engine.module.ts`, while Patient currently calls `POST /patient/pay-copay`. This is a genuine client/backend prefix mis`
- `18: The Chat controller has an alias declaration for both `chat` and `chats`, so Patient `/chat/...` and SocketContext `/chats/...` are contract-compatible after compiler alias normalization. `medical/programs/active` and `medical/programs/comp`
- `23: The earlier note that `/patient/pay-copay` was a genuine prefix mismatch is superseded by the Backend source: `InsuranceAliasController` explicitly exposes `POST /patient/pay-copay` and delegates to `InsuranceFlowService.payCopay`. The Pati`
- `28: After expanding the confirmed Controller aliases, the 32-call queue contains 9 alias-compatible Chat/copay calls, 20 method-mismatch candidates, and 10 no-exact-route review candidates (the header is excluded from these counts). The alias-c`
- `33: `order-confirm.tsx` uses `GET /orders/:id` for detail and `POST /orders/:id/approve-basket` / `POST /orders/:id/reject-basket` for the two user actions. Both basket transition contracts are present in Backend main and the UI remains on the `
- `36: ## Parser corrections from screen-level reads`
- `43: `profile/addresses.tsx` correctly loads addresses and updates the selected default address through `PATCH /users/me/addresses/:id`. However, the visible `Button` labelled `إضافة عنوان جديد` has no `onPress`, navigation, or mutation handler.`
- `48: A targeted scan of sensitive Patient screens found several apparent button candidates, but manual reads confirmed handlers for consultation follow-up, booking confirmation, medication barcode/AI scan, pharmacist chat expiry, and custom-item`
### backend_consumers_or_contracts
- `16: The copay contract is not absent from Backend main: the exact route is `POST /insurance/patient/pay-copay` in `insurance-engine.module.ts`, while Patient currently calls `POST /patient/pay-copay`. This is a genuine client/backend prefix mis`
- `18: The Chat controller has an alias declaration for both `chat` and `chats`, so Patient `/chat/...` and SocketContext `/chats/...` are contract-compatible after compiler alias normalization. `medical/programs/active` and `medical/programs/comp`
- `33: `order-confirm.tsx` uses `GET /orders/:id` for detail and `POST /orders/:id/approve-basket` / `POST /orders/:id/reject-basket` for the two user actions. Both basket transition contracts are present in Backend main and the UI remains on the `
### auth_ownership
- `4: The second controller pass reduced false positives in the 32-item review queue. The Chat controller is declared under both `chat` and `chats` and exposes `POST chat/threads/direct`, `POST chat/threads/booking`, `GET/POST chat/threads/:threa`
- `16: The copay contract is not absent from Backend main: the exact route is `POST /insurance/patient/pay-copay` in `insurance-engine.module.ts`, while Patient currently calls `POST /patient/pay-copay`. This is a genuine client/backend prefix mis`
- `18: The Chat controller has an alias declaration for both `chat` and `chats`, so Patient `/chat/...` and SocketContext `/chats/...` are contract-compatible after compiler alias normalization. `medical/programs/active` and `medical/programs/comp`
- `23: The earlier note that `/patient/pay-copay` was a genuine prefix mismatch is superseded by the Backend source: `InsuranceAliasController` explicitly exposes `POST /patient/pay-copay` and delegates to `InsuranceFlowService.payCopay`. The Pati`
- `28: After expanding the confirmed Controller aliases, the 32-call queue contains 9 alias-compatible Chat/copay calls, 20 method-mismatch candidates, and 10 no-exact-route review candidates (the header is excluded from these counts). The alias-c`
- `43: `profile/addresses.tsx` correctly loads addresses and updates the selected default address through `PATCH /users/me/addresses/:id`. However, the visible `Button` labelled `إضافة عنوان جديد` has no `onPress`, navigation, or mutation handler.`
- `53: Backend main does define `POST /users/me/addresses`, protected by `JwtAuthGuard`, and persists the new address in the authenticated patient's profile. It also defines `GET`, `PATCH/:addressId`, and `DELETE/:addressId`. Therefore the confirm`
### state_transitions
- `16: The copay contract is not absent from Backend main: the exact route is `POST /insurance/patient/pay-copay` in `insurance-engine.module.ts`, while Patient currently calls `POST /patient/pay-copay`. This is a genuine client/backend prefix mis`
- `18: The Chat controller has an alias declaration for both `chat` and `chats`, so Patient `/chat/...` and SocketContext `/chats/...` are contract-compatible after compiler alias normalization. `medical/programs/active` and `medical/programs/comp`
- `23: The earlier note that `/patient/pay-copay` was a genuine prefix mismatch is superseded by the Backend source: `InsuranceAliasController` explicitly exposes `POST /patient/pay-copay` and delegates to `InsuranceFlowService.payCopay`. The Pati`
- `28: After expanding the confirmed Controller aliases, the 32-call queue contains 9 alias-compatible Chat/copay calls, 20 method-mismatch candidates, and 10 no-exact-route review candidates (the header is excluded from these counts). The alias-c`
- `41: ## Confirmed Patient UI gap: addresses`
- `43: `profile/addresses.tsx` correctly loads addresses and updates the selected default address through `PATCH /users/me/addresses/:id`. However, the visible `Button` labelled `إضافة عنوان جديد` has no `onPress`, navigation, or mutation handler.`
- `48: A targeted scan of sensitive Patient screens found several apparent button candidates, but manual reads confirmed handlers for consultation follow-up, booking confirmation, medication barcode/AI scan, pharmacist chat expiry, and custom-item`
- `53: Backend main does define `POST /users/me/addresses`, protected by `JwtAuthGuard`, and persists the new address in the authenticated patient's profile. It also defines `GET`, `PATCH/:addressId`, and `DELETE/:addressId`. Therefore the confirm`
### payment_insurance_relevance
- `6: The queue should therefore distinguish route-compiler omissions from genuine defects. Remaining likely defects include client calls that use collection POST instead of item-specific mutation routes (wishlist), POST where a read-only balance`
- `11: The first open-contract classifier used the wrong TSV field name and incorrectly labelled every item as no-route. After re-running against the actual `route` column, the queue is now separated correctly: many items are method mismatches aga`
- `14: ## Focused copay and alias review`
- `16: The copay contract is not absent from Backend main: the exact route is `POST /insurance/patient/pay-copay` in `insurance-engine.module.ts`, while Patient currently calls `POST /patient/pay-copay`. This is a genuine client/backend prefix mis`
- `18: The Chat controller has an alias declaration for both `chat` and `chats`, so Patient `/chat/...` and SocketContext `/chats/...` are contract-compatible after compiler alias normalization. `medical/programs/active` and `medical/programs/comp`
- `21: ## Copay correction after reading the alias controller`
- `23: The earlier note that `/patient/pay-copay` was a genuine prefix mismatch is superseded by the Backend source: `InsuranceAliasController` explicitly exposes `POST /patient/pay-copay` and delegates to `InsuranceFlowService.payCopay`. The Pati`
- `28: After expanding the confirmed Controller aliases, the 32-call queue contains 9 alias-compatible Chat/copay calls, 20 method-mismatch candidates, and 10 no-exact-route review candidates (the header is excluded from these counts). The alias-c`
- `33: `order-confirm.tsx` uses `GET /orders/:id` for detail and `POST /orders/:id/approve-basket` / `POST /orders/:id/reject-basket` for the two user actions. Both basket transition contracts are present in Backend main and the UI remains on the `
- `53: Backend main does define `POST /users/me/addresses`, protected by `JwtAuthGuard`, and persists the new address in the authenticated patient's profile. It also defines `GET`, `PATCH/:addressId`, and `DELETE/:addressId`. Therefore the confirm`
### error_empty_loading_retry_cancel
- `43: `profile/addresses.tsx` correctly loads addresses and updates the selected default address through `PATCH /users/me/addresses/:id`. However, the visible `Button` labelled `إضافة عنوان جديد` has no `onPress`, navigation, or mutation handler.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
