// @ts-nocheck
// app/returns/new-request.tsx
import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

import { Alert } from 'react-native';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const SERVICE_TYPES = [
  { id: 'pharmacy', label: 'طلب صيدلية', icon: 'medication', color: '#5BA84F' },
  { id: 'consultation', label: 'استشارة طبية', icon: 'consultations', color: '#23B5CE' },
  { id: 'diagnostics', label: 'تحاليل ومختبر', icon: 'science', color: '#7A6BEA' },
  { id: 'nursing', label: 'تمريض منزلي', icon: 'medication', color: '#F0695C' },
  { id: 'insurance', label: 'مطالبة تأمين', icon: 'shield', color: '#F0A526' },
];

const REASONS = {
  pharmacy: ['دواء تالف أو منتهي الصلاحية', 'خطأ في الطلب', 'دواء خاطئ', 'لم يصل الطلب', 'كميات ناقصة', 'سبب آخر'],
  consultation: ['إلغاء الموعد', 'الطبيب لم يحضر', 'جودة الاستشارة', 'مشكلة تقنية', 'سبب آخر'],
  diagnostics: ['تكرار الطلب', 'إلغاء التحليل', 'خطأ في النتائج', 'لم يتم السحب', 'سبب آخر'],
  nursing: ['الممرض لم يحضر', 'تأخر عن الموعد', 'جودة الخدمة', 'إلغاء الطلب', 'سبب آخر'],
  insurance: ['دفع زائد', 'خطأ في الحساب', 'خدمة غير مغطاة', 'سبب آخر'],
};

const REFUND_METHODS = [
  { id: 'wallet', label: 'محفظة نبض', icon: 'wallet', duration: 'فوري' },
  { id: 'card', label: 'البطاقة الأصلية', icon: 'card', duration: '3-5 أيام' },
  { id: 'bank', label: 'حساب بنكي', icon: 'hospital', duration: '5-7 أيام' },
];

// Policy per type
const POLICIES: Record<string, { rate: number; conditions: string }> = {
  pharmacy: { rate: 100, conditions: 'خلال 24 ساعة من الاستلام وبحالة سليمة' },
  consultation: { rate: 100, conditions: 'إلغاء قبل 24 ساعة — 50% قبل 12 ساعة' },
  diagnostics: { rate: 100, conditions: 'قبل إجراء التحليل — 50% إذا بدأ السحب' },
  nursing: { rate: 90, conditions: 'إذا لم يبدأ الممرض الخدمة بعد' },
  insurance: { rate: 100, conditions: 'في حالة ثبوت خطأ في الحساب' },
};

