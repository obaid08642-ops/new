# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/profile/insurance.tsx`
- **Member SHA-256:** `91c5eebbcf8f98b014f8f2d38bb38b7b9bd45e17a71e276ba1bbb6db2a5fe27c`
- **Line count:** 337
- **Read range:** `1-337`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import { router } from "expo-router";`
- `21: export default function InsuranceScreen() {`
- `54: // Insurance requires a registered account (guests are blocked by policy)`
- `139: onPress={() => router.back()}`
- `190: onPress={openForm}`
- `209: onPress={() => pickCompany(c)}`
- `240: onPress={() => setNetworkCode(n.code)}`
- `278: onPress={savePolicy}`
- `284: onPress={() => setShowForm(false)}`
- `306: onPress={openForm}`
### backend_consumers_or_contracts
- `40: const data = await apiFetch("/users/me/insurance");`
- `61: const list = await apiFetch("/insurance/companies");`
- `73: const nets = await apiFetch(`/insurance/companies/${c.id || c.code}/networks`);`
- `96: const saved = await apiFetch("/users/me/insurance", {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState, useEffect } from "react";`
- `25: const [insurance, setInsurance] = useState<any>(null);`
- `26: const [loading, setLoading] = useState(true);`
- `28: // Real add-policy form state (catalog-driven)`
- `29: const [showForm, setShowForm] = useState(false);`
- `30: const [companies, setCompanies] = useState<any[]>([]);`
- `31: const [networks, setNetworks] = useState<any[]>([]);`
- `32: const [companyId, setCompanyId] = useState<string | null>(null);`
- `33: const [networkCode, setNetworkCode] = useState<string | null>(null);`
- `34: const [policyNumber, setPolicyNumber] = useState("");`
- `35: const [memberId, setMemberId] = useState("");`
- `36: const [saving, setSaving] = useState(false);`
### payment_insurance_relevance
- `21: export default function InsuranceScreen() {`
- `25: const [insurance, setInsurance] = useState<any>(null);`
- `38: const loadInsurance = async () => {`
- `40: const data = await apiFetch("/users/me/insurance");`
- `41: setInsurance(data);`
- `43: setInsurance(null);`
- `50: loadInsurance();`
- `54: // Insurance requires a registered account (guests are blocked by policy)`
- `56: if (requireAuth("insurance")) return;`
- `61: const list = await apiFetch("/insurance/companies");`
- `73: const nets = await apiFetch(`/insurance/companies/${c.id || c.code}/networks`);`
- `88: const payload = {`
### error_empty_loading_retry_cancel
- `26: const [loading, setLoading] = useState(true);`
- `42: } catch {`
- `45: setLoading(false);`
- `63: } catch {`
- `75: } catch {`
- `105: } catch (e: any) {`
- `145: {loading ? (`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
