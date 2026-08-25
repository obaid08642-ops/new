# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase6-advanced-gap-inventory.txt`
- **Member SHA-256:** `e3c3a860bcef28d6d0e4a050b71ed6e430f288a653f1766784eb3cd07ce8e13d`
- **Line count:** 297
- **Read range:** `1-297`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: === mobile advanced screens ===`
- `63: /home/ubuntu/nabdah_review/extracted/mobile/app/reviews/index.tsx:99:          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>`
- `64: /home/ubuntu/nabdah_review/extracted/mobile/app/reviews/index.tsx:126:                onPress={() => setOverallRating(star)}`
- `65: /home/ubuntu/nabdah_review/extracted/mobile/app/reviews/index.tsx:160:                    onPress={() => setAspect(aspect, s)}`
- `66: /home/ubuntu/nabdah_review/extracted/mobile/app/reviews/index.tsx:200:            onPress={() => setAnonymous(!anonymous)}`
- `67: /home/ubuntu/nabdah_review/extracted/mobile/app/reviews/index.tsx:219:          onPress={handleSubmit}`
- `68: /home/ubuntu/nabdah_review/extracted/mobile/app/voice/index.tsx:83:            onPress={() => router.back()}`
- `69: /home/ubuntu/nabdah_review/extracted/mobile/app/voice/index.tsx:101:            onPress={() => router.push(a.route)}`
- `74: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:86:          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn} accessibilityLabel="رجوع">`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:105:            <TouchableOpacity onPress={() => router.replace('/ai/monthly-report')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}><AppText variant="`
- `76: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:115:            <TouchableOpacity onPress={() => router.push('/health/vitals-log')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>`
- `77: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:173:                  onPress={() => setExpandedVital(expandedVital === key ? null : key)}`
### backend_consumers_or_contracts
- `55: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/cards.tsx`
- `56: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx`
- `57: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/topup.tsx`
- `58: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/transactions.tsx`
- `59: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/transfer.tsx`
- `61: === advanced mobile API/action markers ===`
- `62: /home/ubuntu/nabdah_review/extracted/mobile/app/reviews/index.tsx:64:      await apiFetch('/patient-ux/review', {`
- `70: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:39:        apiFetch('/care/appointments').then(parseReportCollection),`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:40:        apiFetch('/health/vitals/summary').then(parseReportCollection),`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:41:        apiFetch('/health/chronic-meds').then(parseReportCollection),`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/monthly-report.tsx:42:        apiFetch('/health/trends').then(parseReportCollection),`
- `85: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/prescription-translator.tsx:239:                      <Button label={med.price != null ? `اطلب — ${med.price} ر.س` : 'اطلب من الصيدلية'} variant="primary" icon="shopping_cart" size="sm" ful`
### auth_ownership
- `92: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:45:    return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: clinical ? '#9A3412' : '#0F766E', pa`
- `93: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `95: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:51:      <View style={[styles.header, { backgroundColor: emergency ? '#991B1B' : '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={`
- `96: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:57:          {emergency ? <TouchableOpacity accessibilityRole="button" onPress={callLocalEmergency} style={[styles.primaryAction, { backgroundColor: '#B91C1C' }]}><Icon name="cal`
- `97: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:61:        <TouchableOpacity accessibilityRole="button" onPress={reset} style={[styles.outlineAction, { borderColor: colors.border }]}><AppText variant="h6" color={colors.textPri`
- `98: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:67:    <View style={[styles.header, { backgroundColor: '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style`
- `99: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:71:      <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => {`
- `100: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:73:      <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.primaryAction, { backgroundColor: '#312E81', opacity: sub`
- `146: /home/ubuntu/nabdah_review/extracted/mobile/app/loyalty/referrals.tsx:112:        <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />`
- `175: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:59:        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="ba`
- `176: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:67:          <TouchableOpacity accessibilityRole="button" onPress={() => call('911')} style={[styles.emergencyButton, { backgroundColor: '#B91C1C' }]}><Icon na`
- `177: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:68:          <TouchableOpacity accessibilityRole="button" onPress={() => call('937')} style={[styles.secondaryButton, { borderColor: '#B91C1C' }]}><Icon name="`
### state_transitions
- `83: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/prescription-translator.tsx:149:            <Button label="ابدأ الترجمة" variant="gradient" icon="robot" loading={translating} onPress={handleSelectImage} />`
- `93: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `99: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:71:      <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => {`
- `102: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/sos-active.tsx:79:              await apiFetch(`/emergency/${sosId}/cancel`, { method: 'POST' });`
- `104: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/sos-active.tsx:100:        <IconButton icon="close" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleCancelSOS} />`
- `107: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/sos-active.tsx:187:          <Button label="إلغاء الطلب" variant="outline" size="lg" style={{ flex: 0.8 }} onPress={handleCancelSOS} />`
- `116: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/tracking.tsx:60:          {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}`
- `168: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/hub.tsx:17:  const load = React.useCallback(async () => { setLoading(true); setError(null); try { const response: any = await apiFetch('/maternity/profile'); setProfile(response?.dat`
- `169: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/hub.tsx:20:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.he`
- `170: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:15:  const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setErro`
- `171: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:16:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style`
- `174: /home/ubuntu/nabdah_review/extracted/mobile/app/mental-health/crisis-support.tsx:53:    try { await apiFetch(`/mental-health/crisis-contacts/${id}`, { method: 'DELETE' }); await loadContacts(); } catch { setDeleteError(true); }`
### payment_insurance_relevance
- `55: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/cards.tsx`
- `56: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/hub.tsx`
- `57: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/topup.tsx`
- `58: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/transactions.tsx`
- `59: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/transfer.tsx`
- `84: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/prescription-translator.tsx:183:              <Card key={i} onPress={() => setExpandedMed(expandedMed === i ? null : i)}>`
- `85: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/prescription-translator.tsx:239:                      <Button label={med.price != null ? `اطلب — ${med.price} ر.س` : 'اطلب من الصيدلية'} variant="primary" icon="shopping_cart" size="sm" ful`
- `90: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/prescription-translator.tsx:264:            <Card onPress={() => { setTranslated(false); setExpandedMed(null); }} style={{ alignItems: 'center', gap: 8, borderStyle: 'dashed', borderWidth: `
- `93: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `99: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/triage.tsx:71:      <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => {`
- `123: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/cards.tsx:65:      const res = await apiFetch("/wallet/cards");`
- `124: /home/ubuntu/nabdah_review/extracted/mobile/app/wallet/cards.tsx:106:              const res = await apiFetch(`/wallet/cards/${cardId}`, {`
### error_empty_loading_retry_cancel
- `83: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/prescription-translator.tsx:149:            <Button label="ابدأ الترجمة" variant="gradient" icon="robot" loading={translating} onPress={handleSelectImage} />`
- `93: /home/ubuntu/nabdah_review/extracted/mobile/app/ai/skin-analysis.tsx:48:  return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: '#0F766E', paddingTop: insets.top + 12`
- `102: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/sos-active.tsx:79:              await apiFetch(`/emergency/${sosId}/cancel`, { method: 'POST' });`
- `104: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/sos-active.tsx:100:        <IconButton icon="close" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleCancelSOS} />`
- `107: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/sos-active.tsx:187:          <Button label="إلغاء الطلب" variant="outline" size="lg" style={{ flex: 0.8 }} onPress={handleCancelSOS} />`
- `116: /home/ubuntu/nabdah_review/extracted/mobile/app/emergency/tracking.tsx:60:          {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/loyalty/hub.tsx:68:      const configRes = await apiFetch('/loyalty/config').catch(() => null);`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/loyalty/hub.tsx:74:      const rewardsRes = await apiFetch('/loyalty/rewards').catch(() => null);`
- `168: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/hub.tsx:17:  const load = React.useCallback(async () => { setLoading(true); setError(null); try { const response: any = await apiFetch('/maternity/profile'); setProfile(response?.dat`
- `169: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/hub.tsx:20:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.he`
- `170: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:15:  const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setErro`
- `171: /home/ubuntu/nabdah_review/extracted/mobile/app/maternity/maternity-setup.tsx:16:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
