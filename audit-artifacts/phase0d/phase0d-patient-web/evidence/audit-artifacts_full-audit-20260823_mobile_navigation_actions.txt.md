# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/mobile_navigation_actions.txt`
- **Member SHA-256:** `6724e668efe5bf4422f35316920c2869be0b47ea02905341aef7d151e0b71321`
- **Line count:** 1095
- **Read range:** `1-1095`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: /home/ubuntu/nabdah_review/extracted/mobile/app/ai-assistant.tsx:106:      <Stack.Screen options={{ title: 'المساعد الطبي AI' }} />`
- `2: /home/ubuntu/nabdah_review/extracted/mobile/app/ai-assistant.tsx:135:            onPress={() => router.push('/ai/prescription-translator')}`
- `3: /home/ubuntu/nabdah_review/extracted/mobile/app/ai-assistant.tsx:142:            onSubmitEditing={sendMessage}`
- `4: /home/ubuntu/nabdah_review/extracted/mobile/app/ai-assistant.tsx:150:            onPress={sendMessage}`
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:119:                        <Stack.Screen name="index" />`
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:120:                        <Stack.Screen name="(onboarding)" />`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:121:                        <Stack.Screen name="(auth)" />`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:122:                        <Stack.Screen name="(tabs)" />`
- `9: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:123:                        <Stack.Screen name="room/[id]" />`
- `10: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:124:                        <Stack.Screen name="ai-assistant" />`
- `11: /home/ubuntu/nabdah_review/extracted/mobile/app/_layout.tsx:125:                        <Stack.Screen name="shared/location-picker" options={{ presentation: 'modal' }} />`
- `12: /home/ubuntu/nabdah_review/extracted/mobile/app/services/index.tsx:80:        <IconButton icon="back" onPress={() => router.back()} />`
### backend_consumers_or_contracts
- `61: /home/ubuntu/nabdah_review/extracted/mobile/app/orders/index.tsx:195:          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />`
- `62: /home/ubuntu/nabdah_review/extracted/mobile/app/orders/index.tsx:207:              onPress={() => setTab(key)}`
- `63: /home/ubuntu/nabdah_review/extracted/mobile/app/orders/index.tsx:222:        <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#F`
- `64: /home/ubuntu/nabdah_review/extracted/mobile/app/orders/index.tsx:257:                onPress={() => it.route && router.push(it.route)}`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/settings/notifications-settings.tsx:197:        <IconButton icon="back" onPress={() => router.back()} />`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}`
- `110: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:98:            onPress={() => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: (params.bookingId || '') as string } })}`
- `111: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:107:            onPress={() => router.replace('/wallet/hub')}`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/barcode-scanner.tsx:108:        <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />`
- `135: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/barcode-scanner.tsx:120:              <Button label="منح إذن الكاميرا" variant="gradient" icon="photo_camera" onPress={requestPermission} style={{ marginTop: 16 }} />`
- `136: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/barcode-scanner.tsx:150:                onPress={captureAndIdentify}`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/barcode-scanner.tsx:160:          <TouchableOpacity onPress={() => router.push('/pharmacy/drug-not-found')} style={{ marginTop: 16 }}>`
### auth_ownership
- `20: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/_layout.tsx:9:      <Stack.Screen name="login" />`
- `22: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/_layout.tsx:11:      <Stack.Screen name="otp" />`
- `35: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:80:          {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
- `49: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:220:        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: resolveColor('var(--s)', isDark), borderColor: resolveColor('var(--bd)',`
- `50: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:274:            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>`
- `51: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:283:          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>`
- `52: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:297:          onPress={handleLogin}`
- `53: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:307:          onPress={() => router.push({ pathname: '/(auth)/otp', params: { phone: '+966' + phone.replace(/^0+/, ''), mode: 'login' } })}`
- `54: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:323:          <TouchableOpacity onPress={() => handleSocialLogin('google')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity`
- `55: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:329:          <TouchableOpacity onPress={() => handleSocialLogin('apple')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} activeOpacity=`
- `56: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:335:          <TouchableOpacity onPress={() => handleSocialLogin('snapchat')} style={[styles.modernSocialBtn, { backgroundColor: '#FFFC00' }]} activeOpacity={0.8}>`
- `57: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:340:          <TouchableOpacity onPress={() => handleSocialLogin('twitter')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacit`
### state_transitions
- `35: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:80:          {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/index.tsx:54:          {loadError && <AppText variant="labelMD" color={colors.primary} onPress={load}>إعادة المحاولة</AppText>}`
- `63: /home/ubuntu/nabdah_review/extracted/mobile/app/orders/index.tsx:222:        <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#F`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:60:          onPress={() => router.back()}`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}`
- `74: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:82:        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>`
- `82: /home/ubuntu/nabdah_review/extracted/mobile/app/reports/hub.tsx:154:              <Button label="إعادة المحاولة" size="sm" full={false} onPress={() => { setLoading(true); load(); }} />`
- `108: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:73:          onPress={() => {`
- `109: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:82:          <TouchableOpacity onPress={() => {`
- `110: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:98:            onPress={() => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: (params.bookingId || '') as string } })}`
- `111: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:107:            onPress={() => router.replace('/wallet/hub')}`
- `112: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx:114:        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ borderRadius: 16, overflow: 'hidden' }}>`
### payment_insurance_relevance
- `35: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:80:          {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
- `36: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:81:          <Button label="العودة" variant="ghost" onPress={() => router.back()} />`
- `37: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:101:            <IconButton icon="share" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleShare} />`
- `38: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:102:            <IconButton icon="back" bg="rgba(255,255,255,0.25)" color="#fff" onPress={() => router.back()} />`
- `39: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:187:                  onPress={() => handleBookProvider(p)}`
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/index.tsx:40:        <IconButton icon="back" onPress={() => router.back()} />`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/index.tsx:54:          {loadError && <AppText variant="labelMD" color={colors.primary} onPress={load}>إعادة المحاولة</AppText>}`
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/index.tsx:59:            <TouchableOpacity key={o.id || i} activeOpacity={0.85} onPress={() => o.id && router.push(`/offers/${o.id}`)}>`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:60:          onPress={() => router.back()}`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}`
- `74: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:82:        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failure.tsx:66:            onPress={() => router.back()}`
### error_empty_loading_retry_cancel
- `14: /home/ubuntu/nabdah_review/extracted/mobile/app/settings/about.tsx:59:    Linking.openURL(url).catch(() => {});`
- `35: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/[id].tsx:80:          {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/offers/index.tsx:54:          {loadError && <AppText variant="labelMD" color={colors.primary} onPress={load}>إعادة المحاولة</AppText>}`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/settings/help.tsx:94:                else if (supportPhone) Linking.openURL(`tel:${supportPhone}`).catch(() => {});`
- `63: /home/ubuntu/nabdah_review/extracted/mobile/app/orders/index.tsx:222:        <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#F`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:60:          onPress={() => router.back()}`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}`
- `74: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:82:        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>`
- `82: /home/ubuntu/nabdah_review/extracted/mobile/app/reports/hub.tsx:154:              <Button label="إعادة المحاولة" size="sm" full={false} onPress={() => { setLoading(true); load(); }} />`
- `156: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/broadcast-status.tsx:89:              {bid.status === 'pending' && <Button label="قبول هذا العرض" variant="gradient" size="md" loading={acceptingBid === bid.id} disabled={acceptingBid`
- `165: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/index.tsx:115:        {!isGuest && <Button label="تسجيل الخروج" variant="outline" icon="logout" onPress={handleLogout} style={{ borderColor: colors.error }}/>}`
- `179: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/order-tracking.tsx:246:      <TouchableOpacity onPress={retry} style={{ backgroundColor: '#23B5CE', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
