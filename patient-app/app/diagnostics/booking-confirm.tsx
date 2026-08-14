// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SegmentedControl, SectionHeader, Input } from '../../src/components/ui';
import { INSURANCE_COMPANIES } from '../../src/constants/insurance';
import { apiFetch } from '../../src/utils/api';

export default function DiagnosticsBookingConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();

  const [sampleLocation, setSampleLocation] = useState('home');
  const [payMethod, setPayMethod] = useState('card');
  const [insCompany, setInsCompany] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [memberId, setMemberId] = useState('');
  const [loading, setLoading] = useState(false);

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoadingCart(true);
        const data = await apiFetch<any>('/cart');
        const filtered = (data.lines || []).filter((l: any) => l.kind === 'lab' || l.kind === 'radiology');
        setCartItems(filtered);
      } catch (err) {
        console.log('Error loading cart in booking confirm', err);
      } finally {
        setLoadingCart(false);
      }
    };
    loadCart();
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
  const homeVisitFee = sampleLocation === 'home' ? 50 : 0;
  const vat = Math.round((subtotal + homeVisitFee) * 0.15);
  const total = subtotal + homeVisitFee + vat;

  const handleConfirm = async () => {
    if (cartItems.length === 0) {
      Alert.alert('تنبيه', 'السلة فارغة حالياً');
      return;
    }
    setLoading(true);
    try {
      // 1. Create booking in backend
      const booking = await apiFetch<any>('/labs/bookings', {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems.map(i => ({ service_id: i.service_id })),
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          payment_method: payMethod,
          location_type: sampleLocation,
          provider_account_id: params.labId || 'provider_lab_default',
          insurance_company: insCompany,
          policy_number: policyNumber,
          member_id: memberId,
          address: {
            address: "شارع الأمير سلطان، حي السلامة، جدة",
            lat: 21.5434,
            lng: 39.1728,
          },
          documents: payMethod === 'insurance' ? [
            { name: 'doctor_request.pdf', url: 'https://example.com/doctor_request.pdf', kind: 'doctor_request' }
          ] : []
        }),
      });

      if (!booking || !booking.id) {
        throw new Error('فشل إنشاء الحجز');
      }

      // 2. Clear Cart (labs/radiology items)
      await apiFetch('/cart/clear', {
        method: 'POST',
        body: JSON.stringify({ kind: 'lab' }),
      }).catch(() => null);

      await apiFetch('/cart/clear', {
        method: 'POST',
        body: JSON.stringify({ kind: 'radiology' }),
      }).catch(() => null);

      setLoading(false);

      if (payMethod === 'insurance') {
        router.push({ pathname: '/insurance/approval-pending', params: { amount: String(total), bookingId: booking.id } });
      } else {
        Alert.alert('نجاح', 'تم حجز التحليل بنجاح!', [
          { text: 'موافق', onPress: () => router.push({ pathname: '/diagnostics/sample-tracking', params: { bookingId: booking.id } }) }
        ]);
      }
    } catch (err: any) {
      console.log('Error creating booking', err);
      Alert.alert('خطأ', err.message || 'فشل إتمام الحجز. يرجى التأكد من كافة الحقول.');
      setLoading(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">تأكيد حجز التحاليل</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loadingCart ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
          {/* Tests list */}
          <Card>
            <SectionHeader title="التحاليل المطلوبة" />
            {cartItems.map((item, i) => (
              <View key={item.line_id || i} style={[st.itemRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                <AppText variant="labelMD">{(item.price || 0) * (item.qty || 1)} ر.س</AppText>
                <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', flex: 1 }}>
                  <Icon name="science" size={16} color="#7A6BEA" />
                  <AppText variant="bodySM">{item.name_ar} {item.qty > 1 ? `(x${item.qty})` : ''}</AppText>
                </View>
              </View>
            ))}
          </Card>

          {/* Sample location */}
          <Card>
            <SectionHeader title="مكان سحب العينة" />
            <SegmentedControl value={sampleLocation} onChange={setSampleLocation} options={[
              { key: 'home', label: 'في المنزل', icon: 'home' },
              { key: 'lab', label: 'في المختبر', icon: 'hospital' },
            ]} />
            {sampleLocation === 'home' && (
              <View style={{ marginTop: 10, gap: 8 }}>
                <Card onPress={() => router.push('/delivery/address-select')} style={{ backgroundColor: colors.surfaceSecondary }}>
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center', flex: 1 }}>
                      <Icon name="location" size={18} color={colors.primary} />
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <AppText variant="labelSM">المنزل</AppText>
                        <AppText variant="caption" color={colors.textTertiary}>شارع الأمير سلطان، جدة</AppText>
                      </View>
                    </View>
                    <AppText variant="labelSM" color={colors.primary}>تغيير</AppText>
                  </View>
                </Card>
                <Card style={{ backgroundColor: colors.infoSurface }}>
                  <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
                    <Icon name="info" size={16} color={colors.info} />
                    <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>سيصلك فني مختبر معتمد. ستتمكن من تتبعه على الخريطة. رسوم الزيارة: 50 ر.س</AppText>
                  </View>
                </Card>
              </View>
            )}
            {sampleLocation === 'lab' && (
              <View style={{ marginTop: 10 }}>
                <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
                  <View style={[st.labIcon, { backgroundColor: '#7A6BEA18' } ]}>
                    <Icon name="hospital" size={22} color="#7A6BEA" />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <AppText variant="h6">مختبر معتمد</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>طريق الملك فهد — 2.3 كم</AppText>
                  </View>
                  <Icon name="chevronLeft" size={16} color={colors.textTertiary} />
                </Card>
              </View>
            )}
          </Card>

          {/* Fasting instructions */}
          <Card style={{ backgroundColor: colors.warningSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
              <Icon name="warning" size={18} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <AppText variant="h6" color={colors.warning}>تعليمات قبل السحب</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>صيام 8-12 ساعة مطلوب لبعض التحاليل. اشرب ماء فقط.</AppText>
              </View>
            </View>
          </Card>

          {/* Payment */}
          <Card>
            <SectionHeader title="طريقة الدفع" />
            <SegmentedControl value={payMethod} onChange={setPayMethod} options={[
              { key: 'card', label: 'بطاقة', icon: 'card' },
              { key: 'wallet', label: 'المحفظة', icon: 'wallet' },
              { key: 'insurance', label: 'تأمين', icon: 'shield' },
            ]} />
          </Card>

          {payMethod === 'insurance' && (
            <Card style={{ gap: 10 }}>
              <SectionHeader title="تفاصيل التأمين" />
              <AppText variant="caption" color={colors.textTertiary}>سيتم التحقق من تغطية التحاليل عبر NPHIES</AppText>
              
              {/* Company Options List */}
              {INSURANCE_COMPANIES.map(company => (
                <TouchableOpacity key={company.name} onPress={() => setInsCompany(company.id)} style={[st.insOption, { borderColor: insCompany === company.id ? colors.primary : colors.border, backgroundColor: insCompany === company.id ? colors.primarySurface : 'transparent', marginBottom: 0 } ]}>
                  <View style={[st.radio, { borderColor: insCompany === company.id ? colors.primary : colors.border } ]}>
                    {insCompany === company.id && <View style={[st.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <AppText variant="bodySM" color={insCompany === company.id ? colors.primary : colors.textSecondary}>{company.name}</AppText>
                </TouchableOpacity>
              ))}

              <Input value={policyNumber} onChangeText={setPolicyNumber} placeholder="رقم بوليصة التأمين" icon="document" />
              <Input value={memberId} onChangeText={setMemberId} placeholder="رقم عضوية التأمين" icon="user" />
            </Card>
          )}

          {/* Price */}
          <Card>
            <SectionHeader title="ملخص التكلفة" />
            <View style={st.priceRow}>
              <AppText variant="bodySM">{subtotal} ر.س</AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>التحاليل ({cartItems.length})</AppText>
            </View>
            {homeVisitFee > 0 && (
              <View style={st.priceRow}>
                <AppText variant="bodySM">{homeVisitFee} ر.س</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>رسوم الزيارة المنزلية</AppText>
              </View>
            )}
            <View style={st.priceRow}>
              <AppText variant="bodySM">{vat} ر.س</AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>ضريبة (15%)</AppText>
            </View>
            <View style={[st.priceRow, { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10, marginTop: 4 } ]}>
              <AppText variant="h4" color={colors.primary}>{total} ر.س</AppText>
              <AppText variant="h6">الإجمالي</AppText>
            </View>
            {payMethod === 'insurance' && (
              <AppText variant="caption" color={colors.success} style={{ marginTop: 6 }}>* سيتم عرض نسبة تحملك بعد التحقق</AppText>
            )}
          </Card>
        </ScrollView>
      )}

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button
          label={payMethod === 'insurance' ? 'التحقق من التأمين والحجز' : `تأكيد ودفع ${total} ر.س`}
          variant="gradient" size="lg"
          icon={payMethod === 'insurance' ? 'shield' : 'check-circle'}
          loading={loading}
          disabled={payMethod === 'insurance' && (!insCompany || !policyNumber || !memberId)}
          onPress={handleConfirm}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  itemRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  labIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  insOption: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', padding: 10, borderWidth: 1.5, borderRadius: 12, marginBottom: 6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
