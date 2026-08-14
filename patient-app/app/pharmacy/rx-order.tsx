// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { INSURANCE_COMPANIES, INSURANCE_CATEGORIES } from '../../src/constants/insurance';

import { apiFetch } from '../../src/utils/api';

export default function RxOrderScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [payMethod, setPayMethod] = useState('insurance');
  const [insCompany, setInsCompany] = useState('bupa');
  const [insCategory, setInsCategory] = useState('b');
  const [prescriptionUploaded, setPrescriptionUploaded] = useState(true); // true since coming from doctor
  const [approvalUploaded, setApprovalUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const [meds, setMeds] = useState<any[]>([]);
  const [rxDetails, setRxDetails] = useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/cart/prescription');
        if (data) {
          setRxDetails(data);
          setMeds(data.medications || []);
        }
      } catch (err) {}
    })();
  }, []);

  const hasRxRequired = meds.some(m => m.requiresRx);
  const subtotal = meds.reduce((s, m) => s + m.price, 0);
  const deliveryFee = deliveryType === 'delivery' ? 15 : 0;
  const vat = Math.round((subtotal + deliveryFee) * 0.15);
  const total = subtotal + deliveryFee + vat;

  const handleConfirm = () => {
    setLoading(true);
    if (payMethod === 'insurance') {
      setTimeout(() => {
        setLoading(false);
        router.push({ pathname: '/insurance/approval-pending', params: { amount: String(total) } });
      }, 800);
    } else {
      setTimeout(() => {
        setLoading(false);
        router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: 'RX001' } });
      }, 800);
    }
  };

  const canSubmit = payMethod !== 'insurance' || (prescriptionUploaded || approvalUploaded);

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }}/>
          <AppText variant="h4" color="#fff">طلب أدوية الوصفة</AppText>
          <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* Prescription source */}
        {rxDetails && (
          <Card style={{ backgroundColor: colors.successSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
              <Icon name="check_circle" size={22} color={colors.success} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="h6" color={colors.success}>وصفة من {rxDetails.doctor}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>{rxDetails.specialty} — {rxDetails.date}</AppText>
              </View>
            </View>
          </Card>
        )}

        {/* Medications */}
        <Card>
          <SectionHeader title="الأدوية الموصوفة" />
          {meds.map((med, i) => (
            <View key={med.id} style={[st.medRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', flex: 1 }}>
                  <View style={[st.medIcon, { backgroundColor: med.requiresRx ? '#F0695C18' : colors.primarySurface } ]}>
                    <Icon name="medication" size={18} color={med.requiresRx ? '#F0695C' : colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                    <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
                      <AppText variant="labelMD">{med.name}</AppText>
                      {med.requiresRx && <Badge label="يحتاج وصفة" color="#F0695C" />}
                    </View>
                    <AppText variant="caption" color={colors.textTertiary}>{med.dose} — {med.qty} حبة</AppText>
                  </View>
                </View>
                <AppText variant="h6" color={colors.primary}>{med.price} ر.س</AppText>
              </View>
            </View>
          ))}
        </Card>

        {/* Prescription/Approval upload */}
        {payMethod === 'insurance' && (
          <Card>
            <SectionHeader title="المستندات المطلوبة للتأمين" />
            <AppText variant="caption" color={colors.textTertiary} style={{ marginBottom: 8 }}>التأمين يتطلب وصفة طبية أو موافقة مسبقة لصرف الأدوية</AppText>

            {/* Prescription image */}
            <TouchableOpacity onPress={() => setPrescriptionUploaded(true)} style={[st.uploadBtn, { borderColor: prescriptionUploaded ? colors.success : colors.primary, backgroundColor: prescriptionUploaded ? colors.successSurface : 'transparent' } ]}>
              <Icon name={prescriptionUploaded ? 'check-circle' : 'camera'} size={22} color={prescriptionUploaded ? colors.success : colors.primary} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="labelMD" color={prescriptionUploaded ? colors.success : colors.primary}>{prescriptionUploaded ? 'تم إرفاق الوصفة' : 'رفع صورة الوصفة'}</AppText>
                {hasRxRequired && !prescriptionUploaded && <AppText variant="caption" color={colors.error}>مطلوب — يوجد أدوية تحتاج وصفة</AppText>}
              </View>
            </TouchableOpacity>

            {/* Approval upload (optional — if patient has prior approval) */}
            <TouchableOpacity onPress={() => setApprovalUploaded(true)} style={[st.uploadBtn, { borderColor: approvalUploaded ? colors.success : colors.border, backgroundColor: approvalUploaded ? colors.successSurface : 'transparent', marginTop: 8 } ]}>
              <Icon name={approvalUploaded ? 'check-circle' : 'document'} size={22} color={approvalUploaded ? colors.success : colors.textTertiary} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="labelMD" color={approvalUploaded ? colors.success : colors.textSecondary}>{approvalUploaded ? 'تم إرفاق الموافقة' : 'رفع موافقة مسبقة (اختياري)'}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>إذا لديك موافقة من شركة التأمين</AppText>
              </View>
            </TouchableOpacity>

            {!prescriptionUploaded && !approvalUploaded && (
              <Card style={{ backgroundColor: colors.warningSurface, marginTop: 8 }}>
                <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
                  <Icon name="warning" size={16} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySM" color={colors.textSecondary}>بدون وصفة أو موافقة لا يمكن صرف الأدوية على التأمين.</AppText>
                    <Button label="ليس لديك وصفة؟ استشر طبيب" variant="ghost" icon="doctor" onPress={() => router.push('/(tabs)/consultations')} style={{ marginTop: 6 }} />
                  </View>
                </View>
              </Card>
            )}
          </Card>
        )}

        {/* Delivery type */}
        <Card>
          <SectionHeader title="طريقة الاستلام" />
          <SegmentedControl value={deliveryType} onChange={setDeliveryType} options={[
            { key: 'delivery', label: 'توصيل', icon: 'navigate' },
            { key: 'pickup', label: 'استلام', icon: 'hospital' },
          ]} />
        </Card>

        {deliveryType === 'delivery' && (
          <Card onPress={() => router.push('/delivery/address-select')}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', flex: 1 }}>
                <Icon name="location" size={20} color={colors.primary} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="h6">المنزل</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>شارع الأمير سلطان، حي السلامة، جدة</AppText>
                </View>
              </View>
              <AppText variant="labelSM" color={colors.primary}>تغيير</AppText>
            </View>
          </Card>
        )}

        {/* Payment */}
        <Card>
          <SectionHeader title="طريقة الدفع" />
          <SegmentedControl value={payMethod} onChange={setPayMethod} options={[
            { key: 'insurance', label: 'تأمين', icon: 'shield' },
            { key: 'card', label: 'بطاقة', icon: 'card' },
            { key: 'cod', label: 'عند الاستلام', icon: 'cash' },
          ]} />
        </Card>

        {payMethod === 'insurance' && (
          <Card>
            <SectionHeader title="بيانات التأمين" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {INSURANCE_COMPANIES.slice(0, 10).map(c => (
                <TouchableOpacity key={c.id} onPress={() => setInsCompany(c.id)} style={[st.chip, { borderColor: insCompany === c.id ? colors.primary : colors.border, backgroundColor: insCompany === c.id ? colors.primarySurface : 'transparent' } ]}>
                  <AppText variant="labelSM" color={insCompany === c.id ? colors.primary : colors.textSecondary} numberOfLines={1}>{c.name}</AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {insCompany && (
              <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {INSURANCE_CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat.key} onPress={() => setInsCategory(cat.key)} style={[st.catChip, { borderColor: insCategory === cat.key ? colors.primary : colors.border, backgroundColor: insCategory === cat.key ? colors.primarySurface : 'transparent' } ]}>
                    <AppText variant="labelSM" color={insCategory === cat.key ? colors.primary : colors.textSecondary}>{cat.label} ({cat.copayPercent}%)</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Total */}
        <Card>
          <SectionHeader title="ملخص التكلفة" />
          <View style={st.priceRow}><AppText variant="bodySM" color={colors.textSecondary}>الأدوية ({meds.length})</AppText><AppText variant="bodySM">{subtotal} ر.س</AppText></View>
          {deliveryFee > 0 && <View style={st.priceRow}><AppText variant="bodySM" color={colors.textSecondary}>التوصيل</AppText><AppText variant="bodySM">{deliveryFee} ر.س</AppText></View>}
          <View style={st.priceRow}><AppText variant="bodySM" color={colors.textSecondary}>ضريبة (15%)</AppText><AppText variant="bodySM">{vat} ر.س</AppText></View>
          <View style={[st.priceRow, { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10, marginTop: 4 } ]}>
            <AppText variant="h6">الإجمالي</AppText>
            <AppText variant="h4" color={colors.primary}>{total} ر.س</AppText>
          </View>
          {payMethod === 'insurance' && <AppText variant="caption" color={colors.success} style={{ marginTop: 4 }}>* نسبة تحملك ستظهر بعد التحقق من التأمين</AppText>}
        </Card>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button
          label={payMethod === 'insurance' ? 'التحقق من التأمين وطلب الأدوية' : `تأكيد ودفع ${total} ر.س`}
          variant="gradient" size="lg"
          icon={payMethod === 'insurance' ? 'shield' : 'check-circle'}
          loading={loading}
          disabled={payMethod === 'insurance' && !canSubmit}
          onPress={handleConfirm}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hdrRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  medRow: { paddingVertical: 12 },
  medIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 14, flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  catChip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
