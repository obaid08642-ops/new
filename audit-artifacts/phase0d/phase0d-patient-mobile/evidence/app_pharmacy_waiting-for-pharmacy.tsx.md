# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/waiting-for-pharmacy.tsx`
- **Member SHA-256:** `b9f7c19a3e588432eac96448849b4fd5562bac907c5eb94367a54ef6c3b30d1b`
- **Line count:** 350
- **Read range:** `1-350`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: * Radar animation screen while system searches for nearest pharmacy.`
- `6: * - When pharmacy accepts → navigates to order-confirm screen.`
- `7: * - Allows patient to cancel order.`
- `20: import { router, useLocalSearchParams } from "expo-router";`
- `28: export default function WaitingForPharmacyScreen() {`
- `100: order?.basket_review_status === "submitted_for_patient_approval"`
- `103: router.replace({`
- `123: const handleCancel = () => {`
- `129: onPress: async () => {`
- `130: // E2: was catch{} then navigate away anyway — user thought the order was cancelled when it wasn't.`
- `132: if (orderId) await apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });`
- `133: router.replace("/(tabs)/pharmacy");`
### backend_consumers_or_contracts
- `3: * app/pharmacy/waiting-for-pharmacy.tsx`
- `5: * - Polls GET /orders/:orderId every 3 seconds for status change.`
- `96: const order = await apiFetch(`/orders/${orderId}`);`
- `104: pathname: "/pharmacy/order-confirm",`
- `132: if (orderId) await apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });`
- `133: router.replace("/(tabs)/pharmacy");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: * - Polls GET /orders/:orderId every 3 seconds for status change.`
- `7: * - Allows patient to cancel order.`
- `10: import React, { useEffect, useRef, useState } from "react";`
- `35: const [dotsCount, setDotsCount] = useState(1);`
- `90: // ─── Poll backend for order status ──────────────────────────────────────────`
- `93: const checkStatus = async () => {`
- `98: order?.state === "ACCEPTED" ||`
- `99: order?.state === "PREPARING" ||`
- `100: order?.basket_review_status === "submitted_for_patient_approval"`
- `113: polling = setInterval(checkStatus, 3000);`
- `114: checkStatus(); // Immediate first check`
- `123: const handleCancel = () => {`
### payment_insurance_relevance
- `207: {/* Info Cards */}`
- `222: styles.infoCard,`
- `327: infoCard: {`
### error_empty_loading_retry_cancel
- `7: * - Allows patient to cancel order.`
- `108: } catch {`
- `109: // Backend offline – ignore, rely on fallback timer`
- `123: const handleCancel = () => {`
- `130: // E2: was catch{} then navigate away anyway — user thought the order was cancelled when it wasn't.`
- `132: if (orderId) await apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });`
- `134: } catch (e: any) {`
- `250: {/* Cancel */}`
- `254: styles.cancelBtn,`
- `257: onPress={handleCancel}`
- `268: cancel`
- `342: cancelBtn: {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
