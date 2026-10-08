import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Button, Card } from '../../components/ui';
import { Spacing, BorderRadius, Colors } from '../../theme';
import { apiFetch } from '../../utils/api';

const EMERGENCY_NUMBER = '997';
const EMERGENCY_LABEL_AR = '997 (الهلال الأحمر السعودي)';
const EMERGENCY_LABEL_EN = '997 (Saudi Red Crescent)';

const RED_FLAGS = [
  { label: { ar: 'ألم في الصدر / نوبة قلبية', en: 'Chest pain / heart attack' }, pattern: /chest\s*pain|angina|heart\s*attack|myocardial/i },
  { label: { ar: 'علامات السكتة الدماغية (FAST)', en: 'Stroke signs (FAST)' }, pattern: /stroke|facial\s*droop|arm\s*weakness|speech\s*difficulty|فاست|FAST/i },
  { label: { ar: 'فاقد الوعي / لا يستجيب', en: 'Unconscious / unresponsive' }, pattern: /unconscious|unresponsive|won'?t\s*wake|لا\s*يستجيب|فاقد\s*الوعي/i },
  { label: { ar: 'نزيف شديد لا يتوقف', en: 'Severe bleeding' }, pattern: /severe\s*bleeding|hemorrhage|bleeding\s*won'?t\s*stop|نزيف\s*شديد|نزيف\s*لا\s*يتوقف/i },
  { label: { ar: 'ضيق تنفس / اختناق', en: 'Breathing difficulty / choking' }, pattern: /difficulty\s*breathing|shortness\s*of\s*breath|can'?t\s*breathe|choking|ضيق\s*تنفس|اختناق|لا\s*أستطيع\s*التنفس/i },
  { label: { ar: 'صدمة تحسسية / حساسية مفرطة', en: 'Anaphylaxis / severe allergy' }, pattern: /anaphylaxis|allergic\s*reaction|swelling\s*throat|تورم\s*الحلق|الحساسية\s*المفرطة|صدمة\s*تحسسية/i },
  { label: { ar: 'نوبة تشنج / صرع', en: 'Seizure / convulsion' }, pattern: /seizure|convulsion|fits|نوبة\s*تشنج|صرع/i },
  { label: { ar: 'تسمم / جرعة زائدة', en: 'Poisoning / overdose' }, pattern: /poison|overdose|تسمم|جرعة\s*زائدة|ابتلع\s*دواء/i },
  { label: { ar: 'نية انتحار / إيذاء النفس', en: 'Suicide / self-harm intent' }, pattern: /suicide|self\s*harm|kill\s*myself|أريد\s*أن\s*أموت|أؤذي\s*نفسي|انتحار/i },
  { label: { ar: 'نزيف أثناء الحمل', en: 'Bleeding in pregnancy' }, pattern: /pregnant.*bleeding|bleeding.*pregnant|نزيف.*حامل|حامل.*نزيف/i },
  { label: { ar: 'إصابة في الرأس', en: 'Head injury / trauma' }, pattern: /head\s*injury|head\s*trauma|إصابة\s*الرأس|ضربة\s*على\s*الرأس/i },
  { label: { ar: 'حرق شديد', en: 'Severe burn' }, pattern: /burn|scald|حرق|حريق/i },
];

export function SosRedFlagBanner({ text, onClose }: { text: string; onClose: () => void }) {
  const { lang } = useApp();
  const AR = lang === 'ar';

  const matches = RED_FLAGS.filter(f => f.pattern.test(text.toLowerCase()));
  if (matches.length === 0) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🚨</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.warningTitle}>{AR ? '⚠️ تنبيه طارئ' : '⚠️ EMERGENCY ALERT'}</Text>
          <Text style={styles.symptomsText}>
            {AR ? 'أعراضك (' : 'Your symptoms ('}
            {matches.map(m => (AR ? m.label.ar : m.label.en)).join(AR ? '، ' : ', ')}
            {AR ? ') قد تشير إلى حالة طارئة' : ') may indicate a life-threatening emergency'}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`)} style={styles.callBtn}>
            <Text style={styles.callBtnText}>{AR ? `📞 اتصل بـ ${EMERGENCY_LABEL_AR} الآن` : `📞 Call ${EMERGENCY_LABEL_EN} now`}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Text>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export function EmergencyScreen() {
  const { colors: theme, lang } = useApp();
  const AR = lang === 'ar';

  const [activeSos, setActiveSos] = useState<{ active: boolean; id?: string }>({ active: false });
  const [symptoms, setSymptoms] = useState('');
  const [redFlags, setRedFlags] = useState<typeof RED_FLAGS>([]);
  const [showBanner, setShowBanner] = useState(false);

  const checkRedFlags = (input: string) => {
    const lower = input.toLowerCase();
    const detected = RED_FLAGS.filter(f => f.pattern.test(lower));
    setRedFlags(detected);
    setShowBanner(detected.length > 0);
  };

  const triggerSos = async () => {
    try {
      const res = await apiFetch('/emergency/trigger', {
        method: 'POST',
        body: JSON.stringify({ location: null, symptoms, severity: 'critical' }),
      });
      setActiveSos({ active: true, id: res.id });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to trigger SOS');
    }
  };

  const call997 = () => Linking.openURL(`tel:${EMERGENCY_NUMBER}`);

  useEffect(() => {
    checkRedFlags(symptoms);
  }, [symptoms]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{AR ? 'الطوارئ والسلامة' : 'Emergency & Safety'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {showBanner && (
          <SosRedFlagBanner text={symptoms} onClose={() => setShowBanner(false)} />
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{AR ? 'أرقام الطوارئ' : 'Emergency Numbers'}</Text>
          <TouchableOpacity onPress={call997} style={styles.emergencyBtn}>
            <View style={styles.emergencyBtnContent}>
              <Text style={styles.emergencyNumber}>📞 {EMERGENCY_NUMBER}</Text>
              <Text style={styles.emergencyLabel}>{AR ? 'الهلال الأحمر السعودي' : 'Saudi Red Crescent'}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.otherNumbers}>
            <TouchableOpacity onPress={() => Linking.openURL('tel:911')} style={styles.otherBtn}>
              <Text style={styles.otherBtnText}>911</Text>
              <Text style={styles.otherBtnLabel}>{AR ? 'طوارئ عامة' : 'General Emergency'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('tel:999')} style={styles.otherBtn}>
              <Text style={styles.otherBtnText}>999</Text>
              <Text style={styles.otherBtnLabel}>{AR ? 'الشرطة' : 'Police'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('tel:998')} style={styles.otherBtn}>
              <Text style={styles.otherBtnText}>998</Text>
              <Text style={styles.otherBtnLabel}>{AR ? 'الدفاع المدني' : 'Civil Defense'}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{AR ? 'فحص الأعراض الخطرة (Red Flags)' : 'Red Flag Symptom Checker'}</Text>
          <Text style={styles.subtitle}>{AR ? 'اكتب أعراضك وسنخبرك إذا كانت تتطلب اتصالاً فورياً بالـ 997' : 'Describe your symptoms and we\'ll tell you if you need to call 997 immediately'}</Text>
          <TextInput
            style={styles.symptomsInput}
            placeholder={AR ? 'مثال: ألم في الصدر وصعوبة في التنفس...' : 'e.g., chest pain and shortness of breath...'}
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            numberOfLines={3}
          />
          {redFlags.length > 0 && (
            <View style={styles.redFlagsList}>
              <Text style={styles.redFlagsTitle}>{AR ? '⚠️ أعراض خطيرة مكتشفة:' : '⚠️ Critical symptoms detected:'}</Text>
              {redFlags.map((f, i) => (
                <View key={i} style={styles.redFlagItem}>
                  <Text style={styles.redFlagText}>{AR ? f.label.ar : f.label.en}</Text>
                </View>
              ))}
              <TouchableOpacity onPress={call997} style={styles.call997Btn}>
                <Text style={styles.call997BtnText}>{AR ? `📞 اتصل بـ ${EMERGENCY_LABEL_AR} الآن` : `📞 Call ${EMERGENCY_LABEL_EN} now`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{AR ? 'تشغيل SOS' : 'Trigger SOS'}</Text>
          <Text style={styles.subtitle}>{AR ? 'يرسل موقعك وينبه الطوارئ فوراً' : 'Sends your location and alerts emergency services instantly'}</Text>
          {!activeSos.active ? (
            <Button label={AR ? 'تشغيل SOS الآن' : 'Trigger SOS Now'} onPress={triggerSos} variant="danger" style={{ marginTop: Spacing.md }} />
          ) : (
            <Button label={AR ? 'SOS نشط - جارٍ التتبع' : 'SOS Active - Tracking'} disabled variant="outline" style={{ marginTop: Spacing.md }} />
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{AR ? 'أعراض تتطلب اتصالاً فورياً بالـ 997' : 'Symptoms Requiring Immediate 997 Call'}</Text>
          <View style={styles.redFlagsReference}>
            {RED_FLAGS.map((f, i) => (
              <View key={i} style={styles.refItem}>
                <Text style={styles.refText}>{AR ? f.label.ar : f.label.en}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.md },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  redFlagsReference: { marginTop: Spacing.sm },
  refItem: { padding: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 8, marginBottom: Spacing.xs },
  refText: { fontSize: 14 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.xs },
  subtitle: { color: 'rgba(0,0,0,0.6)', marginBottom: Spacing.lg },
  emergencyBtn: { backgroundColor: Colors.light.error, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  emergencyBtnContent: { alignItems: 'center' },
  emergencyNumber: { fontSize: 32, fontWeight: '700', color: '#fff' },
  emergencyLabel: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: Spacing.xs },
  otherNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, flexWrap: 'wrap', gap: Spacing.sm },
  otherBtn: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', flex: 1, minWidth: 80 },
  otherBtnText: { fontSize: 18, fontWeight: '700' },
  otherBtnLabel: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: Spacing.xs },
  symptomsInput: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginBottom: Spacing.md },
  redFlagsList: { marginTop: Spacing.md },
  redFlagsTitle: { fontWeight: '700', marginBottom: Spacing.sm, color: Colors.light.error },
  redFlagItem: { padding: Spacing.sm, backgroundColor: 'rgba(255,0,0,0.05)', borderRadius: 8, marginBottom: Spacing.xs },
  redFlagText: { color: Colors.light.error, fontWeight: '500' },
  call997Btn: { marginTop: Spacing.md, backgroundColor: Colors.light.error, borderRadius: 8, padding: Spacing.md, alignItems: 'center' },
  call997BtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  banner: { flexDirection: 'row', backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 8, padding: Spacing.md, marginBottom: Spacing.md },
  bannerContent: { flexDirection: 'row', flex: 1, gap: Spacing.md },
  iconContainer: { marginTop: Spacing.xs },
  icon: { fontSize: 24 },
  textContainer: { flex: 1 },
  warningTitle: { fontWeight: '700', fontSize: 15, color: Colors.light.error, marginBottom: Spacing.xs },
  symptomsText: { fontSize: 14, color: 'rgba(0,0,0,0.8)' },
  callBtn: { marginTop: Spacing.md, backgroundColor: Colors.light.error, borderRadius: 8, padding: Spacing.md },
  callBtnText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  closeBtn: { padding: Spacing.xs },
});
