import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { guidedCareT } from '../../src/i18n/guided-care';

type TriageResult = { care_level: 'emergency' | 'consultation'; selected_red_flags: string[]; diagnosis: null; treatment: null; notice: string };
const flagOptions = [
  { value: 'chest_pain', key: 'flagChest' }, { value: 'breathing_difficulty', key: 'flagBreathing' },
  { value: 'fainting_or_unresponsive', key: 'flagFainting' }, { value: 'heavy_bleeding', key: 'flagBleeding' },
  { value: 'new_confusion', key: 'flagConfusion' }, { value: 'severe_allergic_reaction', key: 'flagAllergy' },
  { value: 'severe_injury', key: 'flagInjury' }, { value: 'none', key: 'flagNone' },
] as const;

export default function GuidedTriageScreen() {
  const insets = useSafeAreaInsets();
  const { colors, lang } = useApp();
  const t = (key: Parameters<typeof guidedCareT>[1]) => guidedCareT(lang, key);
  const [symptoms, setSymptoms] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);

  const selectedCount = useMemo(() => flags.filter((item) => item !== 'none').length, [flags]);
  const toggleFlag = (value: string) => {
    setFlags((current) => {
      if (value === 'none') return current.includes('none') ? [] : ['none'];
      const withoutNone = current.filter((item) => item !== 'none');
      return withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value];
    });
  };
  const submit = async () => {
    if (!symptoms.trim()) { setError(t('symptomsRequired')); return; }
    setSubmitting(true); setError(null);
    try {
      const data = await apiFetch('/ai/triage', { method: 'POST', body: JSON.stringify({ symptoms: symptoms.trim(), red_flags: flags.length ? flags : ['none'] }) });
      setResult(data as TriageResult);
    } catch { setError(t('triageError')); } finally { setSubmitting(false); }
  };
  const reset = () => { setSymptoms(''); setFlags([]); setResult(null); setError(null); };
  const callLocalEmergency = () => { void Linking.openURL('tel:911'); };

  if (result) {
    const emergency = result.care_level === 'emergency';
    return <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: emergency ? '#991B1B' : '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={reset} style={styles.backButton}><Icon name="refresh" size={21} color="#FFFFFF" /></TouchableOpacity><AppText variant="h4" color="#FFFFFF">{t('results')}</AppText></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.resultCard, { backgroundColor: emergency ? '#FEF2F2' : '#EEF2FF', borderColor: emergency ? '#FECACA' : '#C7D2FE' }]}>
          <Icon name={emergency ? 'warning' : 'info'} size={30} color={emergency ? '#B91C1C' : '#4338CA'} />
          <AppText variant="h5" color={emergency ? '#991B1B' : '#312E81'}>{t(emergency ? 'emergencyTitle' : 'consultationTitle')}</AppText>
          <AppText variant="bodySM" color={emergency ? '#7F1D1D' : '#312E81'} style={styles.centerText}>{t(emergency ? 'emergencyBody' : 'consultationBody')}</AppText>
          {emergency ? <TouchableOpacity accessibilityRole="button" onPress={callLocalEmergency} style={[styles.primaryAction, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('callEmergency')}</AppText></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/consultations')} style={[styles.primaryAction, { backgroundColor: '#312E81' }]}><Icon name="doctor" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('bookConsultation')}</AppText></TouchableOpacity>}
        </View>
        <View style={[styles.notice, { backgroundColor: colors.backgroundSecondary }]}><AppText variant="caption" color={colors.textSecondary} style={styles.centerText}>{t('triageNotice')}</AppText></View>
        {selectedCount > 0 ? <View style={[styles.selectionInfo, { backgroundColor: colors.surface }]}><AppText variant="caption" color={colors.textSecondary}>{selectedCount}</AppText></View> : null}
        <TouchableOpacity accessibilityRole="button" onPress={reset} style={[styles.outlineAction, { borderColor: colors.border }]}><AppText variant="h6" color={colors.textPrimary}>{t('startAgain')}</AppText></TouchableOpacity>
      </ScrollView>
    </View>;
  }

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { backgroundColor: '#312E81', paddingTop: insets.top + 12 }]}><TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={21} color="#FFFFFF" /></TouchableOpacity><AppText variant="h4" color="#FFFFFF">{t('triageTitle')}</AppText><AppText variant="caption" color="rgba(255,255,255,0.82)">{t('triageSubtitle')}</AppText></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.notice, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}><Icon name="info" size={18} color="#4338CA" /><AppText variant="caption" color={colors.textPrimary} style={styles.noticeText}>{t('triageNotice')}</AppText></View>
      <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('symptoms')}</AppText><TextInput value={symptoms} onChangeText={setSymptoms} maxLength={1000} multiline textAlignVertical="top" placeholder={t('symptomsPlaceholder')} placeholderTextColor={colors.textTertiary} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} /></View>
      <View style={[styles.card, { backgroundColor: colors.surface }]}><AppText variant="h6" color={colors.textPrimary}>{t('redFlags')}</AppText>{flagOptions.map((option) => { const active = flags.includes(option.value); return <TouchableOpacity key={option.value} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleFlag(option.value)} style={[styles.option, { borderColor: active ? '#7A6BEA' : colors.border, backgroundColor: active ? '#EDE9FE' : 'transparent' }]}><View style={[styles.checkbox, { borderColor: active ? '#7A6BEA' : colors.border, backgroundColor: active ? '#7A6BEA' : 'transparent' }]}>{active ? <Icon name="check" size={14} color="#FFFFFF" /> : null}</View><AppText variant="bodySM" color={colors.textPrimary} style={styles.optionText}>{t(option.key)}</AppText></TouchableOpacity>; })}</View>
      {error ? <AppText variant="caption" color="#B91C1C" style={styles.error}>{error}</AppText> : null}
      <TouchableOpacity accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[styles.primaryAction, { backgroundColor: '#312E81', opacity: submitting ? 0.65 : 1 }]}>{submitting ? <ActivityIndicator color="#FFFFFF" /> : <AppText variant="h6" color="#FFFFFF">{t('continue')}</AppText>}</TouchableOpacity>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', alignSelf: 'flex-end' }, content: { padding: 16, gap: 14, paddingBottom: 90 }, notice: { padding: 14, borderRadius: 16, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }, noticeText: { flex: 1, textAlign: 'right', lineHeight: 20 }, card: { padding: 16, borderRadius: 18, gap: 12 }, input: { minHeight: 110, borderWidth: 1, borderRadius: 13, padding: 12, textAlign: 'right' }, option: { minHeight: 50, padding: 11, borderWidth: 1, borderRadius: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }, checkbox: { width: 22, height: 22, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, optionText: { flex: 1, textAlign: 'right' }, error: { textAlign: 'right' }, primaryAction: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 8 }, resultCard: { padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 12 }, centerText: { textAlign: 'center', lineHeight: 21 }, outlineAction: { minHeight: 50, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, selectionInfo: { padding: 12, borderRadius: 12, alignItems: 'center' } });
