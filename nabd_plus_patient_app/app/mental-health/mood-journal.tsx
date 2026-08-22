import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '../../src/utils/dates';
import { mentalHealthT } from '../../src/i18n/mental-health';
import { buildMoodJournalPayload, parseMoodHistory, type MoodEntry, type MoodValue } from '../../src/utils/mood-journal-contract';

const moodOptions: { value: MoodValue; key: 'moodGreat' | 'moodGood' | 'moodOkay' | 'moodBad' | 'moodTerrible'; color: string; icon: string }[] = [
  { value: 'great', key: 'moodGreat', color: '#15803D', icon: 'emoticon-excited-outline' },
  { value: 'good', key: 'moodGood', color: '#65A30D', icon: 'emoticon-happy-outline' },
  { value: 'okay', key: 'moodOkay', color: '#D97706', icon: 'emoticon-neutral-outline' },
  { value: 'bad', key: 'moodBad', color: '#EA580C', icon: 'emoticon-sad-outline' },
  { value: 'terrible', key: 'moodTerrible', color: '#DC2626', icon: 'emoticon-frown-outline' },
];

const tagOptions: { value: string; key: 'tagCalm' | 'tagTired' | 'tagStressed' | 'tagConnected' | 'tagRested' | 'tagOverwhelmed' }[] = [
  { value: 'calm', key: 'tagCalm' }, { value: 'tired', key: 'tagTired' }, { value: 'stressed', key: 'tagStressed' },
  { value: 'connected', key: 'tagConnected' }, { value: 'rested', key: 'tagRested' }, { value: 'overwhelmed', key: 'tagOverwhelmed' },
];

