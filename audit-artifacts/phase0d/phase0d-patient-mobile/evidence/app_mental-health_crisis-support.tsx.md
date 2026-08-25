# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/mental-health/crisis-support.tsx`
- **Member SHA-256:** `bc22c54da4f5276c3f4a76782861caa73bc160874b0dfebd129883a13877c358`
- **Line count:** 88
- **Read range:** `1-88`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: import { router } from 'expo-router';`
- `13: export default function CrisisSupportScreen() {`
- `59: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>`
- `67: <TouchableOpacity accessibilityRole="button" onPress={() => call('911')} style={[styles.emergencyButton, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('emergencyCall'`
- `68: <TouchableOpacity accessibilityRole="button" onPress={() => call('937')} style={[styles.secondaryButton, { borderColor: '#B91C1C' }]}><Icon name="call" size={18} color="#B91C1C" /><AppText variant="caption" color="#991B1B">{t('saudi937')}</`
- `69: <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/consultations')} style={styles.consultationButton}><Icon name="doctor" size={18} color="#1D4ED8" /><AppText variant="caption" color="#1D4ED8">{t('consultation'`
- `74: <View style={styles.sectionHeading}><View><AppText variant="h6" color={colors.textPrimary}>{t('contacts')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('contactsBody')}</AppText></View><TouchableOpacity accessibilityRo`
- `76: {loading ? <View style={styles.loading}><ActivityIndicator color="#7A6BEA" /></View> : contacts.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface }]}><AppText variant="caption" color={colors.textSecondary} style={`
- `80: <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText variant="h5" color={colors.textPrimary}>{t('addContact')}</AppText><TextInput value={name} onChangeText={setName} placeholder={t('`
- `87: container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'cen`
### backend_consumers_or_contracts
- `30: const result: any = await apiFetch('/mental-health/crisis-contacts');`
- `46: await apiFetch('/mental-health/crisis-contacts', { method: 'POST', body: JSON.stringify({ contact_name: name.trim(), phone: phone.trim(), ...(relationship.trim() ? { relationship: relationship.trim() } : {}) }) });`
- `53: try { await apiFetch(`/mental-health/crisis-contacts/${id}`, { method: 'DELETE' }); await loadContacts(); } catch { setDeleteError(true); }`
### auth_ownership
- `59: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>`
- `67: <TouchableOpacity accessibilityRole="button" onPress={() => call('911')} style={[styles.emergencyButton, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('emergencyCall'`
- `68: <TouchableOpacity accessibilityRole="button" onPress={() => call('937')} style={[styles.secondaryButton, { borderColor: '#B91C1C' }]}><Icon name="call" size={18} color="#B91C1C" /><AppText variant="caption" color="#991B1B">{t('saudi937')}</`
- `69: <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/consultations')} style={styles.consultationButton}><Icon name="doctor" size={18} color="#1D4ED8" /><AppText variant="caption" color="#1D4ED8">{t('consultation'`
- `74: <View style={styles.sectionHeading}><View><AppText variant="h6" color={colors.textPrimary}>{t('contacts')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('contactsBody')}</AppText></View><TouchableOpacity accessibilityRo`
- `76: {loading ? <View style={styles.loading}><ActivityIndicator color="#7A6BEA" /></View> : contacts.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface }]}><AppText variant="caption" color={colors.textSecondary} style={`
### state_transitions
- `1: import React, { useCallback, useEffect, useState } from 'react';`
- `17: const [contacts, setContacts] = useState<Contact[]>([]);`
- `18: const [loading, setLoading] = useState(true);`
- `19: const [showForm, setShowForm] = useState(false);`
- `20: const [name, setName] = useState('');`
- `21: const [phone, setPhone] = useState('');`
- `22: const [relationship, setRelationship] = useState('');`
- `23: const [saving, setSaving] = useState(false);`
- `24: const [formError, setFormError] = useState(false);`
- `25: const [deleteError, setDeleteError] = useState(false);`
- `28: setLoading(true);`
- `35: setLoading(false);`
### payment_insurance_relevance
- `63: <View style={[styles.urgentCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>`
- `76: {loading ? <View style={styles.loading}><ActivityIndicator color="#7A6BEA" /></View> : contacts.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface }]}><AppText variant="caption" color={colors.textSecondary} style={`
- `87: container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'cen`
### error_empty_loading_retry_cancel
- `18: const [loading, setLoading] = useState(true);`
- `24: const [formError, setFormError] = useState(false);`
- `25: const [deleteError, setDeleteError] = useState(false);`
- `28: setLoading(true);`
- `32: } catch {`
- `35: setLoading(false);`
- `43: if (!name.trim() || !phone.trim() || saving) { setFormError(true); return; }`
- `44: setSaving(true); setFormError(false);`
- `48: } catch { setFormError(true); } finally { setSaving(false); }`
- `52: setDeleteError(false);`
- `53: try { await apiFetch(`/mental-health/crisis-contacts/${id}`, { method: 'DELETE' }); await loadContacts(); } catch { setDeleteError(true); }`
- `59: <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
