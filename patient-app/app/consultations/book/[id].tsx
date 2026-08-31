// @ts-nocheck
// app/consultations/book/[id].tsx — حجز موعد: اختيار نوع الزيارة واليوم والموعد من الخانات الحقيقية
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator,
  TextInput, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../src/context/AppContext';
import { Icon, IconName } from '../../../src/components/Icon';
import { AppText, Card, Button, IconButton, SectionHeader } from '../../../src/components/ui';
import { apiFetch } from '../../../src/utils/api';
import { resolveEffectiveAddress, formatAddressLine } from '../../../src/utils/selectedAddress';
import { pickLocalized } from '../../../src/utils/localize';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';

const VT_META: Record<string, { label: string; icon: IconName; desc: string }> = {
  clinic: { label: 'عيادة', icon: 'hospital', desc: 'كشف حضوري' },
  video: { label: 'فيديو', icon: 'video', desc: 'استشارة عن بعد' },
  home: { label: 'منزلي', icon: 'home', desc: 'زيارة منزلية' },
};

function priceFor(doc: any, vt: string): number | null {
  if (!doc) return null;
  const p = vt === 'clinic' ? doc.price_clinic : vt === 'video' ? doc.price_online : doc.price_home;
  return typeof p === 'number' && p > 0 ? p : null;
}

