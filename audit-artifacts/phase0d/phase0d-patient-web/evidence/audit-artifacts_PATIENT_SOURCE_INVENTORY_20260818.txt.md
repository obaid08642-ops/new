# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_SOURCE_INVENTORY_20260818.txt`
- **Member SHA-256:** `8f73c3fae63eda739c2f783f7f5a525494e5c47453309943019512acc9843081`
- **Line count:** 300
- **Read range:** `1-300`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: app/(auth)/login.tsx`
- `8: app/(auth)/register.tsx`
- `16: app/consultations/booking-confirm.tsx`
- `58: ## route/navigation markers`
- `59: /home/ubuntu/nabdah-remediation/patient-app/src/context/SocketContext.tsx:140:        // because router.push inside this pure context can sometimes miss the navigation tree`
- `60: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:141:            onPress={() => router.push("/health/health-id")}`
- `61: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:152:            onPress={() => router.push("/health/edit-profile")}`
- `62: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:173:                onPress={() => router.push(q.route as any)}`
- `63: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:202:            onAction={() => router.push("/health/vitals")}`
- `64: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:212:                  onPress={() => router.push("/health/vitals")}`
- `65: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:259:          onPress={() => router.push("/(tabs)/nursing")}`
- `66: /home/ubuntu/nabdah-remediation/patient-app/app/(tabs)/health.tsx:288:              onAction={() => router.push("/consultations/appointments")}`
### backend_consumers_or_contracts
- `11: app/(tabs)/pharmacy.tsx`
- `15: app/consultations/appointments.tsx`
- `31: app/insurance/hub.tsx`
- `35: app/nursing/nurse-profile.tsx`
- `37: app/pharmacy/barcode-scanner.tsx`
- `38: app/pharmacy/filters.tsx`
- `39: app/pharmacy/medicine-compare.tsx`
- `40: app/pharmacy/order-confirm.tsx`
- `41: app/pharmacy/order-history.tsx`
- `42: app/pharmacy/order-tracking.tsx`
- `43: app/pharmacy/pharmacist-chat.tsx`
- `44: app/pharmacy/waiting-for-pharmacy.tsx`
### auth_ownership
- `6: app/(auth)/login.tsx`
- `7: app/(auth)/otp.tsx`
- `14: app/community/live-session.tsx`
- `49: src/__tests__/auth/SessionManager.test.ts`
- `53: src/core/platform/auth/SessionManager.ts`
- `91: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/otp.tsx:81:          router.replace({ pathname: '/(auth)/reset-password', params: { email: emailParam } });`
- `92: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/otp.tsx:135:        router.replace('/(auth)/provider-info' as any);`
- `93: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/otp.tsx:137:        router.replace('/(tabs)');`
- `94: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/login.tsx:105:        router.replace('/(auth)/provider-info' as any);`
- `95: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/login.tsx:107:        router.replace('/(tabs)');`
- `96: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/login.tsx:178:        router.replace('/(auth)/provider-info' as any);`
- `97: /home/ubuntu/nabdah-remediation/patient-app/app/(auth)/login.tsx:180:        router.replace('/(tabs)');`
### state_transitions
- `36: app/payments/failed.tsx`
- `154: /home/ubuntu/nabdah-remediation/patient-app/app/nursing/nurse-profile.tsx:130:        <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/(tabs)')}>`
- `158: /home/ubuntu/nabdah-remediation/patient-app/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}`
- `159: /home/ubuntu/nabdah-remediation/patient-app/app/payments/failed.tsx:82:        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>`
- `175: "/consultations/cancel-reschedule"`
- `230: '/consultations/booking-success'`
- `293: '/wallet/spending-data'`
### payment_insurance_relevance
- `31: app/insurance/hub.tsx`
- `36: app/payments/failed.tsx`
- `47: app/wallet/hub.tsx`
- `80: /home/ubuntu/nabdah-remediation/patient-app/app/pharmacy/order-confirm.tsx:54:      router.push({ pathname: '/pharmacy/payment', params: { orderId, total: order?.total || 0 } });`
- `90: /home/ubuntu/nabdah-remediation/patient-app/app/pharmacy/pharmacist-chat.tsx:237:                        onPress={() => router.push("/pharmacy/payment")}`
- `115: /home/ubuntu/nabdah-remediation/patient-app/app/consultations/booking-confirm.tsx:279:                <Button label="تعديل بيانات التأمين" variant="ghost" icon="edit" onPress={() => router.push('/profile/insurance')} />`
- `130: /home/ubuntu/nabdah-remediation/patient-app/app/health/vitals-log.tsx:208:        <Card onPress={() => router.push('/health/conditions-allergies')} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>`
- `140: /home/ubuntu/nabdah-remediation/patient-app/app/wallet/hub.tsx:154:              onPress={() => router.push(action.route as any)}`
- `141: /home/ubuntu/nabdah-remediation/patient-app/app/wallet/hub.tsx:219:            <TouchableOpacity onPress={() => router.push('/wallet/transactions')}>`
- `142: /home/ubuntu/nabdah-remediation/patient-app/app/insurance/hub.tsx:210:          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/insurance/add-policy')} />`
- `143: /home/ubuntu/nabdah-remediation/patient-app/app/insurance/hub.tsx:289:              onPress={() => router.push(a.route as any)}`
- `144: /home/ubuntu/nabdah-remediation/patient-app/app/insurance/hub.tsx:302:            <TouchableOpacity onPress={() => router.push('/insurance/benefits-summary')}>`
### error_empty_loading_retry_cancel
- `36: app/payments/failed.tsx`
- `150: /home/ubuntu/nabdah-remediation/patient-app/app/voice/index.tsx:165:            setTimeout(() => router.push("/emergency/sos"), 1500);`
- `158: /home/ubuntu/nabdah-remediation/patient-app/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}`
- `159: /home/ubuntu/nabdah-remediation/patient-app/app/payments/failed.tsx:82:        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>`
- `175: "/consultations/cancel-reschedule"`
- `293: '/wallet/spending-data'`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
