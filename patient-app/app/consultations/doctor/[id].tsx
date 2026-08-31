// @ts-nocheck
import React, { useState } from 'react';
import { View, Share, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal } from 'react-native';

import { useApp } from '../../../src/context/AppContext';
import { router, useLocalSearchParams } from 'expo-router';
import { lightColors, darkColors, resolveColor as rsColor } from '../../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../../src/utils/api';
import { pickLocalized } from '../../../src/utils/localize';
import { dateLocale } from '@/utils/dates';
import { LocalizedText } from '../../../src/components/LocalizedText';

const { width } = Dimensions.get('window');


export default function DoctorProfile() {
  const { isDark, lang } = useApp() as any;
  const { id, visit_type } = useLocalSearchParams<{ id: string, visit_type?: string }>();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const go = (screen: string, title?: string, params?: any) => {
    if (screen === 's12') {
      (router.push as any)({
        pathname: `/consultations/book/[id]`,
        params: { id: params?.id || id, visit_type: activeVt }
      });
    } else if (screen === 's8') {
      router.back();
    }
  };

  function resolveColor(c: any) {
    if (!c) return '#000';
    if (c.startsWith('var(')) {
      const v = c.replace('var(--', '').replace(')', '');
      return colors[v] || c;
    }
    return c;
  }

  // Removed fallbackDoc
  const [doc, setDoc] = useState<any>({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchDocDetails = async () => {
      try {
        const data = await apiFetch(`/care/doctors/${encodeURIComponent(id || 'd1')}`);
        if (data && Object.keys(data).length > 0) {
          setDoc(prev => ({ ...prev, ...data }));
          // Auto-switch visit type if the doctor doesn't support the current one
          const modes = Array.isArray(data.consultation_modes) ? data.consultation_modes : [];
          if (modes.length > 0) {
            const current = (visit_type || 'clinic') === 'online' ? 'video' : (visit_type || 'clinic');
            setActiveVt(modes.includes(current) ? current : modes[0]);
          }
        }
      } catch (err) {
        console.log('Error fetching doctor details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocDetails();
  }, [id]);
  
  const { daysArr, dnumsArr, dmonArr } = React.useMemo(() => {
    const d = [];
    const dn = [];
    const dm = [];
    const today = new Date();
    
    const arDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const isAr = lang === 'ar';
    
    // Arabic Numbers converter
    const toArNum = (n: number) => n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      let dayName = '';
      if (i === 0) dayName = isAr ? 'اليوم' : 'Today';
      else if (i === 1) dayName = isAr ? 'غداً' : 'Tomorrow';
      else dayName = isAr ? arDays[date.getDay()] : enDays[date.getDay()];
      
      d.push(dayName);
      dn.push(isAr ? toArNum(date.getDate()) : date.getDate().toString());
      dm.push(isAr ? arMonths[date.getMonth()] : enMonths[date.getMonth()]);
    }
    
    return { daysArr: d, dnumsArr: dn, dmonArr: dm };
  }, [lang]);

  const [activeVt, setActiveVt] = useState(visit_type || 'clinic');
  const [day, setDay] = useState(0);
  const [faqExpanded, setFaqExpanded] = useState({});
  const [isFav, setIsFav] = useState(false);
  const [isImgModalVisible, setIsImgModalVisible] = useState(false);

    const handleShare = async () => {
    try {
      if (!doc?.id) return;
      const docName = pickLocalized(doc?.name_ar, doc?.name_en) || '';
      const url = `https://app.nabdahplus.com/s/doctor/${doc.slug || doc.id}`;
      await Share.share({
        message: lang === 'ar' ? `احجز موعد مع ${docName} عبر نبض بلس! الرابط: ${url}` : `Book an appointment with ${docName} via Nabd Plus! Link: ${url}`,
        url: url,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const toggleFaq = (i) => setFaqExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  // Real per-mode prices from the provider profile — no invented multipliers
  const getPrice = (type) => {
    const vt = type === 'online' ? 'video' : type;
    const p = vt === 'clinic' ? doc?.price_clinic : vt === 'video' ? doc?.price_online : doc?.price_home;
    return typeof p === 'number' && p > 0 ? p : null;
  };

  // ── Real availability: fetch slots for the selected day + visit type ──
  const [daySlots, setDaySlots] = useState([]);
  const [slotsReason, setSlotsReason] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  React.useEffect(() => {
    if (!doc?.id) return;
    let active = true;
    (async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const d = new Date();
        d.setDate(d.getDate() + day);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const vt = activeVt === 'online' ? 'video' : activeVt;
        const res = await apiFetch(`/care/doctors/${encodeURIComponent(doc.id)}/slots?date=${iso}&service_type=${vt}`);
        if (!active) return;
        setDaySlots(Array.isArray(res?.slots) ? res.slots : []);
        setSlotsReason(res?.reason || null);
      } catch {
        if (!active) return;
        setDaySlots([]);
        setSlotsReason('error');
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();
    return () => { active = false; };
  }, [doc?.id, day, activeVt]);


  const docGradientColors = doc?.cg || ['var(--ps)', '#C8EEF4'];

  // Real platform policies (aligned with the backend cancellation policy)
  const faqs = [
    { q: 'هل يمكن إلغاء أو تعديل الموعد؟', a: 'نعم. الإلغاء قبل الموعد بأكثر من 24 ساعة يسترد كامل المبلغ، وقبل 12 ساعة يسترد 50%، وبعدها لا يُسترد المبلغ. يمكنك التعديل من صفحة تفاصيل الموعد.' },
    { q: 'ما طرق الدفع المتاحة؟', a: 'الاستشارة عن بعد بالبطاقة فقط، والزيارة المنزلية بالبطاقة أو التأمين، والكشف في العيادة بالبطاقة أو التأمين أو الكاش.' }
  ];

  if (!loading && (!doc || Object.keys(doc).length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 } ]}>
        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 64, color: colors.t3, marginBottom: 10 }}>person_off</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.n, textAlign: 'center' }}>الطبيب غير متاح حالياً أو غير موجود</LocalizedText>
        <TouchableOpacity style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: resolveColor('var(--p)'), borderRadius: 12 }} onPress={() => router.back()}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 16 }}>العودة للقائمة</LocalizedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' } ]}>
        <ActivityIndicator size="large" color={resolveColor('var(--p)')} />
      </View>
    );
  }

  if (!doc || Object.keys(doc).length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' } ]}>
        <LocalizedText style={{ fontSize: 18, fontWeight: '700', color: colors.t2 }}>
          {isRTL ? 'الطبيب غير موجود' : 'Doctor Not Found'}
        </LocalizedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* HERO SECTION with exact design cuts */}
        <View style={{ width: '100%', height: 320 + Math.max(insets.top, 20), position: 'relative' }}>
          
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: resolveColor(docGradientColors[0]), borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' }}>
            <View 
               
              style={StyleSheet.absoluteFill}
               
            />
            {/* Hero Content Side-by-Side */}
            <View style={{ position: 'absolute', top: Math.max(insets.top, 20) + 40, left: 20, right: 20, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
              {doc?.img || doc?.photo_url ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setIsImgModalVisible(true)}>
                  <Image
                    source={{ uri: doc?.img || doc?.photo_url }} resizeMode="cover"
                    style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)' }}
                  />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--pd)'), fontSize: 52 }}>stethoscope</LocalizedText>
                </View>
              )}

              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', marginHorizontal: 16 }}>
              <LocalizedText style={{ fontSize: 26, fontWeight: '900', color: resolveColor('var(--n)'), marginBottom: 5, textAlign: isRTL ? 'right' : 'left', lineHeight: 28 }}>{pickLocalized(doc?.name_ar, doc?.name_en) || doc?.n || ''}</LocalizedText>
              <LocalizedText style={{ fontSize: 13, color: resolveColor('var(--t2)'), fontWeight: '600', marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>{[doc?.title, doc?.specialty || doc?.sp].filter(Boolean).join(' — ')}</LocalizedText>

              {/* Clickable Clinic/Hospital Link — real facility only */}
              {(pickLocalized(doc?.facility?.name_ar, doc?.hospital)) ? (
              <TouchableOpacity onPress={() => doc?.facility_id && router.push(`/consultations/clinic/${doc.facility_id}`)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--pd)'), fontSize: 16, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>local_hospital</LocalizedText>
                <LocalizedText style={{ fontSize: 12.5, color: resolveColor('var(--n)'), fontWeight: '800', textDecorationLine: 'underline' }}>{pickLocalized(doc?.facility?.name_ar, doc?.hospital)}</LocalizedText>
              </TouchableOpacity>
              ) : null}

              {(doc?.city || doc?.district || doc?.address) ? (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: 14, width: '90%' }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--pd)'), fontSize: 14, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>location_on</LocalizedText>
                <LocalizedText style={{ fontSize: 11.5, color: resolveColor('var(--t2)'), lineHeight: 14, textAlign: isRTL ? 'right' : 'left', fontWeight: '500' }}>
                  {[doc?.district, doc?.city].filter(Boolean).join('، ')}
                  {doc?.address ? <LocalizedText style={{ fontSize: 11.5, color: resolveColor('var(--t3)'), fontWeight: '500' }}>{'\n'}{doc.address}</LocalizedText> : null}
                </LocalizedText>
              </View>
              ) : null}

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', marginBottom: 12 }}>
                <LocalizedText style={{ fontSize: 36, fontWeight: '900', color: resolveColor('var(--n)'), letterSpacing: -2 }}>{getPrice(activeVt) ?? '—'}</LocalizedText>
                <LocalizedText style={{ fontSize: 12, color: resolveColor('var(--t2)'), marginRight: isRTL ? 2 : 0, marginLeft: isRTL ? 0 : 2 }}>{lang === 'ar' ? 'ر.س' : 'SAR'}</LocalizedText>
              </View>

              {(doc?.rating_avg > 0 || doc?.rating_count > 0) && (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--am)'), fontSize: 14, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>star</LocalizedText>
                <LocalizedText style={{ fontSize: 12, fontWeight: '800', color: resolveColor('var(--n)') }}>{doc?.rating_avg}</LocalizedText>
                <LocalizedText style={{ fontSize: 9, color: resolveColor('var(--t3)'), marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>({doc?.rating_count})</LocalizedText>
              </View>
              )}
            </View>
          </View>
          </View>

          {/* Aesthetic Cuts - Top Left/Right and Bottom Right/Left using absolute views */}
          {/* Top Left cut */}
          {/* Top Left cut */}
          <View style={{ position: 'absolute', top: 0, left: isRTL ? undefined : 0, right: isRTL ? 0 : undefined, width: 72, height: 72 + Math.max(insets.top, 20), backgroundColor: colors.bg, borderBottomRightRadius: isRTL ? 0 : 28, borderBottomLeftRadius: isRTL ? 28 : 0, zIndex: 10, flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 4 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: resolveColor('var(--n)'), alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0,height:3}, shadowOpacity: 0.15, shadowRadius: 10 }}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 18 }}>{isRTL ? 'arrow_forward' : 'arrow_back'}</LocalizedText>
            </TouchableOpacity>
          </View>
          {/* Smooth curves for Top Cut using Borders */}
          <View style={{ position: 'absolute', top: Math.max(insets.top, 20), left: isRTL ? undefined : 72, right: isRTL ? 72 : undefined, width: 24, height: 24, overflow: 'hidden', zIndex: 10 }}>
             <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 24, borderColor: colors.bg, position: 'absolute', bottom: 0, left: isRTL ? 0 : undefined, right: isRTL ? undefined : 0 }}/>
          </View>
          <View style={{ position: 'absolute', top: 72 + Math.max(insets.top, 20), left: isRTL ? undefined : 0, right: isRTL ? 0 : undefined, width: 24, height: 24, overflow: 'hidden', zIndex: 10 }}>
             <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 24, borderColor: colors.bg, position: 'absolute', top: 0, left: isRTL ? undefined : 0, right: isRTL ? 0 : undefined }}/>
          </View>

          {/* Bottom Right/Left cut for Actions */}
          <View style={{ position: 'absolute', bottom: 0, left: isRTL ? 0 : undefined, right: isRTL ? undefined : 0, width: 106, height: 68, backgroundColor: colors.bg, borderTopRightRadius: isRTL ? 28 : 0, borderTopLeftRadius: isRTL ? 0 : 28, zIndex: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: isRTL ? 'flex-start' : 'flex-end', padding: 8, gap: 6 }}>
            <TouchableOpacity onPress={() => setIsFav(!isFav)} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.bd, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: isFav ? resolveColor('var(--cr)') : colors.t3, fontSize: 16 }}>{isFav ? 'favorite' : 'favorite_border'}</LocalizedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.bd, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 16 }}>share</LocalizedText>
            </TouchableOpacity>
          </View>
          {/* Smooth curves for Bottom Right cut */}
          <View style={{ position: 'absolute', bottom: 68, right: 0, width: 22, height: 22, backgroundColor: undefined, overflow: 'hidden', zIndex: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: undefined, position: 'absolute', bottom: 0, right: 0, shadowColor: colors.bg, shadowOffset: {width:22,height:22}, shadowOpacity: 1, shadowRadius: 0, elevation: 0 }}/>
          </View>
          <View style={{ position: 'absolute', bottom: 0, right: 106, width: 22, height: 22, backgroundColor: undefined, overflow: 'hidden', zIndex: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: undefined, position: 'absolute', bottom: 0, right: 0, shadowColor: colors.bg, shadowOffset: {width:22,height:22}, shadowOpacity: 1, shadowRadius: 0, elevation: 0 }}/>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>

          {/* Visit Types — only the modes this doctor actually supports */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 14 }}>
            {[
              { id: 'clinic', n: 'عيادة', ic: 'meeting_room', p: getPrice('clinic'), c: 'var(--n)', bg: 'var(--n)', tc: '#fff' },
              { id: 'video', n: 'أونلاين', ic: 'videocam', p: getPrice('video'), c: 'var(--p)', bg: 'var(--s)', tc: 'var(--t)' },
              { id: 'home', n: 'منزلي', ic: 'home', p: getPrice('home'), c: 'var(--p)', bg: 'var(--s)', tc: 'var(--t)' }
            ].filter(vt => !Array.isArray(doc?.consultation_modes) || doc.consultation_modes.length === 0 || doc.consultation_modes.includes(vt.id))
            .map(vt => {
              const isActive = activeVt === vt.id;
              return (
                <TouchableOpacity key={vt.id} onPress={() => setActiveVt(vt.id)} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, backgroundColor: isActive ? resolveColor('var(--n)') : colors.s, borderWidth: isActive ? 0 : 1.5, borderColor: colors.bd, shadowColor: isActive ? '#141A2A' : undefined, shadowOffset: {width:0,height:6}, shadowOpacity: 0.2, shadowRadius: 20 }}>
                  <View style={{ width: 28, height: 28, backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : resolveColor('var(--p)')+'18', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
                    <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: isActive ? '#fff' : resolveColor('var(--p)'), fontSize: 18 }}>{vt.ic}</LocalizedText>
                  </View>
                  <LocalizedText style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#fff' : colors.t }}>{vt.n}</LocalizedText>
                  <LocalizedText style={{ fontSize: 17, fontWeight: '900', color: isActive ? '#fff' : colors.n }}>{vt.p ?? '—'}</LocalizedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Book Appointment Section */}
          <View style={styles.section}>
            <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              احجز موعدك
            </LocalizedText>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 16, transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
              {daysArr.map((d, i) => {
                const isActive = day === i;
                return (
                  <TouchableOpacity key={i} onPress={() => setDay(i)} style={[styles.dayCard, { backgroundColor: isActive ? colors.n : colors.s, borderColor: isActive ? undefined : colors.bd, marginRight: 7, transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
                    <LocalizedText style={{ fontSize: 9.5, color: isActive ? 'rgba(255,255,255,0.5)' : colors.t3, marginBottom: 3 }}>{d}</LocalizedText>
                    <View style={[styles.dayNumWrap, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? undefined : colors.bd } ]}>
                      <LocalizedText style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#fff' : colors.n }}>{dnumsArr[i]}</LocalizedText>
                    </View>
                    <LocalizedText style={{ fontSize: 8, color: isActive ? 'rgba(255,255,255,0.4)' : colors.t3, marginTop: 2 }}>{dmonArr[i]}</LocalizedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Real availability from the backend slot engine */}
            <View style={{ marginTop: 12 }}>
              {loadingSlots ? (
                <ActivityIndicator color={resolveColor('var(--p)')} style={{ marginVertical: 14 }} />
              ) : daySlots.length === 0 ? (
                <LocalizedText style={{ fontSize: 12, color: colors.t3, textAlign: 'center', paddingVertical: 14 }}>
                  {slotsReason === 'closed'
                    ? (lang === 'ar' ? 'الطبيب غير متاح في هذا اليوم' : 'Doctor is unavailable on this day')
                    : slotsReason === 'service_not_supported'
                      ? (lang === 'ar' ? 'هذا النوع من الزيارة غير مدعوم' : 'This visit type is not supported')
                      : slotsReason === 'error'
                        ? (lang === 'ar' ? 'تعذر تحميل المواعيد. تحقق من اتصالك.' : 'Could not load availability.')
                        : (lang === 'ar' ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No available slots on this day')}
                </LocalizedText>
              ) : (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
                  {daySlots.map((s, i) => {
                    const isActive = selectedSlot === s.start;
                    return (
                      <TouchableOpacity key={s.start} disabled={!s.available} onPress={() => setSelectedSlot(s.start)} style={[styles.timeBtn, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? undefined : colors.bd, marginRight: 6, marginBottom: 6, opacity: s.available ? 1 : 0.35 } ]}>
                        <LocalizedText style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : colors.t2 }}>
                          {new Date(s.start).toLocaleTimeString(lang === 'ar' ? dateLocale() : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </LocalizedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* About Doctor — real bio only */}
          {(doc.bio || doc.biography) ? (
          <View style={styles.section}>
            <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>عن الطبيب</LocalizedText>
            <LocalizedText style={{ fontSize: 12, color: colors.t2, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
              {doc.bio || doc.biography}
            </LocalizedText>
            {Array.isArray(doc.sub_specialties) && doc.sub_specialties.length > 0 && (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
              {doc.sub_specialties.map((t, i) => (
                <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: resolveColor(['var(--ps)', 'var(--ts)', 'var(--cs)'][i%3]) }}>
                  <LocalizedText style={{ fontSize: 10, color: resolveColor(['var(--pt)', 'var(--tl)', 'var(--cr)'][i%3]), fontWeight: '700' }}>{t}</LocalizedText>
                </View>
              ))}
            </View>
            )}
          </View>
          ) : null}

          {/* Stats Section — real numbers only, hidden when absent */}
          {(doc.years_experience > 0 || doc.rating_avg > 0 || doc.rating_count > 0) && (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 7, marginTop: 14 }}>
            {doc.years_experience > 0 && (
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: resolveColor('var(--ps)'), borderRadius: 16 }}>
              <LocalizedText style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--p)') }}>{doc.years_experience}+</LocalizedText>
              <LocalizedText style={{ fontSize: 8, color: resolveColor('var(--pt)') }}>سنة خبرة</LocalizedText>
            </View>
            )}
            {doc.rating_count > 0 && (
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: resolveColor('var(--ts)'), borderRadius: 16 }}>
              <LocalizedText style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--tl)') }}>{doc.rating_count}</LocalizedText>
              <LocalizedText style={{ fontSize: 8, color: '#1A8A74' }}>تقييم</LocalizedText>
            </View>
            )}
            {doc.rating_avg > 0 && (
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: resolveColor('var(--as)'), borderRadius: 16 }}>
              <LocalizedText style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--am)') }}>{doc.rating_avg}</LocalizedText>
              <LocalizedText style={{ fontSize: 8, color: '#B07D1E' }}>متوسط التقييم</LocalizedText>
            </View>
            )}
          </View>
          )}

          {/* Clinic Photos — shown only when the provider published real photos */}
          {Array.isArray(doc?.clinic_images) && doc.clinic_images.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n }}>{lang === 'ar' ? 'صور العيادة وغرفة الكشف' : 'Clinic & Examination Room'}</LocalizedText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {doc.clinic_images.map((uri: string, i: number) => (
                <View key={i} style={{ width: 180, height: 120, borderRadius: 14, overflow: 'hidden' }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                </View>
              ))}
            </ScrollView>
          </View>
          )}

          {/* Hospital Photos — real facility photos only */}
          {Array.isArray(doc?.facility_images) && doc.facility_images.length > 0 && (
          <View style={[styles.section, { paddingTop: 0 } ]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n }}>{lang === 'ar' ? 'المستشفى والمرافق' : 'Hospital & Facilities'}</LocalizedText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {doc.facility_images.map((uri: string, i: number) => (
                <View key={i} style={{ width: 200, height: 140, borderRadius: 14, overflow: 'hidden' }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                </View>
              ))}
            </ScrollView>
          </View>
          )}

          {/* Extra Info — rows shown only when real data exists */}
          {(doc.education || (Array.isArray(doc.languages) && doc.languages.length > 0) || doc.license_number || doc.scfhs_license_number) && (
          <View style={styles.section}>
            <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>معلومات إضافية</LocalizedText>
            <View style={{ gap: 8 }}>
              {[
                doc.education ? { ic: 'school', c: 'var(--bl)', cs: 'var(--bs)', t: 'المؤهلات', d: Array.isArray(doc.education) ? doc.education.map(e => `${e.degree} — ${e.school}`).join('\n') : String(doc.education) } : null,
                (Array.isArray(doc.languages) && doc.languages.length > 0) ? { ic: 'language', c: 'var(--tl)', cs: 'var(--ts)', t: 'اللغات', d: doc.languages.map(l => l === 'ar' ? 'العربية' : l === 'en' ? 'الإنجليزية' : l).join('، ') } : null,
                doc.scfhs_license_number ? { ic: 'verified', c: 'var(--gr)', cs: 'var(--grs)', t: 'رقم ترخيص الهيئة السعودية للتخصصات الصحية', d: doc.scfhs_license_number } : null,
                doc.accepts_insurance ? { ic: 'health_and_safety', c: 'var(--am)', cs: 'var(--as)', t: 'التأمين', d: 'يقبل التأمين الطبي' } : null,
              ].filter(Boolean).map((x, i) => (
                <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.bg, borderRadius: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: resolveColor(x.cs), alignItems: 'center', justifyContent: 'center' }}>
                    <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor(x.c), fontSize: 20 }}>{x.ic}</LocalizedText>
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <LocalizedText style={{ fontSize: 11, fontWeight: '700', color: colors.n }}>{x.t}</LocalizedText>
                    <LocalizedText style={{ fontSize: 10, color: colors.t2 }}>{x.d}</LocalizedText>
                  </View>
                </View>
              ))}
            </View>
          </View>
          )}

          {/* Real patient reviews — from the Review collection, approved only */}
          {Array.isArray(doc.reviews_data) && doc.reviews_data.length > 0 && (
          <View style={styles.section}>
            <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>تقييمات المرضى</LocalizedText>
            <View style={{ gap: 8 }}>
              {doc.reviews_data.map((r, i) => (
                <View key={r.id || i} style={{ padding: 12, backgroundColor: colors.bg, borderRadius: 12 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <LocalizedText key={s} style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 13, color: s < (r.rating || 0) ? resolveColor('var(--am)') : colors.bd }}>star</LocalizedText>
                    ))}
                    {r.date ? <LocalizedText style={{ fontSize: 9, color: colors.t3, marginLeft: 6 }}>{new Date(r.date).toLocaleDateString(lang === 'ar' ? dateLocale() : 'en-US')}</LocalizedText> : null}
                  </View>
                  {r.text ? <LocalizedText style={{ fontSize: 11, color: colors.t2, lineHeight: 17, textAlign: isRTL ? 'right' : 'left' }}>{r.text}</LocalizedText> : null}
                </View>
              ))}
            </View>
          </View>
          )}

          {/* FAQs */}
          <View style={styles.section}>
            <LocalizedText style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>أسئلة شائعة</LocalizedText>
            <View style={{ gap: 8 }}>
              {faqs.map((f, i) => {
                const isOpen = faqExpanded[i];
                return (
                  <TouchableOpacity key={i} onPress={() => toggleFaq(i)} activeOpacity={0.8} style={{ padding: 12, backgroundColor: colors.bg, borderRadius: 12 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <LocalizedText style={{ fontSize: 11.5, fontWeight: '600', color: colors.n, textAlign: isRTL ? 'right' : 'left', flex: 1 }}>{f.q}</LocalizedText>
                      <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 18, transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>expand_more</LocalizedText>
                    </View>
                    {isOpen && (
                      <LocalizedText style={{ fontSize: 10.5, color: colors.t2, lineHeight: 18, marginTop: 8, textAlign: isRTL ? 'right' : 'left' }}>{f.a}</LocalizedText>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Floating CTA — direct to confirmation when a real slot is picked */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.bd }}>
        <TouchableOpacity
          onPress={() => {
            const price = getPrice(activeVt);
            if (selectedSlot) {
              (router.push as any)({
                pathname: '/consultations/booking-status',
                params: { doctorId: doc?.id, slot_start: selectedSlot, visitType: activeVt },
              });
            } else {
              go('s12');
            }
          }}
          style={{ width: '100%', padding: 16, borderRadius: 18, backgroundColor: resolveColor('var(--n)'), shadowColor: '#141A2A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 10, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{
            selectedSlot
              ? `تأكيد الحجز${getPrice(activeVt) != null ? ` — ${getPrice(activeVt)} ر.س` : ''}`
              : (lang === 'ar' ? 'احجز موعداً' : 'Book Appointment')
          }</LocalizedText>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 19 }}>{isRTL ? 'arrow_back' : 'arrow_forward'}</LocalizedText>
        </TouchableOpacity>
      </View>

      <Modal visible={isImgModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImgModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setIsImgModalVisible(false)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 100 }}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 32 }}>close</LocalizedText>
          </TouchableOpacity>
          <Image source={{ uri: doc.img || doc.photo_url }} style={{ width: '100%', height: 400 }} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { marginTop: 24 },
  dayCard: { width: 56, paddingVertical: 8, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  dayNumWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  timeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 }
});
