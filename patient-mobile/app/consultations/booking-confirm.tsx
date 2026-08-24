// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { STORAGE_KEYS, API_BASE_URL } from '../../src/constants';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { apiFetch } from '../../src/utils/api';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { Alert } from 'react-native';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const VISIT_TYPES = [
  { key: 'video', label: 'فيديو', icon: 'video' as IconName, desc: 'استشارة عن بعد' },
  { key: 'clinic', label: 'عيادة', icon: 'hospital' as IconName, desc: 'كشف حضوري' },
  { key: 'home', label: 'منزلي', icon: 'home' as IconName, desc: 'زيارة منزلية' },
];

export default function BookingConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [visitType, setVisitType] = useState((params.visitType as string) || 'clinic');
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [insCompany, setInsCompany] = useState('');
  const [insCategory, setInsCategory] = useState('');
  // Unified insurance catalog from the backend (single source of truth used
  // by profile, pharmacy, labs, radiology, nursing and provider contracts).
  const [insCompanies, setInsCompanies] = useState<any[]>([]);
  const [insCategories, setInsCategories] = useState<any[]>([]);
  const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);

  useEffect(() => {
    if (!showInsurance) return;
    (async () => {
      try {
        const list = await apiFetch('/insurance/companies');
        const companies = Array.isArray(list) ? list : [];
        setInsCompanies(companies);
        setInsuranceCatalogUnavailable(companies.length === 0);
      } catch {
        setInsCompanies([]);
        setInsuranceCatalogUnavailable(true);
      }
    })();
  }, [showInsurance]);

  useEffect(() => {
    if (!insCompany) { setInsCategories([]); return; }
    (async () => {
      try {
        const nets = await apiFetch(`/insurance/companies/${insCompany}/networks`);
        setInsCategories(Array.isArray(nets) ? nets : []);
      } catch { setInsCategories([]); }
    })();
  }, [insCompany]);
  const { isGuest, requireAuth } = useGuestGuard();
  const [coverage, setCoverage] = useState<any>(null);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    if (!params.doctorId) return;
    apiFetch<any>(`/care/doctors/${params.doctorId}`)
      .then(res => {
        if (res) {
          setDoctor({
            name: pickLocalized(res.name_ar, res.name_en) || res.display_name || '',
            degree: res.degree || res.title || '',
            spec: pickLocalized(res.specialty_ar, res.specialty) || '',
            // Real per-mode prices from the provider profile — no invented fallback
            price_clinic: typeof res.price_clinic === 'number' ? res.price_clinic : null,
            price_online: typeof res.price_online === 'number' ? res.price_online : null,
            price_home: typeof res.price_home === 'number' ? res.price_home : null,
          });
        }
      })
      .catch(() => null);
  }, [params.doctorId]);

  const [userProfile, setUserProfile] = useState<{ isLoggedIn: boolean; insuranceId?: string; categoryKey?: string; policyNumber?: string }>({ isLoggedIn: !isGuest });

  useEffect(() => {
    if (!isGuest) {
      apiFetch<any>('/users/me/profile')
        .then(res => {
          if (res) {
             const ins = res.insurance || {};
             setUserProfile({
               isLoggedIn: true,
               insuranceId: ins.provider_id || '',
               categoryKey: ins.category || '',
               policyNumber: ins.policy_number || '',
             });
          }
        })
        .catch(() => {});
    }
  }, [isGuest]);
  useEffect(() => {
    if (payMethod === 'insurance') {
      const checkCoverage = async () => {
        setLoadingCoverage(true);
        try {
          let token = null;
          try {
            token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
          } catch {
            token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          }
          if (!token) return;
          const baseUrl = API_BASE_URL.replace('https://api.nabdahplus.com/v1', `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8002'}/api/v1`);
          const res = await fetch(`${baseUrl}/insurance/coverage-check?provider_id=${params.doctorId}&service_type=consultation`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          });
          if (res.ok) {
            const data = await res.json();
            setCoverage(data);
          }
        } catch (err) {
          console.log('Error checking coverage', err);
        } finally {
          setLoadingCoverage(false);
        }
      };
      checkCoverage();
    } else {
      setCoverage(null);
    }
  }, [payMethod, params.doctorId]);

  // Real per-mode price only — no invented surcharges
  const modePrice = visitType === 'home' ? doctor?.price_home : visitType === 'video' ? doctor?.price_online : doctor?.price_clinic;
  const basePrice = typeof modePrice === 'number' ? modePrice : 0;
  const homeVisitFee = 0;
  const subtotal = basePrice + homeVisitFee;
  const vat = Math.round(subtotal * 0.15);
  const totalWithoutInsurance = subtotal + vat;

  // Compute final patient totals after insurance
  let insuranceCoveredAmount = 0;
  let total = totalWithoutInsurance;
  if (payMethod === 'insurance' && coverage && coverage.covered) {
    const copayPct = coverage.copay_percent ?? 0;
    const copayFlat = coverage.copay_flat ?? 0;
    const patientCopay = Math.round(totalWithoutInsurance * (copayPct / 100)) + copayFlat;
    total = Math.min(totalWithoutInsurance, patientCopay);
    insuranceCoveredAmount = totalWithoutInsurance - total;
  }

  const handleConfirm = async () => {
    // Guests CAN book — only paying via INSURANCE requires a registered account.
    if (isGuest && payMethod === 'insurance') {
      requireAuth('insurance');
      return;
    }
    setLoading(true);
    try {
      // 1. Prefer the exact slot picked on the booking screen (full ISO).
      //    Legacy callers pass date/time — interpret them in LOCAL time (not UTC).
      let slotStartIso: string;
      if (params.slot_start) {
        slotStartIso = new Date(params.slot_start as string).toISOString();
      } else if (params.date && params.time) {
        const t = String(params.time);
        slotStartIso = new Date(`${params.date}T${t.length === 5 ? t : '09:00'}:00`).toISOString();
      } else {
        throw new Error('لم يتم اختيار موعد. ارجع واختر وقتاً متاحاً.');
      }

      // 2. Call backend /care/appointments
      const appt = await apiFetch<any>('/care/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: params.doctorId,
          service_type: visitType,
          slot_start: slotStartIso,
          payment_method: payMethod === 'card' ? 'card' : payMethod === 'insurance' ? 'insurance' : 'cash',
          insurance_provider: payMethod === 'insurance' ? (insCompany || userProfile.insuranceId) : undefined,
          insurance_member_id: payMethod === 'insurance' ? userProfile.policyNumber : undefined,
          patient_notes: (params.notes as string) || undefined,
          visit_location: visitType === 'home' && params.visit_lat && params.visit_lng
            ? { lat: Number(params.visit_lat), lng: Number(params.visit_lng), address: (params.visit_address as string) || '' }
            : undefined,
        }),
      });

      if (!appt || !appt.id) {
        throw new Error('فشل إنشاء موعد الاستشارة');
      }

      if (payMethod === 'card') {
        // 3. Create payment intent for Card payment
        const txn = await apiFetch<any>(`/payments/intent/consultation/${appt.id}`, {
          method: 'POST',
          headers: paymentIntentHeaders('consultation', appt.id),
        });

        if (!txn || !txn.id) {
          throw new Error('فشل إنشاء عملية الدفع');
        }

        setLoading(false);
        router.replace({
          pathname: '/payments/processing',
          params: {
            moyasarId: txn.id,
            paymentUrl: txn.checkout_url || '',
            bookingId: appt.id,
            bookingKind: 'consultation',
            amount: String(txn.amount),
          },
        });
      } else if (payMethod === 'insurance') {
        // Insurance never auto-confirms: create the owned request from the server-created appointment.
        const insuranceRequest = await apiFetch<any>('/insurance/requests', {
          method: 'POST',
          body: JSON.stringify({ booking_id: appt.id, booking_kind: 'consultation' }),
        });
        if (!insuranceRequest?.id) throw new Error('تعذر إنشاء طلب مراجعة التأمين');
        setLoading(false);
        router.replace({ pathname: '/insurance/payment-split', params: { request_id: insuranceRequest.id } });
      } else {
        // Cash remains subject to the appointment server state and is not an insurance approval.
        setLoading(false);
        const apptDate = new Date(slotStartIso);
        const now = new Date();
        const isToday = apptDate.toDateString() === now.toDateString();
        router.replace({
          pathname: '/consultations/booking-success',
          params: {
            visitType,
            appointmentId: appt.id,
            isToday: isToday ? 'true' : 'false',
          },
        });
      }
    } catch (err: any) {
      setLoading(false);
      showLocalizedAlert('خطأ', err?.message || 'تعذر تأكيد الحجز. الرجاء المحاولة مرة أخرى.');
    }
  };


  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">تأكيد الحجز</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* Doctor summary */}
        <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
          <View style={[st.ava, { backgroundColor: colors.primarySurface } ]}>
            <Icon name="doctor" size={32} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
            <AppText variant="h5">{doctor?.name}</AppText>
            <AppText variant="bodyXS" color={colors.textSecondary}>{doctor?.degree} · {doctor?.spec}</AppText>
          </View>
        </Card>

        {/* Visit type selection */}
        <Card>
          <SectionHeader title="نوع الزيارة" />
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            {VISIT_TYPES.map(vt => (
              <TouchableOpacity key={vt.key} onPress={() => setVisitType(vt.key)} style={[st.visitCard, { borderColor: visitType === vt.key ? colors.primary : colors.border, backgroundColor: visitType === vt.key ? colors.primarySurface : 'transparent' } ]}>
                <Icon name={vt.icon} size={22} color={visitType === vt.key ? colors.primary : colors.textTertiary} />
                <AppText variant="labelSM" color={visitType === vt.key ? colors.primary : colors.textSecondary} align="center">{vt.label}</AppText>
                <AppText variant="caption" color={colors.textTertiary} align="center">{vt.desc}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Appointment details */}
        <Card>
          <SectionHeader title="تفاصيل الموعد" />
          {(() => {
            const slotIso = (params.slot_start as string) || (params.date && params.time ? `${params.date}T${String(params.time).length === 5 ? params.time : '09:00'}:00` : null);
            const d = slotIso ? new Date(slotIso) : null;
            return [
              { icon: 'calendar' as IconName, label: 'التاريخ', value: d ? d.toLocaleDateString(dateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد' },
              { icon: 'clock' as IconName, label: 'الوقت', value: d ? d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) : 'غير محدد' },
              { icon: 'clock' as IconName, label: 'المدة', value: '30 دقيقة' },
            ];
          })().map((item, i) => (
            <View key={i} style={[st.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <AppText variant="labelMD" color={colors.textPrimary}>{item.value}</AppText>
              <View style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
                <Icon name={item.icon} size={16} color={colors.textTertiary} />
                <AppText variant="bodySM" color={colors.textTertiary}>{item.label}</AppText>
              </View>
            </View>
          ))}
        </Card>

        {/* Payment method — mirrors backend policy:
            video → card only · home → card/insurance · clinic → cash/card/insurance */}
        <Card>
          <SectionHeader title="طريقة الدفع" />
          <SegmentedControl value={payMethod} onChange={(v) => { setPayMethod(v); setShowInsurance(v === 'insurance'); }} options={
            visitType === 'video'
              ? [{ key: 'card', label: 'بطاقة', icon: 'card' }]
              : visitType === 'home'
                ? [
                    { key: 'card', label: 'بطاقة', icon: 'card' },
                    { key: 'insurance', label: 'تأمين', icon: 'shield' },
                  ]
                : [
                    { key: 'card', label: 'بطاقة', icon: 'card' },
                    { key: 'cash', label: 'كاش', icon: 'wallet' },
                    { key: 'insurance', label: 'تأمين', icon: 'shield' },
                  ]
          } />
        </Card>

        {/* Insurance details — visible only when insurance selected */}
        {showInsurance && (
          <Card>
            <SectionHeader title="بيانات التأمين" />
            {!isGuest && userProfile.insuranceId ? (
              <View style={{ gap: 10 }}>
                <Card style={{ backgroundColor: colors.successSurface }}>
                  <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
                    <Icon name="check_circle" size={20} color={colors.success} />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <AppText variant="h6" color={colors.success}>تأمين مسجّل في ملفك</AppText>
                      <AppText variant="bodySM" color={colors.textSecondary}>{insCompanies.find(c => c.id === userProfile.insuranceId || c.code === userProfile.insuranceId)?.name_ar || 'تأمين مسجّل'}{userProfile.categoryKey ? ` — فئة ${insCategories.find(c => c.key === userProfile.categoryKey || c.code === userProfile.categoryKey)?.name_ar || userProfile.categoryKey}` : ''}</AppText>
                      <AppText variant="caption" color={colors.textTertiary}>وثيقة: {userProfile.policyNumber}</AppText>
                    </View>
                  </View>
                </Card>
                <Button label="تعديل بيانات التأمين" variant="ghost" icon="edit" onPress={() => router.push('/profile/insurance')} />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <AppText variant="bodySM" color={colors.textTertiary}>اختر شركة التأمين والفئة. سيتم التحقق عبر NPHIES</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {insCompanies.map(company => (
                    <TouchableOpacity key={company.id || company.code} onPress={() => { setInsCompany(company.id || company.code); setInsCategory(''); }} style={[st.insChip, { borderColor: insCompany === (company.id || company.code) ? colors.primary : colors.border, backgroundColor: insCompany === (company.id || company.code) ? colors.primarySurface : 'transparent' } ]}>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                        {(company.logo_url || company.logo) ? <Image source={{ uri: company.logo_url || company.logo }} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="contain" accessibilityLabel={`شعار ${company.name_ar || company.name}`} /> : null}
                        <AppText variant="labelSM" color={insCompany === (company.id || company.code) ? colors.primary : colors.textSecondary} numberOfLines={1}>{company.name_ar || company.name}</AppText>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {insuranceCatalogUnavailable && <AppText variant="caption" color={colors.textTertiary}>كتالوج شركات التأمين غير متاح حالياً. يرجى إعادة المحاولة لاحقاً.</AppText>}
                </ScrollView>
                {insCompany !== '' && (
                  <View style={{ gap: 6 }}>
                    <AppText variant="labelMD" color={colors.textPrimary}>اختر الفئة:</AppText>
                    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
                      {insCategories.map(cat => (
                        <TouchableOpacity key={cat.key || cat.code} onPress={() => setInsCategory(cat.key || cat.code)} style={[st.catChip, { borderColor: insCategory === (cat.key || cat.code) ? colors.primary : colors.border, backgroundColor: insCategory === (cat.key || cat.code) ? colors.primarySurface : 'transparent' } ]}>
                          <AppText variant="labelSM" color={insCategory === (cat.key || cat.code) ? colors.primary : colors.textSecondary}>{cat.label || cat.name_ar}</AppText>
                          {cat.copayPercent != null && <AppText variant="caption" color={colors.textTertiary}>تحمل {cat.copayPercent}%</AppText>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
            <Card style={{ backgroundColor: colors.infoSurface, marginTop: 10 }}>
              <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="info" size={16} color={colors.info} />
                <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>متوافق مع منصة نفيس (NPHIES) للتحقق الفوري من التغطية التأمينية</AppText>
              </View>
            </Card>
          </Card>
        )}

        {/* Price summary */}
        <Card>
          <SectionHeader title="ملخص التكلفة" />
          <View style={st.priceRow}>
            <AppText variant="h5">{basePrice} ر.س</AppText>
            <AppText variant="bodySM" color={colors.textSecondary}>سعر الكشف</AppText>
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
          {insuranceCoveredAmount > 0 && (
            <View style={st.priceRow}>
              <AppText variant="bodySM" color={colors.success}>-{insuranceCoveredAmount} ر.س</AppText>
              <AppText variant="bodySM" color={colors.success}>مغطى بالتأمين</AppText>
            </View>
          )}
          <View style={[st.priceRow, { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10, marginTop: 4 } ]}>
            <AppText variant="h4" color={colors.primary}>{total} ر.س</AppText>
            <AppText variant="bodySM" color={colors.textSecondary}>الإجمالي المستحق</AppText>
          </View>
          {payMethod === 'insurance' && coverage && (
            <AppText variant="caption" color={coverage.covered ? colors.success : colors.error} style={{ marginTop: 6 }}>
              {coverage.covered
                ? `* تم تطبيق التغطية بنجاح (تحمل المريض ${coverage.copay_percent}%${coverage.copay_flat > 0 ? ` + ${coverage.copay_flat} ر.س` : ''})`
                : `* غير مغطى بالتأمين: ${coverage.reason || 'المنشأة غير متعاقدة مع شبكتك'}`}
            </AppText>
          )}
        </Card>

        {/* Visit type notices */}
        {visitType === 'clinic' && (
          <Card style={{ backgroundColor: colors.warningSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
              <Icon name="info" size={16} color={colors.warning} />
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>بعد التأكيد سيتم عرض موقع العيادة والاتجاهات. يرجى الحضور قبل الموعد بـ 15 دقيقة.</AppText>
            </View>
          </Card>
        )}
        {visitType === 'home' && (
          <Card style={{ backgroundColor: colors.infoSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' }}>
              <Icon name="navigate" size={16} color={colors.info} />
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>بعد التأكيد ستتمكن من تتبع الطبيب مباشرة على الخريطة حتى وصوله إليك.</AppText>
            </View>
          </Card>
        )}
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button
          label={payMethod === 'insurance' ? 'التحقق من التأمين وتأكيد الحجز' : `تأكيد الحجز ودفع ${total} ر.س`}
          variant="gradient" size="lg"
          icon={payMethod === 'insurance' ? 'shield' : 'check-circle'}
          loading={loading || loadingCoverage}
          disabled={payMethod === 'insurance' && isGuest && !insCompany}
          onPress={handleConfirm}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  ava: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  visitCard: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  insOption: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', padding: 12, borderWidth: 1.5, borderRadius: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  insChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  catChip: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', gap: 2 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
