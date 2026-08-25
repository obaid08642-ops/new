# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/share-report.tsx`
- **Member SHA-256:** `267fa4146750d47dcf9b96ca468edba8e6e5e8d30d2f5789f0626ef9098a0a6b`
- **Line count:** 262
- **Read range:** `1-262`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { router } from "expo-router";`
- `42: export default function ShareReportScreen() {`
- `88: router.back();`
- `111: <IconButton icon="back" onPress={() => router.back()} />`
- `151: onPress={() => router.push("/reports/hub")}`
- `157: const isLab = !!r.lab_booking_id;`
- `161: onPress={() => toggle(r.id)}`
- `192: name={isLab ? "testTube" : r.radiology_booking_id ? "scan" : "document"}`
- `227: onPress={handleShare}`
### backend_consumers_or_contracts
- `53: const res = await apiFetch("/medical-reports/mine?limit=100");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: import React, { useState, useEffect } from "react";`
- `10: StatusBar,`
- `45: const [reports, setReports] = useState<any[]>([]);`
- `46: const [loading, setLoading] = useState(true);`
- `47: const [selected, setSelected] = useState<string[]>([]);`
- `48: const [sending, setSending] = useState(false);`
- `56: console.error(e);`
- `59: setLoading(false);`
- `98: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `137: {loading ? (`
- `226: loading={sending}`
### payment_insurance_relevance
- `22: Card,`
- `117: <Card style={{ backgroundColor: colors.infoSurface }}>`
- `134: </Card>`
- `142: <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>`
- `153: </Card>`
- `159: <Card`
- `163: st.reportCard,`
- `204: </Card>`
- `245: reportCard: { borderWidth: 1, borderColor: "transparent" },`
### error_empty_loading_retry_cancel
- `2: // EPIC4/S21: was a hardcoded REPORTS list + setTimeout "share" that did`
- `37: } catch {`
- `46: const [loading, setLoading] = useState(true);`
- `55: } catch (e) {`
- `56: console.error(e);`
- `59: setLoading(false);`
- `89: } catch {`
- `137: {loading ? (`
- `226: loading={sending}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