export default function BookAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { id, visit_type } = useLocalSearchParams<{ id: string; visit_type?: string }>();

  const [doctor, setDoctor] = useState<any>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [docError, setDocError] = useState(false);

  const [visitType, setVisitType] = useState<string>('clinic');
  const [dayOffset, setDayOffset] = useState(0);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [homeAddress, setHomeAddress] = useState<any>(null);

  // Next 7 days (real dates)
  const days = useMemo(() => {
    const arr: { label: string; dateNum: number; month: string; iso: string }[] = [];
    const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      arr.push({
        label: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : arDays[d.getDay()],
        dateNum: d.getDate(),
        month: arMonths[d.getMonth()],
        iso,
      });
    }
    return arr;
  }, []);

  // ── Load doctor ──────────────────────────────────────────────
  const loadDoctor = useCallback(async () => {
    setLoadingDoc(true);
    setDocError(false);
    try {
      const data = await apiFetch(`/care/doctors/${encodeURIComponent(String(id || ''))}`);
      if (data && data.id) {
        setDoctor(data);
        const modes: string[] = Array.isArray(data.consultation_modes) && data.consultation_modes.length > 0
          ? data.consultation_modes
          : ['clinic'];
        const preferred = visit_type && modes.includes(visit_type) ? visit_type : null;
        setVisitType(preferred || (modes.includes('clinic') ? 'clinic' : modes[0]));
      } else {
        setDoctor(null);
        setDocError(true);
      }
    } catch {
      setDoctor(null);
      setDocError(true);
    } finally {
      setLoadingDoc(false);
    }
  }, [id, visit_type]);

  useEffect(() => { loadDoctor(); }, [loadDoctor]);

  // ── Load real slots whenever day / visit type changes ────────
  useEffect(() => {
    if (!doctor?.id) return;
    let active = true;
    (async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setSlots([]);
      setSlotsReason(null);
      try {
        const res = await apiFetch(
          `/care/doctors/${encodeURIComponent(doctor.id)}/slots?date=${days[dayOffset].iso}&service_type=${visitType}`
        );
        if (!active) return;
        setSlots(Array.isArray(res?.slots) ? res.slots : []);
        setSlotsReason(res?.reason || null);
      } catch {
        if (!active) return;
        setSlots([]);
        setSlotsReason('error');
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();
    return () => { active = false; };
  }, [doctor?.id, dayOffset, visitType, days]);

  // ── Home visit needs an address ──────────────────────────────
  useEffect(() => {
    if (visitType !== 'home') return;
    (async () => {
      const addr = await resolveEffectiveAddress();
      setHomeAddress(addr);
    })();
  }, [visitType, dayOffset]);

  const modes: string[] = useMemo(() => {
    if (Array.isArray(doctor?.consultation_modes) && doctor.consultation_modes.length > 0) {
      return doctor.consultation_modes;
    }
    return ['clinic'];
  }, [doctor]);

  const price = priceFor(doctor, visitType);

  const slotEmptyText = useMemo(() => {
    switch (slotsReason) {
      case 'closed': return 'الطبيب غير متاح في هذا اليوم';
      case 'no_slots': return 'لا توجد مواعيد متاحة في هذا اليوم';
      case 'service_not_supported': return 'هذا النوع من الزيارة غير مدعوم لهذا الطبيب';
      case 'error': return 'تعذر تحميل المواعيد. تحقق من اتصالك.';
      default: return 'لا توجد مواعيد متاحة';
    }
  }, [slotsReason]);

  const canContinue = !!selectedSlot && !!doctor?.id && (visitType !== 'home' || !!homeAddress);

  const handleContinue = () => {
    if (!canContinue) return;
    if (visitType === 'home' && !homeAddress) {
      showLocalizedAlert('العنوان مطلوب', 'الزيارة المنزلية تتطلب اختيار عنوان أولاً.');
      return;
    }
    router.push({
      pathname: '/consultations/booking-status',
      params: {
        doctorId: doctor.id,
        slot_start: selectedSlot,
        visitType,
        notes: notes.trim(),
        ...(visitType === 'home' && homeAddress
          ? {
              visit_lat: String(homeAddress.lat ?? ''),
              visit_lng: String(homeAddress.lng ?? ''),
              visit_address: formatAddressLine(homeAddress),
            }
          : {}),
      },
    });
  };

  // ── Loading / error states ───────────────────────────────────
  if (loadingDoc) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (docError || !doctor) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 }]}>
        <Icon name="doctor" size={56} color={colors.textTertiary} />
        <AppText variant="h5" align="center">تعذر تحميل بيانات الطبيب</AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">تحقق من اتصالك بالإنترنت وحاول مرة أخرى</AppText>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={loadDoctor} />
          <Button label="عودة" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">حجز موعد</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }}>
        {/* Doctor summary */}
        <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
          <View style={[st.ava, { backgroundColor: colors.primarySurface }]}>
            <Icon name="doctor" size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
            <AppText variant="h5">{pickLocalized(doctor.name_ar, doctor.name_en) || ''}</AppText>
            <AppText variant="bodyXS" color={colors.textSecondary}>
              {[doctor.title, doctor.specialty].filter(Boolean).join(' · ')}
            </AppText>
            {doctor.rating_avg > 0 && (
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <Icon name="star" size={13} color={colors.gold} />
                <AppText variant="caption" color={colors.textSecondary}>
                  {doctor.rating_avg} ({doctor.rating_count} تقييم)
                </AppText>
              </View>
            )}
          </View>
        </Card>

        {/* Visit type — only modes the doctor actually supports */}
        <Card>
          <SectionHeader title="نوع الزيارة" />
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            {modes.map((m) => {
              const meta = VT_META[m] || { label: m, icon: 'hospital' as IconName, desc: '' };
              const p = priceFor(doctor, m);
              const active = visitType === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setVisitType(m)}
                  style={[st.visitCard, {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primarySurface : 'transparent',
                  }]}
                >
                  <Icon name={meta.icon} size={22} color={active ? colors.primary : colors.textTertiary} />
                  <AppText variant="labelSM" color={active ? colors.primary : colors.textSecondary} align="center">{meta.label}</AppText>
                  {p != null && (
                    <AppText variant="caption" color={active ? colors.primary : colors.textTertiary} align="center">{p} ر.س</AppText>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Day picker */}
        <Card>
          <SectionHeader title="اختر اليوم" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row-reverse' }}>
            {days.map((d, i) => {
              const active = dayOffset === i;
              return (
                <TouchableOpacity
                  key={d.iso}
                  onPress={() => setDayOffset(i)}
                  style={[st.dayCard, {
                    backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                >
                  <AppText variant="caption" color={active ? 'rgba(255,255,255,0.85)' : colors.textTertiary}>{d.label}</AppText>
                  <AppText variant="h4" color={active ? '#fff' : colors.textPrimary}>{d.dateNum}</AppText>
                  <AppText variant="caption" color={active ? 'rgba(255,255,255,0.85)' : colors.textTertiary}>{d.month}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>

        {/* Real slots */}
        <Card>
          <SectionHeader title="المواعيد المتاحة" />
          {loadingSlots ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} />
          ) : slots.length === 0 ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 18 }}>
              <Icon name="calendar" size={34} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textTertiary} align="center">{slotEmptyText}</AppText>
            </View>
          ) : (
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((s) => {
                const active = selectedSlot === s.start;
                const disabled = !s.available;
                return (
                  <TouchableOpacity
                    key={s.start}
                    disabled={disabled}
                    onPress={() => setSelectedSlot(s.start)}
                    style={[st.slotBtn, {
                      backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: disabled ? 0.35 : 1,
                    }]}
                  >
                    <AppText variant="labelSM" color={active ? '#fff' : colors.textPrimary}>
                      {new Date(s.start).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Home-visit address */}
        {visitType === 'home' && (
          <Card>
            <SectionHeader title="عنوان الزيارة" />
            {homeAddress ? (
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                <Icon name="location" size={20} color={colors.primary} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="labelMD">{homeAddress.label || 'العنوان المحدد'}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>{formatAddressLine(homeAddress)}</AppText>
                </View>
                <TouchableOpacity onPress={() => router.push('/delivery/address-select')}>
                  <AppText variant="labelSM" color={colors.primary}>تغيير</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <Button label="اختيار عنوان الزيارة" variant="outline" icon="location" onPress={() => router.push('/delivery/address-select')} />
            )}
          </Card>
        )}

        {/* Notes */}
        <Card>
          <SectionHeader title="ملاحظات للطبيب (اختياري)" />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="اكتب الأعراض أو أي معلومات تود إخبار الطبيب بها"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[st.notesInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
            textAlign="right"
          />
        </Card>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AppText variant="bodySM" color={colors.textTertiary}>سعر الكشف</AppText>
          <AppText variant="h4" color={colors.primary}>{price != null ? `${price} ر.س` : '—'}</AppText>
        </View>
        <Button
          label={selectedSlot ? 'متابعة لتأكيد الحجز' : 'اختر موعداً للمتابعة'}
          variant="primary"
          size="lg"
          icon="calendarCheck"
          onPress={handleContinue}
          disabled={!canContinue}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  ava: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  visitCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  dayCard: { alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  slotBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  notesInput: { minHeight: 80, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
