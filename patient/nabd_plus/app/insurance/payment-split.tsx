// @ts-nocheck
// app/insurance/payment-split.tsx
// الشاشة الأهم — تقسيم الدفع: حصة المريض + حصة الشركة + اختيار طريقة الدفع
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

// This screen receives: serviceType, totalAmount, serviceName, doctorName
export default function InsurancePaymentSplitScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const params = useLocalSearchParams();

  // E2: no fabricated fallbacks — amount comes only from the caller; missing amount = honest error state
  const parsedAmount = Number(params.amount);
  const SERVICE = {
    name: (params.serviceName as string) || '',
    provider: (params.doctorName as string) || '',
    totalAmount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null,
    serviceType: (params.serviceType as string) || 'consultation',
    requestId: (params.request_id as string) || '',
    date: (params.date as string) || '',
    time: (params.time as string) || '',
  };

  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isLoading, setIsLoading] = useState(false);
  const [coverageData, setCoverageData] = useState<any>(null);
  const [coverageError, setCoverageError] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);

  const loadCoverage = async () => {
    setCoverageLoading(true);
    setCoverageError(false);
    try {
      const res = await apiFetch(`/insurance/coverage-check?service_type=${SERVICE.serviceType}`);
      setCoverageData(res);
    } catch {
      setCoverageData(null);
      setCoverageError(true);
    } finally {
      setCoverageLoading(false);
    }
  };

  useEffect(() => {
    loadCoverage();
    apiFetch('/wallet/cards')
      .then((res: any) => setCards(Array.isArray(res?.cards) ? res.cards : []))
      .catch(() => setCards([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real split math — every input comes from the coverage engine; uncovered = patient pays everything
  const covered = coverageData?.covered === true || coverageData?.eligible === true;
  const copayPct = typeof coverageData?.copay_percent === 'number' ? coverageData.copay_percent : null;
  const coveragePct = covered && copayPct != null ? 100 - copayPct : 0;
  const deductible = covered && typeof coverageData?.copay_flat === 'number' ? coverageData.copay_flat : 0;
  const policyCompany = coverageData?.company_name_ar || coverageData?.policy?.company_name_ar || null;
  const memberId = coverageData?.patient_policy?.policy_number || coverageData?.policy?.policy_number || null;

  const total = SERVICE.totalAmount ?? 0;
  const afterDeductible = Math.max(0, total - deductible);
  const companyPays = Math.round(afterDeductible * (coveragePct / 100));
  const patientPays = total - companyPays;
  const coverageActual = total > 0 ? Math.round((companyPays / total) * 100) : 0;

  // Real payment methods: saved wallet cards + cash at facility
  const PAYMENT_METHODS: any[] = [
    ...cards.map((c: any) => ({
      id: `card_${c.id || c.last4}`,
      label: `${(c.type || 'بطاقة').toUpperCase()} •• ${c.last4}`,
      detail: c.holderName || c.holder_name || '',
      available: true,
    })),
    { id: 'cash', label: 'نقداً في المنشأة', detail: '', available: true },
  ];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/insurance/payment-confirm', {
        method: 'POST',
        body: JSON.stringify({
          service_type: SERVICE.serviceType,
          service_name: SERVICE.name,
          total_amount: SERVICE.totalAmount,
          patient_pays: patientPays,
          company_pays: companyPays,
          payment_method: paymentMethod,
        }),
      });
      if (SERVICE.serviceType === 'consultation') {
        router.replace({ pathname: '/consultations/booking-success', params: { appointmentId: res?.appointmentId || res?.id || '' } });
      } else if (SERVICE.serviceType === 'pharmacy') {
        router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: res?.orderId || res?.id || '' } });
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      showLocalizedAlert('خطأ', 'فشل تأكيد الدفع، يرجى المحاولة مجدداً');
    } finally {
      setIsLoading(false);
    }
  };

  // E2: honest error state when the caller didn't provide a real amount (was a fabricated 350 fallback)
  if (SERVICE.totalAmount == null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Icon name="warning" size={40} color={colors.error} />
        <AppText variant="h5" style={{ marginTop: 12, textAlign: 'center' }}>تعذر عرض ملخص الدفع</AppText>
        <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 6 }}>
          بيانات الخدمة غير مكتملة — ابدأ من فحص التغطية أو من حجز الخدمة أولاً
        </AppText>
        <Button label="فحص التغطية" variant="primary" size="md" full={false} onPress={() => router.replace('/insurance/coverage-check')} style={{ marginTop: 16 }} />
        <Button label="عودة" variant="outline" size="md" full={false} onPress={() => router.back()} style={{ marginTop: 8 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={styles.headerRow}>
          <AppText variant="bodySM">ملخص الدفع بالتأمين</AppText>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Summary */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">تفاصيل الخدمة</AppText>
          <View style={styles.serviceRow}>
            <View>
              <AppText variant="bodySM">
                {total} ريال
              </AppText>
              <AppText variant="bodySM">
                إجمالي الفاتورة
              </AppText>
            </View>
            <View style={styles.serviceInfo}>
              {!!SERVICE.name && <AppText variant="bodySM">{SERVICE.name}</AppText>}
              {!!SERVICE.provider && <AppText variant="bodySM">{SERVICE.provider}</AppText>}
              {!!(SERVICE.date || SERVICE.time) && (
                <AppText variant="bodySM">{[SERVICE.date, SERVICE.time].filter(Boolean).join(' • ')}</AppText>
              )}
            </View>
          </View>
        </View>

        {/* Coverage status — loading / error / uncovered are shown honestly */}
        {coverageLoading ? (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, alignItems: 'center' } ]}>
            <AppText variant="bodySM" color={colors.textSecondary}>جاري التحقق من تغطيتك…</AppText>
          </View>
        ) : coverageError ? (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white, alignItems: 'center', gap: 8 } ]}>
            <Icon name="warning" size={24} color={colors.error} />
            <AppText variant="bodySM" color={colors.textSecondary}>تعذر التحقق من التغطية — ستدفع كامل المبلغ ما لم تُعد المحاولة</AppText>
            <Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={loadCoverage} />
          </View>
        ) : !covered ? (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surfaceSecondary : '#FEF3C7' } ]}>
            <AppText variant="bodySM" color="#92400E">
              الخدمة غير مغطاة بوثيقتك{policyCompany ? ` (${policyCompany})` : ''} — ستدفع كامل المبلغ
            </AppText>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <View style={styles.insuranceUsedRow}>
              <View style={styles.insInfoRight}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <Icon name="shield" size={16} color={colors.primary} />
                  {!!policyCompany && <AppText variant="bodySM">{policyCompany}</AppText>}
                </View>
                {!!memberId && <AppText variant="bodySM">رقم الوثيقة: {memberId}</AppText>}
              </View>
            </View>
          </View>
        )}

        {/* Payment Breakdown — THE MAIN SECTION */}
        <View style={[styles.breakdownCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">توزيع الدفع</AppText>

          {/* Visual Split Bar */}
          <View style={styles.splitBarContainer}>
            <View style={styles.splitBar}>
              <View style={[styles.splitPatientBar, { width: `${100 - coverageActual}%` }]} >
                <AppText variant="bodySM">أنت {100 - coverageActual}%</AppText>
              </View>
              <View style={[styles.splitCompanyBar, { width: `${coverageActual}%` }]} >
                <AppText variant="bodySM">الشركة {coverageActual}%</AppText>
              </View>
            </View>
          </View>

          {/* Calculation Details */}
          <View style={styles.calcSection}>
            <View style={[styles.calcRow, { borderBottomColor: colors.border } ]}>
              <AppText variant="bodySM">{total} ريال</AppText>
              <AppText variant="bodySM">إجمالي الفاتورة</AppText>
            </View>

            {deductible > 0 && (
              <View style={[styles.calcRow, { borderBottomColor: colors.border } ]}>
                <AppText variant="bodySM">- {deductible} ريال</AppText>
                <AppText variant="bodySM">
                  التحمّل (مبلغ ثابت عليك)
                </AppText>
              </View>
            )}

            <View style={[styles.calcRow, { borderBottomColor: colors.border } ]}>
              <AppText variant="bodySM">{afterDeductible} ريال</AppText>
              <AppText variant="bodySM">المبلغ بعد التحمّل</AppText>
            </View>

            <View style={[styles.calcRow, { borderBottomColor: colors.border } ]}>
              <AppText variant="bodySM">- {companyPays} ريال</AppText>
              <AppText variant="bodySM">
                تغطية الشركة ({coveragePct}%)
              </AppText>
            </View>
          </View>

          {/* Patient Amount — Highlighted */}
          <View
            style={[styles.patientAmountBox, { backgroundColor: '#F0F7FF' }]}
          >
            <View style={styles.patientAmountRight}>
              <AppText variant="bodySM">حصتك أنت (تدفعها الآن)</AppText>
              <AppText variant="bodySM">
                {deductible > 0 ? `تحمّل ${deductible} ر + ` : ''}{100 - coveragePct}% من الباقي
              </AppText>
            </View>
            <AppText variant="bodySM">{patientPays} ر</AppText>
          </View>

          {/* Company Amount */}
          <View style={[styles.companyAmountBox, { backgroundColor: '#DCFCE7' } ]}>
            <View style={styles.companyAmountRight}>
              <AppText variant="bodySM">تدفعها شركة التأمين مباشرة</AppText>
              <AppText variant="bodySM">{policyCompany || 'شركة التأمين'} ← مقدم الخدمة</AppText>
            </View>
            <AppText variant="bodySM">{companyPays} ر</AppText>
          </View>
        </View>

        {/* Payment Method for Patient's Share */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">
            طريقة دفع حصتك ({patientPays} ريال)
          </AppText>

          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.id}
              onPress={() => method.available && setPaymentMethod(method.id)}
              style={[
                styles.paymentOpt,
                {
                  borderColor: paymentMethod === method.id ? colors.primary : colors.border,
                  backgroundColor: paymentMethod === method.id
                    ? colors.primarySurface
                    : isDark ? colors.background : colors.backgroundSecondary,
                  opacity: method.available ? 1 : 0.45,
                },
              ]}
              activeOpacity={method.available ? 0.7 : 1}
            >
              <View style={[
                styles.radioOuter,
                { borderColor: paymentMethod === method.id ? colors.primary : colors.border },]} >
                {paymentMethod === method.id && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              <View style={styles.methodInfo}>
                <AppText variant="bodySM">{method.label}</AppText>
                {method.detail ? (
                  <AppText variant="bodySM">{method.detail}</AppText>
                ) : null}
              </View>
              {!method.available && (
                <View style={[styles.unavailableBadge, { backgroundColor: '#FEE2E2' } ]}>
                  <AppText variant="bodySM">غير متاح</AppText>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Cash note */}
          {paymentMethod === 'cash' && (
            <View style={[styles.cashNote, { backgroundColor: '#FEF3C7' } ]}>
              <AppText variant="bodySM">
                ℹ عند الدفع كاش في المستشفى، ستحصل على إيصال. يمكنك بعدها طلب استرداد من شركة التأمين
              </AppText>
            </View>
          )}
        </View>

        {/* Summary Box */}
        <View style={[styles.summaryBox, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">ملخص نهائي</AppText>
          {[
            { label: 'إجمالي الخدمة', val: `${total} ريال`, color: colors.textPrimary },
            { label: `تغطية ${policyCompany || 'شركة التأمين'}`, val: `${companyPays} ريال-`, color: '#5BA84F' },
            { label: 'حصتك (تدفع الآن)', val: `${patientPays} ريال`, color: colors.primary, bold: true },
          ].map((r, i) => (
            <View key={i} style={[styles.summaryRow, { borderBottomColor: colors.border, borderBottomWidth: i < 2 ? 1 : 0 } ]}>
              <AppText variant="bodySM">{r.val}</AppText>
              <AppText variant="bodySM">{r.label}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <View style={styles.bottomInfo}>
          <AppText variant="bodySM">
            وفّرت {companyPays} ريال بالتأمين!
          </AppText>
          <AppText variant="bodySM">
            تدفع: <AppText variant="bodySM">{patientPays} ريال</AppText> فقط
          </AppText>
        </View>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={isLoading}
          style={{ flex: 1 }} activeOpacity={0.85}>
          <View
            style={[styles.confirmBtn, { backgroundColor: '#23B5CE' }]}
          >
            <AppText variant="bodySM">
              {isLoading
                ? 'جاري التأكيد...'
                : `تأكيد الدفع — ${patientPays} ريال `}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  serviceRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  serviceInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  serviceName: { fontSize: 15, fontWeight: '800' },
  serviceProvider: { fontSize: 12, fontWeight: '400' },
  serviceDateTime: { fontSize: 11, fontWeight: '400' },
  serviceTotal: { fontSize: 22, fontFamily: 'Cairo-ExtraBold', textAlign: 'center' },
  serviceTotalLabel: { fontSize: 10, fontWeight: '400', textAlign: 'center' },
  insuranceUsedRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  insInfoRight: { alignItems: 'flex-end', gap: 4 },
  insCompany: { fontSize: 15, fontWeight: '800' },
  insMemberId: { fontSize: 11, fontWeight: '400' },
  changeInsBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  changeInsText: { fontSize: 13, fontWeight: '700' },
  breakdownCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  splitBarContainer: { marginBottom: 16 },
  splitBar: { flexDirection: 'row', height: 36, borderRadius: 10, overflow: 'hidden', gap: 2 },
  splitPatientBar: { backgroundColor: '#23B5CE', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  splitCompanyBar: { backgroundColor: '#5BA84F', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  splitBarLabel: { color: '#fff', fontSize: 11, fontWeight: '800' },
  calcSection: { marginBottom: 14, gap: 0 },
  calcRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  calcLabel: { fontSize: 13, fontWeight: '400' },
  calcLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  calcVal: { fontSize: 14, fontWeight: '700' },
  infoIcon: { padding: 2 },
  patientAmountBox: { borderRadius: 14, padding: 14, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1.5, borderColor: '#23B5CE40' },
  patientAmountRight: { alignItems: 'flex-end', gap: 3 },
  patientAmountLabel: { color: '#23B5CE', fontSize: 13, fontWeight: '800' },
  patientAmountNote: { color: '#8FD4E3', fontSize: 11, fontWeight: '400' },
  patientAmountNum: { color: '#23B5CE', fontSize: 26, fontFamily: 'Cairo-ExtraBold' },
  companyAmountBox: { borderRadius: 14, padding: 14, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  companyAmountRight: { alignItems: 'flex-end', gap: 3 },
  companyAmountLabel: { color: '#16A34A', fontSize: 13, fontWeight: '800' },
  companyAmountNote: { color: '#5BA84F', fontSize: 11, fontWeight: '400' },
  companyAmountNum: { color: '#16A34A', fontSize: 22, fontFamily: 'Cairo-ExtraBold' },
  paymentOpt: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 5.5 },
  methodInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  methodLabel: { fontSize: 14, fontWeight: '700' },
  methodDetail: { fontSize: 11, fontWeight: '400' },
  unavailableBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  unavailableText: { color: '#F0695C', fontSize: 10, fontWeight: '700' },
  cashNote: { borderRadius: 12, padding: 10, marginTop: 4 },
  cashNoteText: { color: '#D97706', fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 18 },
  summaryBox: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 10 },
  summaryLabel: { fontSize: 14 },
  summaryVal: {},
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row-reverse', gap: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 8 },
  bottomInfo: { gap: 2 },
  bottomSaving: { fontSize: 12, fontWeight: '700' },
  bottomNote: { fontSize: 12, fontWeight: '400' },
  confirmBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
