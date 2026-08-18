// @ts-nocheck
// app/mental-health/self-assessment.tsx — Connected to POST /mental-health/assessment
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// Questions fetched dynamically

export default function SelfAssessmentScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [step, setStep] = useState<'questions' | 'result'>('questions');
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/mental-health/assessment-questions')
      .then((res: any) => setQuestions(Array.isArray(res) ? res : []))
      .catch(() => setQuestions([]));
  }, []);

  const answer = (qId: number, idx: number) => setAnswers(p => ({ ...p, [qId]: idx }));
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  const getResult = () => {
    const score = Object.values(answers).reduce((s, v) => s + v, 0);
    const avg = score / (questions.length || 1);
    if (avg <= 1) return { level: 'ممتاز', color: '#5BA84F', emoji: '', desc: 'صحتك النفسية ممتازة، استمر على هذا النهج!', action: null, severity: 'minimal' };
    if (avg <= 2) return { level: 'جيد', color: '#84CC16', emoji: '', desc: 'حالتك النفسية جيدة مع بعض الضغط البسيط.', action: 'تمارين التنفس مفيدة', severity: 'mild' };
    if (avg <= 3) return { level: 'متوسط', color: '#F0A526', emoji: '', desc: 'تحتاج بعض الاهتمام بصحتك النفسية.', action: 'يُنصح بجلسة مع مختص', severity: 'moderate' };
    return { level: 'يحتاج رعاية', color: '#F0695C', emoji: '', desc: 'صحتك النفسية تحتاج اهتماماً، لا تتردد في طلب المساعدة.', action: 'احجز جلسة مع طبيب نفسي', severity: 'severe' };
  };

  const handleSubmit = async () => {
    setSaving(true);
    const r = getResult();
    const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);
    try {
      await apiFetch('/mental-health/assessment', {
        method: 'POST',
        body: JSON.stringify({
          assessment_type: 'general',
          score: totalScore,
          max_score: questions.length * 4,
          severity: r.severity,
          answers: questions.map(q => ({ question: q.text, answer: answers[q.id] ?? 0 })),
        }),
      });
    } catch { /* non-blocking */ }
    setSaving(false);
    setStep('result');
  };

  if (step === 'result') {
    const r = getResult();
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setStep('questions')} style={styles.hBtn}>
              <Icon name="back" size={22} color="#fff" />
            </TouchableOpacity>
            <AppText variant="bodySM">نتيجة التقييم</AppText>
            <View style={{ width: 36 }}/>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 80 }}>
          <View style={[styles.resultHero, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">{r.emoji}</AppText>
            <AppText variant="bodySM">{r.level}</AppText>
            <AppText variant="bodySM">{r.desc}</AppText>
          </View>
          {r.action && (
            <View style={[styles.actionCard, { backgroundColor: r.color + '18', borderColor: r.color + '40' } ]}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">{r.action}</AppText></View>
              <TouchableOpacity
                onPress={() => r.action?.includes('طبيب') ? router.push('/(tabs)/consultations') : router.push('/mental-health/breathing')}
                style={[styles.actionBtn, { backgroundColor: r.color } ]}>
                <AppText variant="bodySM">{r.action?.includes('طبيب') ? 'احجز الآن' : 'ابدأ الآن'}</AppText>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={() => { setAnswers({}); setStep('questions'); }} style={[styles.retakeBtn, { borderColor: colors.border } ]}>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="refresh" size={16} color={colors.primary} /><AppText variant="bodySM">إعادة التقييم</AppText></View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">التقييم الذاتي</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(Object.keys(answers).length / (questions.length || 1)) * 100}%`, backgroundColor: colors.surface }]} />
        </View>
        <AppText variant="bodySM">{Object.keys(answers).length}/{questions.length} أسئلة</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        <View style={[styles.disclaimer, { backgroundColor: '#EEF2FF' } ]}>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">هذا تقييم توعوي فقط ولا يُغني عن الاستشارة المهنية</AppText></View>
        </View>
        {questions.map(q => (
          <View key={q.id} style={[styles.questionCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">{q.id}. {q.text}</AppText>
            <View style={styles.optionsWrap}>
              {q.options.map((opt, i) => (
                <TouchableOpacity key={i} onPress={() => answer(q.id, i)}
                  style={[styles.optBtn, answers[q.id] === i && { backgroundColor: '#6366F1', borderColor: '#6366F1' }]}>
                  <AppText variant="bodySM">{opt}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity onPress={handleSubmit} disabled={!allAnswered || saving}
          activeOpacity={0.85} style={{ opacity: !allAnswered ? 0.5 : 1 }}>
          <View style={styles.submitBtn}>
            <AppText variant="bodySM">{saving ? 'جاري الحفظ...' : 'عرض النتيجة ←'}</AppText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '400', textAlign: 'right' },
  disclaimer: { borderRadius: 12, padding: 10 },
  disclaimerText: { color: '#23B5CE', fontSize: 11, fontWeight: '400', textAlign: 'right' },
  questionCard: { borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10 },
  questionText: { fontSize: 14, fontWeight: '700', textAlign: 'right', lineHeight: 22 },
  optionsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  optBtn: { borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 7 },
  optText: { fontSize: 12, fontWeight: '700' },
  submitBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resultHero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  resultLevel: { fontSize: 28, fontFamily: 'Cairo-ExtraBold' },
  resultDesc: { fontSize: 14, fontWeight: '400', textAlign: 'center', lineHeight: 22 },
  actionCard: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 10 },
  actionText: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  actionBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  retakeBtn: { borderRadius: 14, borderWidth: 1.5, height: 48, justifyContent: 'center', alignItems: 'center' },
  retakeBtnText: { fontSize: 14, fontWeight: '700' },
});
