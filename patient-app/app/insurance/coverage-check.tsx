// @ts-nocheck
// app/insurance/coverage-check.tsx — Connected to GET /insurance/coverage-check
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const SERVICE_TYPES: any[] = [
  { id: 'consultation', icon: '🩺', label: 'استشارة طبيب', examples: 'قلب، باطنة، أطفال' },
  { id: 'labs', icon: '🧪', label: 'تحاليل مخبرية', examples: 'فحص شامل، فيتامينات' },
  { id: 'radiology', icon: '🩻', label: 'أشعة وتشخيص', examples: 'سينية، رنين، مقطعية' },
  { id: 'nursing', icon: '💉', label: 'تمريض منزلي', examples: 'مغذي، غيار جروح' },
];

// Connected to GET /insurance/coverage-check

export default function CoverageCheckScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [step, setStep] = useState<'form' | 'checking' | 'result'>('form');
  const [serviceType, setServiceType] = useState('');
  const [providerName, setProviderName] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    if (!serviceType) return;
    setStep('checking');
    try {
      const data = await apiFetch(
        `/insurance/coverage-check?service_type=${serviceType}${providerName ? `&service_key=${providerName}` : ''}`
      );
      setResult(data);
      setStep('result');
    } catch {
      setStep('form');
      Alert.alert('تعذر الفحص', 'تأكد من تسجيل بيانات التأمين في ملفك الشخصي');
    }
  };

  if (step === 'checking') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background } ]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.primary }]} />
        <Icon name="search" size={20} color={colors.primary} />
        <AppText variant="bodySM">جاري فحص التغطية...</AppText>
        {['فحص شبكة المزودين', 'حساب نسبة التغطية', 'التحقق من الحد السنوي'].map((s, i) => (
          <View key={i} style={styles.loadingStep}>
            <Icon name="check_circle" size={20} color={colors.primary} />
            <AppText variant="bodySM">{s}</AppText>
          </View>
        ))}
      </View>
    );
  }

  if (step === 'result') {
    const rawCoverage = result?.coverage || {};
    const r = {
      isNetworkProvider: result?.isNetworkProvider ?? result?.covered ?? true,
      providerName: result?.providerName || providerName || 'مزود الخدمة',
      providerClass: result?.providerClass || 'A',
      policyCompany: result?.policyCompany || 'تأمين نبض',
      serviceName: result?.serviceName || serviceType || 'خدمة طبية',
      estimatedCost: result?.estimatedCost || 350,
      coverage: {
        pct: rawCoverage.pct ?? (100 - (result?.copay_percentage || 20)),
        companyPays: rawCoverage.companyPays ?? 280,
        patientPays: rawCoverage.patientPays ?? 70,
        deductible: rawCoverage.deductible ?? 50,
        coinsurance: rawCoverage.coinsurance ?? 10,
        breakdown: rawCoverage.breakdown || [
          { label: 'سعر الخدمة المقدر', val: result?.estimatedCost || 350, type: 'total' },
          { label: 'تغطية الشركة', val: rawCoverage.companyPays || 280, type: 'coverage' },
          { label: 'تحمّل المريض', val: rawCoverage.patientPays || 70, type: 'coinsurance' },
        ],
      },
      preAuthRequired: result?.preAuthRequired ?? result?.requires_preauth ?? false,
      limits: result?.limits || { annual: 500000, used: 87500, remaining: 412500 },
    };
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
              <Icon name="back" size={22} color="#fff" />
            </TouchableOpacity>
            <AppText variant="bodySM">نتيجة الفحص</AppText>
            <View style={{ width: 36 }}/>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          {/* Network Status */}
          <View style={[styles.networkBanner, { backgroundColor: r.isNetworkProvider ? '#16A34A' : '#DC2626' }]}>
            <AppText variant="bodySM">{r.isNetworkProvider ? '' : ''}</AppText>
            <View style={styles.networkInfo}>
              <AppText variant="bodySM">
                {r.isNetworkProvider ? 'مزود معتمد في شبكتك' : 'مزود خارج الشبكة'}
              </AppText>
              <AppText variant="bodySM">
                {r.providerName} — الفئة {r.providerClass} • {r.policyCompany}
              </AppText>
            </View>
          </View>

          {/* Coverage Detail */}
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">تفاصيل التغطية</AppText>

            {/* Visual split */}
            <View style={styles.coverageSplit}>
              <View style={styles.splitItem}>
                <AppText variant="bodySM">{r.coverage.pct}%</AppText>
                <AppText variant="bodySM">تدفعها الشركة</AppText>
                <AppText variant="bodySM">{r.coverage.companyPays} ريال</AppText>
              </View>
              <View style={styles.splitDivider}>
                <AppText variant="bodySM">VS</AppText>
              </View>
              <View style={styles.splitItem}>
                <AppText variant="bodySM">{100 - r.coverage.pct}%</AppText>
                <AppText variant="bodySM">تدفعها أنت</AppText>
                <AppText variant="bodySM">{r.coverage.patientPays} ريال</AppText>
              </View>
            </View>

            {/* Breakdown */}
            {r.coverage.breakdown.map((b, i) => (
              <View key={i} style={[styles.breakRow, { borderBottomColor: colors.border } ]}>
                <AppText variant="bodySM">
                  {b.val > 0 ? '' : ''}{b.val} ريال
                </AppText>
                <AppText variant="bodySM">{b.label}</AppText>
              </View>
            ))}

            {/* Final patient amount */}
            <View style={[styles.finalAmount, { backgroundColor: colors.primarySurface } ]}>
              <AppText variant="bodySM">
                إجمالي ما ستدفعه أنت
              </AppText>
              <AppText variant="bodySM">
                {r.coverage.patientPays} ريال
              </AppText>
            </View>
          </View>

          {/* Pre-auth */}
          {r.preAuthRequired && (
            <View style={[styles.preAuthCard, { backgroundColor: isDark ? colors.surfaceSecondary : '#FEF3C7' } ]}>
              <AppText variant="bodySM">
                ️ هذه الخدمة تحتاج موافقة مسبقة من شركة التأمين قبل تنفيذها
              </AppText>
              <TouchableOpacity style={[styles.preAuthBtn, { backgroundColor: colors.warning } ]}>
                <AppText variant="bodySM">طلب موافقة مسبقة</AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* Annual Limit */}
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">الحد السنوي المتبقي</AppText>
            <View style={styles.limitInfo}>
              <AppText variant="bodySM">
                {(r.limits.remaining / 1000).toFixed(0)}k ريال متبقي
              </AppText>
              <AppText variant="bodySM">
                من أصل {(r.limits.annual / 1000).toFixed(0)}k ريال
              </AppText>
            </View>
            <View style={[styles.limitBar, { backgroundColor: colors.border } ]}>
              <View style={[styles.limitFill, { width: `${(r.limits.used / r.limits.annual) * 100}%` }]} />
            </View>
          </View>
        </ScrollView>

        {/* Proceed Button */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/insurance/payment-split',
              params: {
                serviceName: r.serviceName,
                amount: r.estimatedCost,
                serviceType: 'consultation',
              },
            })}
            style={{ flex: 1 }}
            activeOpacity={0.85}
          >
            <View style={[styles.proceedBtn, { backgroundColor: colors.primary }]}>
              <AppText variant="bodySM">المتابعة للدفع — {r.coverage.patientPays} ريال ←</AppText>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">فحص التغطية</AppText>
          <View style={{ width: 36 }}/>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">نوع الخدمة المطلوبة</AppText>
          <View style={styles.serviceTypesGrid}>
            {SERVICE_TYPES.map(s => (
              <TouchableOpacity key={s.id} onPress={() => setServiceType(s.id)}
                style={[styles.serviceTypeBtn, serviceType === s.id && { backgroundColor: colors.primary, borderColor: colors.primary } ]}>
                <AppText variant="bodySM">{s.icon}</AppText>
                <AppText variant="bodySM">{s.label}</AppText>
                <AppText variant="bodySM">{s.examples}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">اسم المزود (اختياري)</AppText>
          <View style={[styles.inputRow, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, borderColor: colors.border } ]}>
            <Icon name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={providerName} onChangeText={setProviderName}
              placeholder="اسم الطبيب أو المستشفى أو الصيدلية"
              placeholderTextColor={colors.textTertiary} textAlign="right"
            />
          </View>
        </View>

        <TouchableOpacity onPress={handleCheck} disabled={!serviceType} activeOpacity={0.85}
          style={{ opacity: !serviceType ? 0.6 : 1 }}>
          <View style={[styles.checkBtn, { backgroundColor: colors.primary }]}>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="search" size={16} color={colors.primary} /><AppText variant="bodySM">فحص التغطية الآن</AppText></View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  loadingStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  loadingStepIcon: { fontSize: 14 },
  loadingStepText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  serviceTypesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  serviceTypeBtn: { width: '47%', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', padding: 12, alignItems: 'center', gap: 4 },
  stIcon: { fontSize: 26 },
  stLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  stExamples: { fontSize: 10, fontWeight: '400', textAlign: 'center' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, height: 46, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '400' },
  checkBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  networkBanner: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  networkIcon: { fontSize: 32 },
  networkInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  networkTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  networkSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '400' },
  coverageSplit: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
  splitItem: { flex: 1, alignItems: 'center', gap: 4 },
  splitPct: { fontSize: 28, fontFamily: 'Cairo-ExtraBold' },
  splitLabel: { fontSize: 11, fontWeight: '400' },
  splitAmount: { fontSize: 14, fontWeight: '800' },
  splitDivider: { paddingHorizontal: 12, alignItems: 'center' },
  vsText: { fontSize: 12, color: '#999', fontWeight: '800' },
  breakRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1 },
  breakLabel: { fontSize: 13, fontWeight: '400' },
  breakVal: { fontSize: 14 },
  finalAmount: { borderRadius: 12, padding: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  finalAmountLabel: { fontSize: 13, fontWeight: '800' },
  finalAmountNum: { fontSize: 22, fontFamily: 'Cairo-ExtraBold' },
  preAuthCard: { borderRadius: 16, padding: 14, gap: 10 },
  preAuthText: { color: '#92400E', fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  preAuthBtn: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  preAuthBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  limitInfo: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  limitRemaining: { fontSize: 16, fontWeight: '800' },
  limitUsed: { fontSize: 12, fontWeight: '400' },
  limitBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  limitFill: { height: '100%', backgroundColor: '#5BA84F', borderRadius: 4 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 8 },
  proceedBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  proceedText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
