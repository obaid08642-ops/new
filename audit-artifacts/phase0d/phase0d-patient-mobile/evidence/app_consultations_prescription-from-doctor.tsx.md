# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/prescription-from-doctor.tsx`
- **Member SHA-256:** `9856162dc1912802c4804c7c8ace6e34daa574300f8a54d684675b021295ad56`
- **Line count:** 390
- **Read range:** `1-390`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router } from "expo-router";`
- `25: export default function PrescriptionFromDoctorScreen() {`
- `63: router.push("/pharmacy/rx-order");`
- `81: icon="download"`
- `82: onPress={() => {`
- `87: <IconButton icon="back" onPress={() => router.back()} />`
- `147: <TouchableOpacity onPress={addAllToReminders}>`
- `220: onPress={() => addToReminder(med.id)}`
- `229: onPress={() =>`
- `230: router.push({`
- `285: onPress={() => router.push("/consultations/follow-up")}`
- `326: onPress={orderFromPharmacy}`
### backend_consumers_or_contracts
- `39: // In production: apiFetch('/prescriptions/active')`
- `63: router.push("/pharmacy/rx-order");`
- `231: pathname: "/pharmacy/product-detail",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import React, { useState } from "react";`
- `7: StatusBar,`
- `28: const [addedToReminders, setAddedToReminders] = useState<string[]>([]);`
- `29: const [ordering, setOrdering] = useState(false);`
- `30: const [prescription, setPrescription] = useState<any>(null);`
- `31: const [loading, setLoading] = useState(true);`
- `42: console.log('Error fetching prescription', e);`
- `44: setLoading(false);`
- `69: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
- `93: {loading ? (`
- `123: color={colors.success}`
- `325: loading={ordering}`
### payment_insurance_relevance
- `16: Card,`
- `100: <Card`
- `126: </Card>`
- `129: <Card>`
- `134: </Card>`
- `157: <Card key={med.id}>`
- `238: </Card>`
- `247: <Card key={lab.id}>`
- `257: </Card>`
- `263: <Card style={{ backgroundColor: colors.warningSurface }}>`
- `281: </Card>`
- `284: <Card`
### error_empty_loading_retry_cancel
- `31: const [loading, setLoading] = useState(true);`
- `41: } catch (e) {`
- `42: console.log('Error fetching prescription', e);`
- `44: setLoading(false);`
- `61: setTimeout(() => {`
- `93: {loading ? (`
- `325: loading={ordering}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
