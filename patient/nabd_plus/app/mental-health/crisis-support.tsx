import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { mentalHealthT } from '../../src/i18n/mental-health';

type Contact = { id?: string; contact_name: string; phone: string; relationship?: string; is_professional?: boolean };

export default function CrisisSupportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, lang } = useApp();
  const t = (key: Parameters<typeof mentalHealthT>[1]) => mentalHealthT(lang, key);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await apiFetch('/mental-health/crisis-contacts');
      setContacts(Array.isArray(result?.user_contacts) ? result.user_contacts : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadContacts(); }, [loadContacts]);

  const call = (number: string) => { void Linking.openURL(`tel:${number.replace(/[^0-9+]/g, '')}`); };
  const saveContact = async () => {
    if (!name.trim() || !phone.trim() || saving) { setFormError(true); return; }
    setSaving(true); setFormError(false);
    try {
      await apiFetch('/mental-health/crisis-contacts', { method: 'POST', body: JSON.stringify({ contact_name: name.trim(), phone: phone.trim(), ...(relationship.trim() ? { relationship: relationship.trim() } : {}) }) });
      setName(''); setPhone(''); setRelationship(''); setShowForm(false); await loadContacts();
    } catch { setFormError(true); } finally { setSaving(false); }
  };
  const removeContact = async (id?: string) => {
    if (!id) return;
    setDeleteError(false);
    try { await apiFetch(`/mental-health/crisis-contacts/${id}`, { method: 'DELETE' }); await loadContacts(); } catch { setDeleteError(true); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#991B1B', paddingTop: insets.top + 12 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>
        <AppText variant="h4" color="#FFFFFF">{t('urgentHelp')}</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.urgentCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Icon name="warning" size={28} color="#B91C1C" />
          <AppText variant="h6" color="#991B1B">{t('urgentTitle')}</AppText>
          <AppText variant="caption" color="#7F1D1D" style={styles.centerText}>{t('urgentBody')}</AppText>
          <TouchableOpacity accessibilityRole="button" onPress={() => call('911')} style={[styles.emergencyButton, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('emergencyCall')}</AppText></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => call('937')} style={[styles.secondaryButton, { borderColor: '#B91C1C' }]}><Icon name="call" size={18} color="#B91C1C" /><AppText variant="caption" color="#991B1B">{t('saudi937')}</AppText></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/consultations')} style={styles.consultationButton}><Icon name="doctor" size={18} color="#1D4ED8" /><AppText variant="caption" color="#1D4ED8">{t('consultation')}</AppText></TouchableOpacity>
        </View>

        <View style={[styles.notice, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}><Icon name="info" size={18} color="#C2410C" /><AppText variant="caption" color="#9A3412" style={styles.noticeText}>{t('practiceNotice')}</AppText></View>

        <View style={styles.sectionHeading}><View><AppText variant="h6" color={colors.textPrimary}>{t('contacts')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('contactsBody')}</AppText></View><TouchableOpacity accessibilityRole="button" onPress={() => { setFormError(false); setShowForm(true); }} style={[styles.addButton, { backgroundColor: '#312E81' }]}><Icon name="add" size={18} color="#FFFFFF" /><AppText variant="caption" color="#FFFFFF">{t('addContact')}</AppText></TouchableOpacity></View>
        {deleteError && <AppText variant="caption" color="#B91C1C">{t('deleteError')}</AppText>}
        {loading ? <View style={styles.loading}><ActivityIndicator color="#7A6BEA" /></View> : contacts.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surface }]}><AppText variant="caption" color={colors.textSecondary} style={styles.centerText}>{t('noContacts')}</AppText></View> : contacts.map((contact) => <View key={contact.id || contact.phone} style={[styles.contactCard, { backgroundColor: colors.surface }]}><TouchableOpacity accessibilityRole="button" onPress={() => call(contact.phone)} style={[styles.callButton, { backgroundColor: '#7A6BEA' }]}><Icon name="call" size={19} color="#FFFFFF" /></TouchableOpacity><View style={styles.contactText}><AppText variant="h6" color={colors.textPrimary}>{contact.contact_name}</AppText>{contact.relationship ? <AppText variant="caption" color={colors.textTertiary}>{contact.relationship}</AppText> : null}<AppText variant="caption" color={colors.textSecondary}>{contact.phone}</AppText></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('delete')} onPress={() => void removeContact(contact.id)} style={styles.deleteButton}><Icon name="trash" size={18} color="#DC2626" /></TouchableOpacity></View>)}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.surface }]}><AppText variant="h5" color={colors.textPrimary}>{t('addContact')}</AppText><TextInput value={name} onChangeText={setName} placeholder={t('contactName')} placeholderTextColor={colors.textTertiary} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} /><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={t('contactPhone')} placeholderTextColor={colors.textTertiary} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} /><TextInput value={relationship} onChangeText={setRelationship} placeholder={t('contactRelationship')} placeholderTextColor={colors.textTertiary} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} />{formError && <AppText variant="caption" color="#B91C1C">{t('contactError')}</AppText>}<View style={styles.modalActions}><TouchableOpacity onPress={() => setShowForm(false)} style={[styles.modalCancel, { borderColor: colors.border }]}><AppText variant="caption" color={colors.textSecondary}>{t('cancel')}</AppText></TouchableOpacity><TouchableOpacity disabled={saving} onPress={() => void saveContact()} style={[styles.modalSave, { backgroundColor: '#312E81', opacity: saving ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText variant="caption" color="#FFFFFF">{t('add')}</AppText>}</TouchableOpacity></View></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', alignSelf: 'flex-end' }, content: { padding: 16, gap: 14, paddingBottom: 92 }, urgentCard: { padding: 18, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 12 }, centerText: { textAlign: 'center', lineHeight: 20 }, emergencyButton: { width: '100%', minHeight: 52, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondaryButton: { width: '100%', minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }, consultationButton: { width: '100%', minHeight: 42, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 }, notice: { padding: 13, borderWidth: 1, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }, noticeText: { flex: 1, textAlign: 'right', lineHeight: 19 }, sectionHeading: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, addButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }, loading: { padding: 24, alignItems: 'center' }, empty: { padding: 24, borderRadius: 16 }, contactCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 }, callButton: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, contactText: { flex: 1, alignItems: 'flex-end', gap: 2 }, deleteButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.52)', justifyContent: 'center', padding: 20 }, modal: { borderRadius: 22, padding: 18, gap: 11 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, textAlign: 'right' }, modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 }, modalCancel: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, modalSave: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
