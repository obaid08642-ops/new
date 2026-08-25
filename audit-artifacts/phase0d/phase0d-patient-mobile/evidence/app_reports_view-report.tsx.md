# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/reports/view-report.tsx`
- **Member SHA-256:** `cdac162971c521b8119b84e2f92254926d1d3f30fef7d784ad1099b775e4d862`
- **Line count:** 262
- **Read range:** `1-262`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: import { router, useLocalSearchParams } from "expo-router";`
- `54: export default function ViewReportScreen() {`
- `110: <Button label="رجوع" size="sm" full={false} onPress={() => router.back()} />`
- `132: onPress={handleShare}`
- `141: onPress={() => router.back()}`
- `245: onPress={() =>`
- `246: router.push({ pathname: "/reports/ai-analysis", params: { id: report.id } })`
### backend_consumers_or_contracts
- `70: const res = await apiFetch(`/reports/${params.id}`);`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `4: // reports don't have (so it rendered empty), and its PDF/share buttons were`
- `5: // setTimeout + Alert simulations. Now: real fields, honest states, real Share.`
- `6: import React, { useState } from "react";`
- `11: StatusBar,`
- `58: const [report, setReport] = useState<any>(null);`
- `59: const [loading, setLoading] = useState(true);`
- `60: const [error, setError] = useState(false);`
- `65: setError(true);`
- `66: setLoading(false);`
- `73: console.error(err);`
- `74: setError(true);`
- `76: setLoading(false);`
### payment_insurance_relevance
- `21: Card,`
- `189: <Card>`
- `192: </Card>`
- `196: <Card>`
- `199: </Card>`
- `203: <Card>`
- `206: </Card>`
- `210: <Card>`
- `213: </Card>`
- `217: <Card key={ci}>`
- `230: </Card>`
- `234: <Card style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>`
### error_empty_loading_retry_cancel
- `4: // reports don't have (so it rendered empty), and its PDF/share buttons were`
- `5: // setTimeout + Alert simulations. Now: real fields, honest states, real Share.`
- `38: } catch {`
- `59: const [loading, setLoading] = useState(true);`
- `60: const [error, setError] = useState(false);`
- `65: setError(true);`
- `66: setLoading(false);`
- `72: } catch (err) {`
- `73: console.error(err);`
- `74: setError(true);`
- `76: setLoading(false);`
- `94: } catch {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
