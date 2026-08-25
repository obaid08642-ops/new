# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/pharmacy/checkout.tsx`
- **Member SHA-256:** `4177253a8e409ef4fc180ef70081e75ddbc686a2b7a5d4533b0133760c2d69fb`
- **Line count:** 425
- **Read range:** `1-425`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * app/pharmacy/checkout.tsx`
- `4: * Checkout screen: collect delivery address, delivery mode, payment method.`
- `14: import { router } from 'expo-router';`
- `23: export default function PharmacyCheckoutScreen() {`
- `31: const [submitting, setSubmitting] = useState(false);`
- `45: // pickup remain available (business decision: never block checkout).`
- `105: { text: 'إلغاء', style: 'cancel' },`
- `106: { text: 'إضافة تأمين', onPress: () => {`
- `107: router.push('/profile/insurance');`
- `117: router.push('/shared/location-picker');`
- `134: setSubmitting(true);`
- `165: console.error('Checkout API error:', err);`
### backend_consumers_or_contracts
- `3: * app/pharmacy/checkout.tsx`
- `5: * - Sends real POST /orders/create to backend with cart items + location.`
- `50: const profile = await apiFetch('/users/me/profile');`
- `67: apiFetch('/wallet/balance').then((r: any) => setWalletBalance(Number(r?.balance || 0))).catch(() => {});`
- `75: apiFetch('/finance-engine/loyalty/redeem-quote', {`
- `86: const res = await apiFetch('/finance-engine/coupons/validate', {`
- `107: router.push('/profile/insurance');`
- `162: const res = await apiFetch('/orders/create', { method: 'POST', body: JSON.stringify(payload) });`
- `172: router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });`
- `176: router.push({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: * - On success → navigates to waiting-for-pharmacy with orderId.`
- `9: import React, { useState, useEffect } from 'react';`
- `30: const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');`
- `31: const [submitting, setSubmitting] = useState(false);`
- `32: const [hasInsurance, setHasInsurance] = useState(false);`
- `33: const [userAddress, setUserAddress] = useState<any>({});`
- `34: const [loadingAddress, setLoadingAddress] = useState(true);`
- `37: const [couponCode, setCouponCode] = useState('');`
- `38: const [couponResult, setCouponResult] = useState<any>(null); // {valid, discount, reason}`
- `39: const [checkingCoupon, setCheckingCoupon] = useState(false);`
- `40: const [walletBalance, setWalletBalance] = useState(0);`
- `41: const [loyaltyQuote, setLoyaltyQuote] = useState<any>(null); // {max_points_for_order, point_value_sar, balance}`
### payment_insurance_relevance
- `4: * Checkout screen: collect delivery address, delivery mode, payment method.`
- `28: const { items, subtotal, prescriptionUrl, paymentType, setPaymentType, clearCart } = useCart();`
- `32: const [hasInsurance, setHasInsurance] = useState(false);`
- `36: // ─── Coupon / loyalty / wallet (server-verified) ───────────────────────────`
- `40: const [walletBalance, setWalletBalance] = useState(0);`
- `55: if (profile?.insurance) {`
- `56: setHasInsurance(true);`
- `65: // Wallet balance + loyalty quote are display aids only — the server`
- `67: apiFetch('/wallet/balance').then((r: any) => setWalletBalance(Number(r?.balance || 0))).catch(() => {});`
- `71: const preTotal = subtotal + deliveryFee;`
- `74: if (paymentType === 'insurance') return;`
- `77: body: JSON.stringify({ order_total: preTotal }),`
### error_empty_loading_retry_cancel
- `7: * - No offline simulated order flow; every order is created by the backend.`
- `34: const [loadingAddress, setLoadingAddress] = useState(true);`
- `58: } catch (err) {`
- `59: console.warn('Failed to fetch profile address');`
- `61: setLoadingAddress(false);`
- `67: apiFetch('/wallet/balance').then((r: any) => setWalletBalance(Number(r?.balance || 0))).catch(() => {});`
- `78: }).then(setLoyaltyQuote).catch(() => setLoyaltyQuote(null));`
- `92: } catch (e: any) {`
- `105: { text: 'إلغاء', style: 'cancel' },`
- `164: } catch (err) {`
- `165: console.error('Checkout API error:', err);`
- `166: throw new Error('فشل إنشاء الطلب. يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
