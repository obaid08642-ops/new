# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/family/permissions.tsx`
- **Member SHA-256:** `d3887b57c0f5bb4d90901ce747760699111b5b3870815d99913d24dd06843a39`
- **Line count:** 408
- **Read range:** `1-408`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router, useLocalSearchParams } from "expo-router";`
- `65: key: "booking",`
- `101: export default function FamilyPermissionsScreen() {`
- `164: router.back();`
- `179: { text: "إلغاء", style: "cancel" },`
- `183: onPress: async () => {`
- `189: router.back();`
- `192: router.back();`
- `234: <IconButton icon="back" onPress={() => router.back()} />`
- `310: onPress={handleRemoveMember}`
- `369: onPress={handleSave}`
### backend_consumers_or_contracts
- `119: const group = await apiFetch("/family/my-group");`
- `147: await apiFetch(`/family/member/${memberId}/permissions`, {`
- `153: await apiFetch("/family/permissions/request", {`
- `186: await apiFetch(`/family/remove-member/${memberId}`, {`
### auth_ownership
- `27: interface Permission {`
- `35: const INITIAL_PERMS: Permission[] = [`
- `101: export default function FamilyPermissionsScreen() {`
- `110: const [perms, setPerms] = useState<Permission[]>(INITIAL_PERMS);`
- `121: const granted: string[] = member?.permissions || [];`
- `125: console.error("Could not load current permissions:", err);`
- `146: // Owner path: replace the member's permission set directly (grant + revoke)`
- `147: await apiFetch(`/family/member/${memberId}/permissions`, {`
- `149: body: JSON.stringify({ permissions: activeKeys }),`
- `151: } catch (ownerErr: any) {`
- `152: // Not the owner → fall back to the approval-request flow`
- `153: await apiFetch("/family/permissions/request", {`
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `7: StatusBar,`
- `110: const [perms, setPerms] = useState<Permission[]>(INITIAL_PERMS);`
- `111: const [loading, setLoading] = useState(true);`
- `112: const [saving, setSaving] = useState(false);`
- `113: const [notified, setNotified] = useState(false);`
- `124: // No group / network — keep defaults, save will surface any error`
- `125: console.error("Could not load current permissions:", err);`
- `127: setLoading(false);`
- `167: console.error(err);`
- `179: { text: "إلغاء", style: "cancel" },`
- `185: setLoading(true);`
### payment_insurance_relevance
- `18: Card,`
- `79: key: "payment",`
- `82: icon: "wallet",`
- `241: <Card`
- `258: </Card>`
- `261: <Card padding={0}>`
- `302: </Card>`
- `305: <Card style={{ backgroundColor: colors.errorSurface }}>`
- `313: </Card>`
- `327: <Card`
- `342: </Card>`
- `344: <Card style={{ backgroundColor: colors.infoSurface, marginBottom: 8 }}>`
### error_empty_loading_retry_cancel
- `111: const [loading, setLoading] = useState(true);`
- `123: } catch (err) {`
- `124: // No group / network — keep defaults, save will surface any error`
- `125: console.error("Could not load current permissions:", err);`
- `127: setLoading(false);`
- `151: } catch (ownerErr: any) {`
- `163: setTimeout(() => {`
- `166: } catch (err) {`
- `167: console.error(err);`
- `179: { text: "إلغاء", style: "cancel" },`
- `185: setLoading(true);`
- `190: } catch (err) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
