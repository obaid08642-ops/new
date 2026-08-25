# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/hub.tsx`
- **Member SHA-256:** `ba85062b5b7f0885a99d6c283baa445ae96385b2162ac1ec5a399c3a00368e65`
- **Line count:** 261
- **Read range:** `1-261`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `27: const QUICK: { icon: IconName; label: string; route: string; color: string }[] =`
- `32: route: "/family/invite",`
- `38: route: "/family/join",`
- `44: route: "/family/calendar",`
- `50: route: "/family/chat",`
- `56: route: "/family/emergency-contacts",`
- `63: export default function FamilyHubScreen() {`
- `101: onPress={() => router.push("/family/invite")}`
- `115: onPress={() => router.push("/(tabs)/index" as any)}`
- `136: onPress={() => router.push(q.route as any)}`
- `159: onPress={() =>`
### backend_consumers_or_contracts
- `77: const mems = await apiFetch("/family/members");`
### auth_ownership
- `152: const isOwner = m.role === "owner";`
- `153: const color = isOwner ? "#7A6BEA" : "#23B5CE";`
- `155: m.display_name || (isOwner ? "أنت (مالك المجموعة)" : "عضو عائلة");`
- `180: <Badge label={isOwner ? "مسؤول" : "عضو"} color={color} />`
- `187: {!isOwner && (`
- `193: pathname: "/family/permissions",`
### state_transitions
- `3: import React, { useState, useEffect } from "react";`
- `8: StatusBar,`
- `67: const [members, setMembers] = useState<any[]>([]);`
- `68: const [loading, setLoading] = useState(true);`
- `76: setLoading(true);`
- `82: setLoading(false);`
- `88: <StatusBar barStyle="light-content" />`
- `108: {loading ? "..." : `${members.length} أفراد`}`
- `120: {loading ? (`
- `182: <Badge label="نشط" color={colors.success} />`
### payment_insurance_relevance
- `18: Card,`
- `157: <Card`
- `205: </Card>`
- `210: <Card`
- `228: </Card>`
### error_empty_loading_retry_cancel
- `68: const [loading, setLoading] = useState(true);`
- `76: setLoading(true);`
- `79: } catch (err: any) {`
- `82: setLoading(false);`
- `108: {loading ? "..." : `${members.length} أفراد`}`
- `120: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
