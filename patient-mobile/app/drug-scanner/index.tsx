// @ts-nocheck
// app/drug-scanner/index.tsx
// <MaterialIcons name="medication" size={24} color={resolveColor('var(--p)', isDark)} /> ماسح تفاعلات الأدوية — كشف التعارضات الخطيرة
import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';

type ScanState = 'idle' | 'scanning' | 'results';

export default function DrugScannerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();


  const [scanState, setScanState] = useState<ScanState>('idle');
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [newDrug, setNewDrug] = useState('');

  const [myMedicines, setMyMedicines] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [safeInteractions, setSafeInteractions] = useState<string[]>([]);

  const COMMON_DRUGS = ['بنادول', 'إيبوبروفين', 'أموكسيسيلين', 'كلاريثروميسين', 'أوميبرازول', 'لوسارتان', 'فيتامين D', 'أوميغا 3'];

  React.useEffect(() => {
    apiFetch('/health/medications')
      .then(res => {
        const meds = Array.isArray(res) ? res : res?.data || [];
        setMyMedicines(meds);
        setSelectedMeds(meds.map((m: any) => m.id));
      })
      .catch(console.error);
  }, []);

  const handleScan = async () => {
    setScanState('scanning');
    try {
      const res = await apiFetch('/ai/drug-interactions', {
        method: 'POST',
        body: JSON.stringify({ meds: selectedMeds, newDrug })
      });
      const data = res?.data || res;
      setInteractions(data.interactions || []);
      setSafeInteractions(data.safe_interactions || []);
      setScanState('results');
    } catch {
      setInteractions([]);
      setScanState('results');
    }
  };

  const toggleMed = (id: string) => {
    setSelectedMeds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const SEVERITY_COLORS = { major: '#F0695C', moderate: '#F0A526', minor: '#5BA84F' };
  const SEVERITY_LABELS = { major: 'خطير', moderate: 'متوسط', minor: 'خفيف' };

  if (scanState === 'scanning') {
    return (
      <View style={styles.loadingContainer}>
        <View style={StyleSheet.absoluteFillObject} />
        <Icon name="medication" size={20} color={colors.primary} />
        <AppText variant="bodySM">جاري فحص التفاعلات...</AppText>
        <AppText variant="bodySM">قاعدة بيانات 50,000+ تفاعل دوائي</AppText>
        {['فحص التفاعلات الثنائية', 'تحليل التداخلات المعروفة', 'مراجعة جرعات الأمان', 'توليد التوصيات'].map((s, i) => (
          <View key={i} style={styles.loadingStep}>
            <Icon name="check_circle" size={20} color={colors.primary} />
            <AppText variant="bodySM">{s}</AppText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View
        style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">فاحص الأدوية</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <AppText variant="bodySM">اكشف التعارضات الخطيرة بين أدويتك</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {scanState === 'idle' && (
          <>
            {/* My medicines */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">أدويتي الحالية</AppText>
              {myMedicines.map(med => (
                <TouchableOpacity key={med.id} onPress={() => toggleMed(med.id)}
                  style={[styles.medRow, {
                    borderBottomColor: colors.border,
                    backgroundColor: selectedMeds.includes(med.id) ? med.color + '10' : 'transparent',
                  } ]}>
                  <View style={[styles.checkbox, {
                    backgroundColor: selectedMeds.includes(med.id) ? med.color : 'transparent',
                    borderColor: selectedMeds.includes(med.id) ? med.color : colors.border,
                  } ]}>
                    {selectedMeds.includes(med.id) && <Icon name="check" size={12} color="#fff" />}
                  </View>
                  <View style={styles.medInfo}>
                    <AppText variant="bodySM">{med.name} {med.dose}</AppText>
                    <AppText variant="bodySM">{med.type}</AppText>
                  </View>
                  <View style={[styles.medIcon, { backgroundColor: med.color + '18' } ]}>
                    <AppText variant="bodySM">{med.icon}</AppText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add new drug to check */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">تحقق من دواء جديد</AppText>
              <AppText variant="bodySM">اختر دواءً تريد التحقق منه مع أدويتك الحالية</AppText>
              <View style={styles.commonDrugsGrid}>
                {COMMON_DRUGS.map((drug, i) => (
                  <TouchableOpacity key={i} onPress={() => setNewDrug(drug)}
                    style={[styles.drugChip, {
                      backgroundColor: newDrug === drug ? '#6366F1' : isDark ? colors.background : '#EEF2FF',
                      borderColor: newDrug === drug ? '#6366F1' : 'transparent',
                    } ]}>
                    <AppText variant="bodySM">{drug}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Scan button */}
            <TouchableOpacity onPress={handleScan} activeOpacity={0.85}>
              <View style={styles.scanBtn}>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="microscope" size={16} color={colors.primary} /><AppText variant="bodySM">فحص التفاعلات الآن</AppText></View>
                <AppText variant="bodySM">{selectedMeds.length + (newDrug ? 1 : 0)} أدوية سيتم فحصها</AppText>
              </View>
            </TouchableOpacity>
          </>
        )}

        {scanState === 'results' && (
          <>
            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: '#FEE2E2' } ]}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="warning" size={16} color={colors.primary} /><AppText variant="bodySM">وُجد {interactions.filter(i => i.severity === 'major').length} تفاعلات خطيرة</AppText></View>
              <AppText variant="bodySM">يُنصح بمراجعة طبيبك قبل الجمع بين هذه الأدوية</AppText>
            </View>

            {/* Interactions */}
            <AppText variant="bodySM">التفاعلات المكتشفة</AppText>
            {interactions.map((interaction, i) => (
              <View key={i} style={[styles.interactionCard, { backgroundColor: isDark ? colors.surface : colors.white, borderRightWidth: 4, borderRightColor: interaction.color } ]}>
                <View style={[styles.severityBadge, { backgroundColor: interaction.bg } ]}>
                  <AppText variant="bodySM">
                    {SEVERITY_LABELS[interaction.severity as keyof typeof SEVERITY_LABELS]}
                  </AppText>
                </View>
                <AppText variant="bodySM">{interaction.title}</AppText>
                <View style={styles.drugPair}>
                  {interaction.drugs.map((d, j) => (
                    <View key={j} style={[styles.drugTag, { backgroundColor: interaction.color + '15' } ]}>
                      <AppText variant="bodySM">{d}</AppText>
                    </View>
                  ))}
                  <AppText variant="bodySM">+</AppText>
                </View>
                <AppText variant="bodySM">{interaction.desc}</AppText>
                <View style={[styles.adviceBox, { backgroundColor: interaction.bg } ]}>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">{interaction.advice}</AppText></View>
                </View>
              </View>
            ))}

            {/* Safe interactions */}
            <View style={[styles.safeCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="check_circle" size={16} color={colors.primary} /><AppText variant="bodySM">تفاعلات آمنة</AppText></View>
              <AppText variant="bodySM">
                {safeInteractions.length > 0 ? safeInteractions.join('\n') : 'لا توجد تفاعلات آمنة معروفة.'}
              </AppText>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
                style={[styles.actionBtn, { backgroundColor: '#23B5CE' } ]}>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="doctor" size={16} color={colors.primary} /><AppText variant="bodySM">استشر طبيب الآن</AppText></View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScanState('idle')}
                style={[styles.actionBtn, { backgroundColor: isDark ? colors.surface : colors.white, borderWidth: 1, borderColor: colors.border } ]}>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="refresh" size={16} color={colors.primary} /><AppText variant="bodySM">فحص جديد</AppText></View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  loadingSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' },
  loadingStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  loadingStepCheck: { fontSize: 14 },
  loadingStepText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '400', textAlign: 'center' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  cardSub: { fontSize: 12, fontWeight: '400', textAlign: 'right', marginBottom: 10 },
  medRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderRadius: 8, paddingHorizontal: 4, marginBottom: 2 },
  medIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  medInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  medName: { fontSize: 14, fontWeight: '700' },
  medType: { fontSize: 11, fontWeight: '400' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  commonDrugsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  drugChip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 7 },
  drugChipText: { fontSize: 12, fontWeight: '700' },
  scanBtn: { borderRadius: 18, padding: 18, alignItems: 'center', gap: 4 },
  scanBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  scanBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '400' },
  summaryCard: { borderRadius: 16, padding: 14 },
  summaryTitle: { color: '#DC2626', fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
  summarySub: { color: '#B91C1C', fontSize: 12, fontWeight: '400', textAlign: 'right' },
  sectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  interactionCard: { borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 8 },
  severityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' },
  severityText: { fontSize: 10, fontWeight: '800' },
  interactionTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
  drugPair: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  drugTag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  drugTagText: { fontSize: 12, fontWeight: '700' },
  plusSign: { fontSize: 16, fontWeight: '800' },
  interactionDesc: { fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  adviceBox: { borderRadius: 10, padding: 10 },
  adviceText: { fontSize: 12, fontWeight: '700', textAlign: 'right', lineHeight: 18 },
  safeCard: { borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  safeText: { fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 22 },
  actionsRow: { gap: 10 },
  actionBtn: { borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