export default function NewReturnRequestScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'success'>('type');
  const [serviceType, setServiceType] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [orderId, setOrderId] = useState('');
  const [details, setDetails] = useState('');
  const [refundMethod, setRefundMethod] = useState('wallet');
  const [attachedDocs, setAttachedDocs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiFetch('/pharmacy/returns', {
        method: 'POST',
        body: JSON.stringify({
          serviceType,
          reason: selectedReason,
          orderId,
          details,
          refundMethod,
          amount: serviceType === 'consultation' ? 250 : serviceType === 'diagnostics' ? 120 : 80,
        }),
      });
      setIsSubmitting(false);
      setStep('success');
    } catch (e) {
      setIsSubmitting(false);
      showLocalizedAlert('خطأ', 'فشل تقديم طلب الإرجاع. الرجاء المحاولة مرة أخرى.');
    }
  };

  const policy = POLICIES[serviceType] || { rate: 100, conditions: '' };
  const reasons = REASONS[serviceType as keyof typeof REASONS] || [];

  if (step === 'success') {
    return (
      <View style={styles.successContainer}>
        <View style={StyleSheet.absoluteFillObject} />
        <Icon name="check_circle" size={20} color={colors.primary} />
        <AppText variant="bodySM">تم إرسال طلب الإرجاع!</AppText>
        <AppText variant="bodySM">رقم الطلب: RET-{Date.now().toString().slice(-6)}</AppText>
        <AppText variant="bodySM">
          سيراجع فريقنا طلبك خلال 24-48 ساعة وسيتم إشعارك بالنتيجة
        </AppText>
        <TouchableOpacity onPress={() => router.replace('/returns/hub')} style={styles.doneBtn}>
          <AppText variant="bodySM">عرض طلباتي</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}><AppText variant="bodySM">الرئيسية</AppText></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <AppText variant="bodySM">
          {step === 'type' ? 'طلب إرجاع جديد' : step === 'details' ? 'تفاصيل الطلب' : 'تأكيد الطلب'}
        </AppText>
        <TouchableOpacity onPress={() => step === 'type' ? router.back() : setStep(step === 'details' ? 'type' : 'details')}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={[styles.progressBar, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
        {['type', 'details', 'confirm'].map((s, i) => (
          <View key={s} style={styles.progressStep}>
            <View style={[styles.progressDot, {
              backgroundColor: ['type', 'details', 'confirm'].indexOf(step) >= i ? '#7C3AED' : colors.border
            }]}>
              <AppText variant="bodySM">{i + 1}</AppText>
            </View>
            <AppText variant="bodySM" color={['type', 'details', 'confirm'].indexOf(step) >= i ? '#7C3AED' : colors.textTertiary}>
              {s === 'type' ? 'النوع' : s === 'details' ? 'التفاصيل' : 'التأكيد'}
            </AppText>
            {i < 2 && <View style={[styles.progressLine, { backgroundColor: ['type', 'details', 'confirm'].indexOf(step) >= i ? '#7C3AED' : colors.border }]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* STEP 1: Service Type */}
        {step === 'type' && (
          <>
            <AppText variant="bodySM">ما نوع الخدمة التي تريد إرجاعها؟</AppText>
            {SERVICE_TYPES.map(t => (
              <TouchableOpacity key={t.id} onPress={() => setServiceType(t.id)}
                style={[styles.typeCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: serviceType === t.id ? t.color : 'transparent', borderWidth: serviceType === t.id ? 2 : 0 }]}
                activeOpacity={0.85}>
                <View style={styles.typeCardLeft}>
                  {serviceType === t.id && (
                    <View style={[styles.selectedCheck, { backgroundColor: t.color } ]}>
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.typeInfo}>
                  <AppText variant="bodySM">{t.label}</AppText>
                  {serviceType === t.id && POLICIES[t.id] && (
                    <AppText variant="bodySM">
                      استرداد {POLICIES[t.id].rate}% — {POLICIES[t.id].conditions}
                    </AppText>
                  )}
                </View>
                <View style={[styles.typeIcon, { backgroundColor: t.color + '18' } ]}>
                  <AppText variant="bodySM">{t.icon}</AppText>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setStep('details')} disabled={!serviceType}
              activeOpacity={0.85} style={{ opacity: !serviceType ? 0.5 : 1 }}>
              <View style={styles.nextBtn}>
                <AppText variant="bodySM">التالي ←</AppText>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2: Details */}
        {step === 'details' && (
          <>
            <AppText variant="bodySM">تفاصيل طلب الإرجاع</AppText>

            {/* Order ID */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">رقم الطلب أو الفاتورة</AppText>
              <View style={[styles.inputRow, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, borderColor: colors.border } ]}>
                <TextInput style={[styles.input, { color: colors.textPrimary }]} value={orderId} onChangeText={setOrderId}
                  placeholder="مثال: ORD-2024-001" placeholderTextColor={colors.textTertiary} textAlign="right" />
              </View>
            </View>

            {/* Reason */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">سبب الإرجاع</AppText>
              {reasons.map(r => (
                <TouchableOpacity key={r} onPress={() => setSelectedReason(r)}
                  style={[styles.reasonRow, { borderBottomColor: colors.border, backgroundColor: selectedReason === r ? '#EDE9FE' : 'transparent' } ]}>
                  <View style={[styles.radioOuter, { borderColor: selectedReason === r ? '#7C3AED' : colors.border } ]}>
                    {selectedReason === r && <View style={[styles.radioDot, { backgroundColor: '#7C3AED' }]} />}
                  </View>
                  <AppText variant="bodySM">{r}</AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional details */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">تفاصيل إضافية</AppText>
              <TextInput style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}
                value={details} onChangeText={setDetails}
                placeholder="اشرح مشكلتك بالتفصيل..." placeholderTextColor={colors.textTertiary}
                multiline numberOfLines={4} textAlignVertical="top" textAlign="right" />
            </View>

            {/* Attach photos */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">إرفاق صور (اختياري)</AppText>
              <TouchableOpacity onPress={() => setAttachedDocs(p => [...p, `صورة ${p.length + 1}`])}
                style={[styles.attachBtn, { borderColor: colors.border } ]}>
                <Icon name="camera" size={20} color={colors.textTertiary} />
                <AppText variant="bodySM">التقط أو ارفع صورة</AppText>
              </TouchableOpacity>
              <View style={styles.docsRow}>
                {attachedDocs.map((doc, i) => (
                  <View key={i} style={[styles.docTag, { backgroundColor: '#EDE9FE' } ]}>
                    <Icon name="image" size={12} color="#7C3AED" />
                    <AppText variant="bodySM">{doc}</AppText>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={() => setStep('confirm')} disabled={!selectedReason}
              activeOpacity={0.85} style={{ opacity: !selectedReason ? 0.5 : 1 }}>
              <View style={styles.nextBtn}>
                <AppText variant="bodySM">مراجعة الطلب ←</AppText>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3: Confirm */}
        {step === 'confirm' && (
          <>
            <AppText variant="bodySM">مراجعة وتأكيد الطلب</AppText>

            {/* Summary */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">ملخص الطلب</AppText>
              {[
                { label: 'نوع الخدمة', val: SERVICE_TYPES.find(t => t.id === serviceType)?.label || '' },
                { label: 'السبب', val: selectedReason },
                { label: 'رقم الطلب', val: orderId || 'غير محدد' },
              ].map((r, i) => (
                <View key={i} style={[styles.summaryDetailRow, { borderBottomColor: colors.border } ]}>
                  <AppText variant="bodySM">{r.val}</AppText>
                  <AppText variant="bodySM">{r.label}</AppText>
                </View>
              ))}
            </View>

            {/* Refund Method */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">طريقة الاسترداد</AppText>
              {REFUND_METHODS.map(m => (
                <TouchableOpacity key={m.id} onPress={() => setRefundMethod(m.id)}
                  style={[styles.refundRow, { borderBottomColor: colors.border, backgroundColor: refundMethod === m.id ? '#EDE9FE' : 'transparent' } ]}>
                  <View style={styles.refundRight}>
                    <AppText variant="bodySM">{m.duration}</AppText>
                  </View>
                  <View style={styles.refundInfo}>
                    <AppText variant="bodySM">{m.icon} {m.label}</AppText>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: refundMethod === m.id ? '#7C3AED' : colors.border } ]}>
                    {refundMethod === m.id && <View style={[styles.radioDot, { backgroundColor: '#7C3AED' }]} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Policy reminder */}
            <View style={[styles.policyNote, { backgroundColor: '#EDE9FE' } ]}>
              <AppText variant="bodySM">
                 بناءً على سياستنا، الاسترداد المتوقع: {policy.rate}% من قيمة الطلب
              </AppText>
            </View>

            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.85}>
              <View style={styles.submitBtn}>
                <AppText variant="bodySM">{isSubmitting ? 'جاري الإرسال...' : 'إرسال طلب الإرجاع'}</AppText>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  successTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  successRef: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700' },
  successNote: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '400', textAlign: 'center', lineHeight: 20 },
  doneBtn: { backgroundColor: 'transparent', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 13, marginTop: 8 },
  doneBtnText: { color: '#7C3AED', fontSize: 15, fontWeight: '800' },
  homeLink: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '400', marginTop: 6 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  progressBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  progressStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  progressDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  progressDotText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  progressLabel: { fontSize: 10, fontWeight: '400' },
  progressLine: { width: 30, height: 2, borderRadius: 1, marginHorizontal: 4 },
  stepTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  typeCard: { borderRadius: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  typeIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  typeInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  typeLabel: { fontSize: 14, fontWeight: '700' },
  typePolicy: { fontSize: 11, fontWeight: '400', textAlign: 'right' },
  typeCardLeft: { alignItems: 'center' },
  selectedCheck: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  nextBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  card: { borderRadius: 18, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 10 },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 12, borderWidth: 1, height: 46, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '400' },
  reasonRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderRadius: 8, paddingHorizontal: 4, marginBottom: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  textArea: { borderRadius: 12, borderWidth: 1, padding: 12, minHeight: 90, fontSize: 13, fontWeight: '400' },
  attachBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', padding: 12, justifyContent: 'center', marginBottom: 8 },
  attachText: { fontSize: 13, fontWeight: '400' },
  docsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  docTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  docTagText: { color: '#7C3AED', fontSize: 10, fontWeight: '700' },
  summaryDetailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1 },
  summaryLbl: { fontSize: 13, fontWeight: '400' },
  summaryVal: { fontSize: 13, fontWeight: '700' },
  refundRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderRadius: 8, paddingHorizontal: 4 },
  refundInfo: { flex: 1, alignItems: 'flex-end' },
  refundLabel: { fontSize: 14, fontWeight: '700' },
  refundRight: { alignItems: 'center' },
  refundDuration: { fontSize: 11, fontWeight: '700' },
  policyNote: { borderRadius: 12, padding: 12 },
  policyNoteText: { color: '#6D28D9', fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 18 },
  submitBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});