export default function MoodJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const t = (key: Parameters<typeof mentalHealthT>[1], vars?: Record<string, string | number>) => mentalHealthT(lang, key, vars);
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [energy, setEnergy] = useState<number | undefined>();
  const [stress, setStress] = useState<number | undefined>();
  const [sleep, setSleep] = useState('');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result: unknown = await apiFetch('/mental-health/mood?days=30');
      setEntries(parseMoodHistory(result));
    } catch {
      setEntries([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const resetForm = () => {
    setSelectedMood(null); setSelectedTags([]); setNote(''); setEnergy(undefined); setStress(undefined); setSleep('');
  };

  const submit = async () => {
    if (!selectedMood || saving) return;
    setSaving(true); setSaveError(false); setSaved(false);
    try {
      const payload = buildMoodJournalPayload({ mood: selectedMood, energy, stress, sleep, note, tags: selectedTags });
      await apiFetch('/mental-health/mood', { method: 'POST', body: JSON.stringify(payload) });
      resetForm(); setSaved(true); await loadHistory();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const selectedMoodColor = useMemo(() => moodOptions.find((option) => option.value === selectedMood)?.color ?? '#7A6BEA', [selectedMood]);
  const toggleTag = (tag: string) => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  const scale = (label: Parameters<typeof mentalHealthT>[1], value: number | undefined, onChange: (next: number) => void) => (
    <View style={styles.scaleGroup}>
      <AppText variant="caption" color={colors.textSecondary}>{t(label)}</AppText>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((number) => <TouchableOpacity key={number} accessibilityRole="button" onPress={() => onChange(number)} style={[styles.scaleDot, { borderColor: selectedMoodColor }, value === number && { backgroundColor: selectedMoodColor }]}><AppText variant="caption" color={value === number ? '#FFFFFF' : colors.textSecondary}>{number}</AppText></TouchableOpacity>)}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#312E81', paddingTop: insets.top + 12 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('cancel')} onPress={() => router.back()} style={styles.backButton}><Icon name="back" size={22} color="#FFFFFF" /></TouchableOpacity>
        <AppText variant="h4" color="#FFFFFF">{t('moodJournal')}</AppText>
        <AppText variant="caption" color="rgba(255,255,255,0.82)">{t('noDiagnosis')}</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="h6" color={colors.textPrimary}>{t('moodPrompt')}</AppText>
          <View style={styles.moodRow}>{moodOptions.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" onPress={() => setSelectedMood(option.value)} style={[styles.moodOption, selectedMood === option.value && { backgroundColor: option.color + '19', borderColor: option.color }]}><Icon name={option.icon} size={27} color={selectedMood === option.value ? option.color : colors.textSecondary} /><AppText variant="caption" color={colors.textPrimary}>{t(option.key)}</AppText></TouchableOpacity>)}</View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="h6" color={colors.textPrimary}>{t('optionalDetails')}</AppText>
          <View style={styles.scales}>{scale('energy', energy, setEnergy)}{scale('stress', stress, setStress)}</View>
          <AppText variant="caption" color={colors.textSecondary}>{t('sleep')}</AppText>
          <TextInput value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" maxLength={4} placeholder="0–24" placeholderTextColor={colors.textTertiary} style={[styles.shortInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="h6" color={colors.textPrimary}>{t('tags')}</AppText>
          <View style={styles.tagWrap}>{tagOptions.map((option) => <TouchableOpacity key={option.value} accessibilityRole="button" onPress={() => toggleTag(option.value)} style={[styles.tag, { borderColor: colors.border }, selectedTags.includes(option.value) && { backgroundColor: '#7A6BEA', borderColor: '#7A6BEA' }]}><AppText variant="caption" color={selectedTags.includes(option.value) ? '#FFFFFF' : colors.textPrimary}>{t(option.key)}</AppText></TouchableOpacity>)}</View>
          <AppText variant="caption" color={colors.textSecondary}>{t('note')}</AppText>
          <TextInput value={note} onChangeText={setNote} maxLength={500} multiline textAlignVertical="top" placeholder={t('notePlaceholder')} placeholderTextColor={colors.textTertiary} style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]} />
        </View>

        {saveError && <AppText variant="caption" color="#B91C1C" style={styles.message}>{t('saveError')}</AppText>}
        {saved && <View style={[styles.saved, { backgroundColor: '#DCFCE7' }]}><Icon name="success" size={18} color="#15803D" /><AppText variant="caption" color="#166534">{t('saved')}</AppText></View>}
        <TouchableOpacity accessibilityRole="button" disabled={!selectedMood || saving} onPress={() => void submit()} style={[styles.saveButton, { backgroundColor: selectedMoodColor, opacity: !selectedMood || saving ? 0.55 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText variant="h6" color="#FFFFFF">{t('save')}</AppText>}</TouchableOpacity>

        <AppText variant="h6" color={colors.textPrimary} style={styles.historyTitle}>{t('history')}</AppText>
        {loading ? <View style={styles.loading}><ActivityIndicator color="#7A6BEA" /><AppText variant="caption" color={colors.textSecondary}>{t('loading')}</AppText></View> : loadError ? <View style={styles.empty}><AppText variant="caption" color={colors.textSecondary}>{t('loadError')}</AppText><TouchableOpacity onPress={() => void loadHistory()}><AppText variant="caption" color="#5B21B6">{t('retry')}</AppText></TouchableOpacity></View> : entries.length === 0 ? <View style={styles.empty}><AppText variant="caption" color={colors.textSecondary} style={styles.centerText}>{t('noHistory')}</AppText></View> : entries.map((entry, index) => {
          const option = moodOptions.find((item) => item.value === entry.mood) ?? moodOptions[2];
          const date = new Date(entry.logged_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
          return <View key={entry.id || `${entry.logged_at}-${index}`} style={[styles.entry, { backgroundColor: colors.surface, borderRightColor: option.color }]}><Icon name={option.icon} size={26} color={option.color} /><View style={styles.entryText}><AppText variant="h6" color={colors.textPrimary}>{t(option.key)}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('recordLabel', { date })}</AppText>{entry.notes ? <AppText variant="caption" color={colors.textSecondary}>{entry.notes}</AppText> : null}{entry.tags?.length ? <AppText variant="caption" color={colors.textTertiary}>{entry.tags.map((tag) => { const found = tagOptions.find((option) => option.value === tag); return found ? t(found.key) : tag; }).join(' · ')}</AppText> : null}</View></View>;
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingHorizontal: 20, paddingBottom: 24, gap: 7, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }, backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', alignSelf: 'flex-end' }, content: { padding: 16, gap: 13, paddingBottom: 96 }, card: { borderRadius: 18, padding: 15, gap: 13 }, moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 }, moodOption: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' }, scales: { flexDirection: 'row', gap: 14 }, scaleGroup: { flex: 1, gap: 8 }, scaleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 }, scaleDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, shortInput: { borderWidth: 1, borderRadius: 12, minHeight: 44, paddingHorizontal: 12, marginTop: -4 }, tagWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }, tag: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 }, noteInput: { borderWidth: 1, borderRadius: 12, minHeight: 90, padding: 12, textAlign: 'right' }, saveButton: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, saved: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 14 }, message: { textAlign: 'right' }, historyTitle: { marginTop: 8 }, loading: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 24 }, empty: { alignItems: 'center', gap: 12, padding: 24 }, centerText: { textAlign: 'center', lineHeight: 20 }, entry: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, borderRightWidth: 4 }, entryText: { flex: 1, alignItems: 'flex-end', gap: 3 },
});
