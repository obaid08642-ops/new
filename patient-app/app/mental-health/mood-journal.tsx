// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const MOOD_EMOJIS = [
  { emoji: '', label: 'رائع', value: 5, color: '#5BA84F' },
  { emoji: '', label: 'جيد', value: 4, color: '#84CC16' },
  { emoji: '', label: 'محايد', value: 3, color: '#F0A526' },
  { emoji: '', label: 'حزين', value: 2, color: '#F97316' },
  { emoji: '', label: 'قلق', value: 1, color: '#F0695C' },
];

const EMOTIONS = ['سعيد', 'هادئ', 'متحمس', 'ممتن', 'متعب', 'قلق', 'محبط', 'وحيد', 'غاضب', 'متوتر', 'مرتاح', 'خائف'];
const ACTIVITIES = ['تمرين رياضي', 'تأمل', 'قراءة ', 'مع العائلة ‍‍', 'عمل ', 'نوم جيد ', 'طعام صحي ', 'طبيعة '];

const PAST_ENTRIES: any[] = [];


export default function MoodJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [pastEntries, setPastEntries] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    apiFetch('/mental-health/mood?days=7')
      .then((res: any) => setPastEntries(res.entries ?? res ?? []))
      .catch(() => setPastEntries([]))
      .finally(() => setLoadingHistory(false));
  }, [saved]);

  const toggleEmotion = (e: string) => setSelectedEmotions(p => p.includes(e) ? p.filter(x => x !== e) : [...p, e]);
  const toggleActivity = (a: string) => setSelectedActivities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const handleSave = async () => {
    if (!selectedMood) return;
    const moodMap: Record<number, string> = { 5: 'great', 4: 'good', 3: 'okay', 2: 'bad', 1: 'terrible' };
    try {
      await apiFetch('/mental-health/mood', {
        method: 'POST',
        body: JSON.stringify({
          mood: moodMap[selectedMood],
          energy_level: 3,
          stress_level: 3,
          sleep_hours: 7,
          notes: note,
          tags: selectedEmotions,
          activities: selectedActivities,
        }),
      });
      setSaved(true);
      setSelectedMood(null);
      setSelectedEmotions([]);
      setSelectedActivities([]);
      setNote('');
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ المزاج');
    }
  };

  const currentMood = MOOD_EMOJIS.find(m => m.value === selectedMood);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">يومية المزاج </AppText>
          <View style={{ width: 36 }}/>
        </View>
        <AppText variant="bodySM">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Mood Selection */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">كيف مزاجك اليوم؟ ️</AppText>
          <View style={styles.moodRow}>
            {MOOD_EMOJIS.map(m => (
              <TouchableOpacity key={m.value} onPress={() => setSelectedMood(m.value)}
                style={[styles.moodBtn, selectedMood === m.value && { backgroundColor: m.color + '20', borderColor: m.color, borderWidth: 2 } ]}>
                <AppText variant="bodySM">{m.emoji}</AppText>
                <AppText variant="bodySM">{m.label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emotions */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">ما الذي تشعر به؟ </AppText>
          <View style={styles.tagsWrap}>
            {EMOTIONS.map(e => (
              <TouchableOpacity key={e} onPress={() => toggleEmotion(e)}
                style={[styles.emotionTag, selectedEmotions.includes(e) && { backgroundColor: '#EC4899', borderColor: '#EC4899' } ]}>
                <AppText variant="bodySM">{e}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activities */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">ماذا فعلت اليوم؟ </AppText>
          <View style={styles.tagsWrap}>
            {ACTIVITIES.map(a => (
              <TouchableOpacity key={a} onPress={() => toggleActivity(a)}
                style={[styles.activityTag, selectedActivities.includes(a) && { backgroundColor: '#6366F1', borderColor: '#6366F1' } ]}>
                <AppText variant="bodySM">{a}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">ملاحظة سريعة</AppText>
          <TextInput
            style={[styles.noteInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}
            value={note} onChangeText={setNote}
            placeholder="اكتب ما يخطر على بالك..."
            placeholderTextColor={colors.textTertiary}
            multiline numberOfLines={4} textAlignVertical="top" textAlign="right"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity onPress={handleSave} disabled={!selectedMood} activeOpacity={0.85}
          style={{ opacity: !selectedMood ? 0.6 : 1 }}>
          <View style={styles.saveBtn}>
            <AppText variant="bodySM">{saved ? 'تم الحفظ!' : ' حفظ السجل اليومي'}</AppText>
          </View>
        </TouchableOpacity>

        {/* Past entries */}
        <AppText variant="bodySM">السجلات السابقة</AppText>
        {loadingHistory ? (
          <AppText variant="bodySM" color={colors.textTertiary}>جاري تحميل السجلات...</AppText>
        ) : pastEntries.length === 0 ? (
          <AppText variant="bodySM" color={colors.textTertiary}>لا توجد سجلات سابقة بعد</AppText>
        ) : pastEntries.map((entry: any, i: number) => {
          const moodKey: Record<string, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
          const moodScore = typeof entry.mood === 'string' ? moodKey[entry.mood] : entry.mood;
          const m = MOOD_EMOJIS.find(x => x.value === moodScore) ?? MOOD_EMOJIS[2];
          const dateStr = new Date(entry.logged_at ?? entry.createdAt).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });
          return (
            <View key={i} style={[styles.pastEntry, { backgroundColor: isDark ? colors.surface : colors.white, borderRightWidth: 4, borderRightColor: m.color } ]}>
              <View style={styles.pastLeft}>
                <AppText variant="bodySM">{m.emoji}</AppText>
              </View>
              <View style={styles.pastInfo}>
                <AppText variant="bodySM">{dateStr}</AppText>
                <View style={styles.pastEmotions}>
                  {(entry.tags ?? entry.emotions ?? []).map((em: string, j: number) => (
                    <View key={j} style={[styles.pastEmoTag, { backgroundColor: m.color + '20' } ]}>
                      <AppText variant="bodySM">{em}</AppText>
                    </View>
                  ))}
                </View>
                {entry.note && <AppText variant="bodySM">{entry.note}</AppText>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' } as any,
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  date: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '400', textAlign: 'center' } as any,
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around' },
  moodBtn: { alignItems: 'center', gap: 5, borderRadius: 16, padding: 10, borderWidth: 1.5, borderColor: 'transparent', width: 60 },
  moodEmoji: { fontSize: 26 } as any,
  moodEmojiSelected: { fontSize: 32 } as any,
  moodLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' } as any,
  tagsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  emotionTag: { borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 7 },
  emotion: { fontSize: 12, fontWeight: '700' } as any,
  activityTag: { borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 7 },
  activity: { fontSize: 12, fontWeight: '700' } as any,
  noteInput: { borderRadius: 14, borderWidth: 1, padding: 12, minHeight: 90, fontSize: 13, fontWeight: '400' },
  saveBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveBtnAlt: { color: '#fff', fontSize: 16, fontWeight: '800' } as any,
  sectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right' } as any,
  pastEntry: { borderRadius: 16, padding: 12, flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  pastLeft: { alignItems: 'center' },
  pastMoodEmoji: { fontSize: 26 } as any,
  pastInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  pastDate: { fontSize: 13, fontWeight: '800' } as any,
  pastEmotions: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap' },
  pastEmoTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pastEmo: { fontSize: 10, fontWeight: '700' } as any,
  pastNote: { fontSize: 11, fontWeight: '400', textAlign: 'right' } as any,
});
