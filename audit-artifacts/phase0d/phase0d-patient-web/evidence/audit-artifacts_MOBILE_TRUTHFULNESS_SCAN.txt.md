# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/MOBILE_TRUTHFULNESS_SCAN.txt`
- **Member SHA-256:** `aa45fd7f0f1484c46775eab8910290a63edf93602dddfd7cfd3c6886b4fbb07e`
- **Line count:** 608
- **Read range:** `1-608`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `65: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/checkout.tsx:254:            placeholder="أدخل كود الكوبون"`
- `66: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/checkout.tsx:255:            placeholderTextColor={colors.t2}`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/nutrition/body-target.tsx:23:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[s`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:80:        <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText variant="h5" color={colors.textPrimary`
- `76: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:16:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/health/vitals-log.tsx:63:    {showForm && <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={sty`
- `94: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-add.tsx:70:      <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colo`
- `108: /home/ubuntu/nabdah_review/extracted/mobile/app/health/conditions-allergies.tsx:58:  return <Card style={styles.section}><AppText variant="h6" align="right">{title}</AppText><Input value={value} onChangeText={onChange} placeholder={placehol`
- `112: /home/ubuntu/nabdah_review/extracted/mobile/app/family/chat.tsx:173:          <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.su`
- `115: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/upload-rx.tsx:3:// This file previously rendered a bare "Upload" placeholder stub.`
- `119: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:120:      // "AI processing" then displayed hardcoded tests (CBC, Vitamin D).`
- `125: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/offer/[id].tsx:3:// E2: this screen was fully broken — `promos` was a hardcoded empty array so`
### backend_consumers_or_contracts
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/topup.tsx:151:            placeholder="المبلغ (ر.س)"`
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/topup.tsx:152:            placeholderTextColor={colors.textTertiary}`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:337:                placeholder="الاسم على البطاقة"`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:338:                placeholderTextColor={colors.textTertiary}`
- `9: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:344:                placeholder="رقم البطاقة"`
- `10: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:345:                placeholderTextColor={colors.textTertiary}`
- `11: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:352:                placeholder="تاريخ الانتهاء (MM/YY)"`
- `12: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:353:                placeholderTextColor={colors.textTertiary}`
- `33: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:260:            placeholder="رقم الوثيقة"`
- `34: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:261:            placeholderTextColor={colors.textTertiary}`
- `35: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:268:            placeholder="رقم العضوية (اختياري)"`
- `36: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:269:            placeholderTextColor={colors.textTertiary}`
### auth_ownership
- `94: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-add.tsx:70:      <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colo`
- `109: /home/ubuntu/nabdah_review/extracted/mobile/app/family/member-health.tsx:105:      // Honest failure: no permission or network — show empty state, not dummy data`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `157: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:246:              placeholder="example@mail.com"`
- `158: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:247:              placeholderTextColor={resolveColor('var(--t3)', isDark)}`
- `159: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:266:              placeholder="••••••••"`
- `160: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx:267:              placeholderTextColor={resolveColor('var(--t3)', isDark)}`
- `327: /home/ubuntu/nabdah_review/extracted/mobile/app/notifications/index.tsx:189:            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.body}`} activeOpacity={0.85} onPress={() => openNotif(n)}>`
- `330: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/mood-journal.tsx:118:        <TouchableOpacity accessibilityRole="button" disabled={!selectedMood || saving} onPress={() => void submit()} style={[styles.saveButton, { background`
- `333: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/hub.tsx:40:          <TouchableOpacity key={card.key} accessibilityRole="button" onPress={() => router.push(card.route as any)} activeOpacity={0.82} style={[styles.card, { backgr`
- `437: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx:88:          <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />`
- `485: /home/ubuntu/nabdah_review/extracted/mobile/app/settings/security.tsx:106:            await apiFetch(`/users/me/sessions/${s.id}`, { method: 'DELETE' });`
### state_transitions
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/nutrition/body-target.tsx:23:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[s`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:80:        <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText variant="h5" color={colors.textPrimary`
- `76: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:16:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/health/vitals-log.tsx:63:    {showForm && <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={sty`
- `94: /home/ubuntu/nabdah_review/extracted/mobile/app/health/medication-reminder-add.tsx:70:      <Animated.View entering={FadeInDown.delay(70).duration(300)}><Card style={styles.section}><SectionTitle index="2" title={t('schedule')} colors={colo`
- `104: /home/ubuntu/nabdah_review/extracted/mobile/app/health/edit-profile.tsx:72:      <Card style={styles.section}><AppText variant="h6" align="right">المعلومات الصحية الأساسية</AppText><AppText variant="caption" color={colors.textTertiary} alig`
- `108: /home/ubuntu/nabdah_review/extracted/mobile/app/health/conditions-allergies.tsx:58:  return <Card style={styles.section}><AppText variant="h6" align="right">{title}</AppText><Input value={value} onChangeText={onChange} placeholder={placehol`
- `109: /home/ubuntu/nabdah_review/extracted/mobile/app/family/member-health.tsx:105:      // Honest failure: no permission or network — show empty state, not dummy data`
- `125: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/offer/[id].tsx:3:// E2: this screen was fully broken — `promos` was a hardcoded empty array so`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `183: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:434:  spendingCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
- `197: /home/ubuntu/nabdah_review/extracted/mobile/app/shared/location-picker.tsx:65:  const [pin, setPin] = useState({ lat: 24.7136, lng: 46.6753 });`
### payment_insurance_relevance
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/topup.tsx:151:            placeholder="المبلغ (ر.س)"`
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/topup.tsx:152:            placeholderTextColor={colors.textTertiary}`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:337:                placeholder="الاسم على البطاقة"`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:338:                placeholderTextColor={colors.textTertiary}`
- `9: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:344:                placeholder="رقم البطاقة"`
- `10: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:345:                placeholderTextColor={colors.textTertiary}`
- `11: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:352:                placeholder="تاريخ الانتهاء (MM/YY)"`
- `12: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:353:                placeholderTextColor={colors.textTertiary}`
- `26: /home/ubuntu/nabdah_review/extracted/mobile/app/search/index.tsx:112:            style={{ flex: 1, fontSize: 13, color: colors.n, textAlign: isRTL ? 'right' : 'left' }} placeholder={lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل، مقال، تأمين...`
- `33: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:260:            placeholder="رقم الوثيقة"`
- `34: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:261:            placeholderTextColor={colors.textTertiary}`
- `35: /home/ubuntu/nabdah_review/extracted/mobile/app/profile/insurance.tsx:268:            placeholder="رقم العضوية (اختياري)"`
### error_empty_loading_retry_cancel
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/nutrition/body-target.tsx:23:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[s`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:80:        <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText variant="h5" color={colors.textPrimary`
- `76: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:16:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/health/vitals-log.tsx:63:    {showForm && <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.surface }]}><View style={sty`
- `108: /home/ubuntu/nabdah_review/extracted/mobile/app/health/conditions-allergies.tsx:58:  return <Card style={styles.section}><AppText variant="h6" align="right">{title}</AppText><Input value={value} onChangeText={onChange} placeholder={placehol`
- `109: /home/ubuntu/nabdah_review/extracted/mobile/app/family/member-health.tsx:105:      // Honest failure: no permission or network — show empty state, not dummy data`
- `122: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/share-report.tsx:2:// EPIC4/S21: was a hardcoded REPORTS list + setTimeout "share" that did`
- `125: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/offer/[id].tsx:3:// E2: this screen was fully broken — `promos` was a hardcoded empty array so`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `138: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/pharmacy.tsx:136:          // Offline — cached copy (if any) already shown above; never mock data`
- `183: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx:434:  spendingCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },`
- `296: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx:102:    backgroundColor: "rgba(255,255,255,0.15)",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
