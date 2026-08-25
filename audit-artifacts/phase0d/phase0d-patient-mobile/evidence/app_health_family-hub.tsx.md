# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/health/family-hub.tsx`
- **Member SHA-256:** `a3909cdc8ff722429053f57d0a6f51e5cc0ea11d31507b8d5c8bf7bab9733b85`
- **Line count:** 333
- **Read range:** `1-333`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { router } from "expo-router";`
- `28: const QUICK: { icon: IconName; label: string; route: string; color: string }[] =`
- `33: route: "/family/invite",`
- `39: route: "/family/join",`
- `45: route: "/family/calendar",`
- `51: route: "/family/chat",`
- `57: route: "/family/emergency-contacts",`
- `62: export default function FamilyHubScreen() {`
- `142: onPress={() => router.back()}`
- `188: onPress={handleCreateGroup}`
- `194: onPress={() => router.push("/family/join")}`
- `208: onPress={() => router.push(q.route as any)}`
### backend_consumers_or_contracts
- `80: const grp = await apiFetch("/family/my-group");`
- `82: const mems = await apiFetch("/family/members");`
- `99: await apiFetch("/family/create", {`
### auth_ownership
- `224: const isOwner = m.role === "owner";`
- `225: const color = isOwner ? "#7A6BEA" : "#23B5CE";`
- `227: m.display_name || (isOwner ? "أنت (مالك المجموعة)" : "عضو عائلة");`
- `252: <Badge label={isOwner ? "مسؤول" : "عضو"} color={color} />`
- `259: {!isOwner && (`
- `265: pathname: "/family/permissions",`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `67: const [group, setGroup] = useState<any>(null);`
- `68: const [members, setMembers] = useState<any[]>([]);`
- `69: const [loading, setLoading] = useState(true);`
- `70: const [creating, setCreating] = useState(false);`
- `79: setLoading(true);`
- `92: setLoading(false);`
- `105: console.error(err);`
- `119: <StatusBar barStyle="light-content" />`
- `147: {loading ? (`
- `187: loading={creating}`
### payment_insurance_relevance
- `19: Card,`
- `111: // Family is one of the ONLY two guest-restricted areas (with insurance).`
- `229: <Card`
- `277: </Card>`
- `282: <Card`
- `300: </Card>`
### error_empty_loading_retry_cancel
- `69: const [loading, setLoading] = useState(true);`
- `79: setLoading(true);`
- `84: } catch (err: any) {`
- `92: setLoading(false);`
- `104: } catch (err) {`
- `105: console.error(err);`
- `147: {loading ? (`
- `187: loading={creating}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
