# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/diagnostics/insurance-approval.tsx`
- **Member SHA-256:** `3317ed2fb333ffcfb1b768f43701c87efd054762a151b06ee14c692f67fa694e`
- **Line count:** 287
- **Read range:** `1-287`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { useRouter, useLocalSearchParams, Stack } from 'expo-router';`
- `18: const router = useRouter();`
- `117: <Stack.Screen options={{ headerShown: false }} />`
- `122: <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>`
- `181: style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }} onPress={() => toggleCashItem(item)}`
- `239: onPress={() => {`
- `240: (router.push as any)({`
- `241: pathname: '/diagnostics/checkout',`
- `250: onPress={() => (router.push as any)('/consultations')}`
- `258: onPress={() => {`
- `259: (router.push as any)({`
- `260: pathname: '/diagnostics/checkout',`
### backend_consumers_or_contracts
- `37: const res = await apiFetch(`/orders/${orderId}`);`
- `78: await apiFetch(`/orders/${orderId}/items/${item.id}/opt-in-cash`, {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useEffect, useState } from 'react';`
- `3: import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';`
- `15: type ApprovalState = 'pending' | 'full' | 'partial' | 'rejected';`
- `25: const [status, setStatus] = useState<ApprovalState>('pending');`
- `26: const [approvalDetails, setApprovalDetails] = useState<any>(null);`
- `27: const [optedInCashItems, setOptedInCashItems] = useState<string[]>([]); // Array of item IDs that user opted to pay cash for`
- `40: if (data.status === 'APPROVED_FULL' || data.status === 'APPROVED_PARTIAL' || data.status === 'REJECTED') {`
- `41: let newStatus = 'full';`
- `42: if (data.status === 'APPROVED_PARTIAL') newStatus = 'partial';`
- `43: if (data.status === 'REJECTED') newStatus = 'rejected';`
- `45: setStatus(newStatus as ApprovalState);`
- `56: console.error(err);`
### payment_insurance_relevance
- `17: export default function InsuranceApproval() {`
- `27: const [optedInCashItems, setOptedInCashItems] = useState<string[]>([]); // Array of item IDs that user opted to pay cash for`
- `47: totalAmount: data.totalAmount || 0,`
- `48: coveragePercent: data.coveragePercent || 0,`
- `50: copayAmount: data.copayAmount || 0,`
- `67: const toggleCashItem = async (item: any) => {`
- `68: const isOptedIn = optedInCashItems.includes(item.id || item.name);`
- `72: setOptedInCashItems(prev =>`
- `78: await apiFetch(`/orders/${orderId}/items/${item.id}/opt-in-cash`, {`
- `85: setOptedInCashItems(prev =>`
- `102: // Calculate Hybrid Total`
- `103: let hybridCashAdditions = 0;`
### error_empty_loading_retry_cancel
- `15: type ApprovalState = 'pending' | 'full' | 'partial' | 'rejected';`
- `25: const [status, setStatus] = useState<ApprovalState>('pending');`
- `55: } catch (err) {`
- `56: console.error(err);`
- `83: } catch (e) {`
- `84: console.error(e);`
- `129: {status === 'pending' && (`
- `143: {status !== 'pending' && config && approvalDetails && (`
- `233: {status !== 'pending' && (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
