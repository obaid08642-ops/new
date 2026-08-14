// @ts-nocheck
import React, { useState } from 'react';
import { View, Share, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal } from 'react-native';

import { useApp } from '../../../src/context/AppContext';
import { router, useLocalSearchParams } from 'expo-router';
import { lightColors, darkColors, resolveColor as rsColor } from '../../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../../src/utils/api';

const { width } = Dimensions.get('window');


const PERIODS = ['صباحي', 'ظهيرة', 'مسائي', 'ليلي'];
const PERIODS_EN = ['Morning', 'Noon', 'Evening', 'Night'];

const TIMES = [
  ['٧:٠٠ ص', '٨:٠٠ ص', '٩:٠٠ ص', '١٠:٠٠ ص', '١١:٠٠ ص'],
  ['١٢:٠٠ م', '١:٠٠ م', '٢:٠٠ م'],
  ['٤:٠٠ م', '٥:٠٠ م', '٦:٠٠ م'],
  ['٨:٠٠ م', '٩:٠٠ م']
];
const TIMES_EN = [
  ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM'],
  ['12:00 PM', '1:00 PM', '2:00 PM'],
  ['4:00 PM', '5:00 PM', '6:00 PM'],
  ['8:00 PM', '9:00 PM']
];

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
        params: { id: params?.id || id, day, period, time, visitType: activeVt }
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
  const [period, setPeriod] = useState(0);
  const [time, setTime] = useState(0);
  const [faqExpanded, setFaqExpanded] = useState({});
  const [isFav, setIsFav] = useState(false);
  const [isImgModalVisible, setIsImgModalVisible] = useState(false);

    const handleShare = async () => {
    try {
      const url = `https://nabdplus.com/doctor/${doc?.id || '123'}`;
      await Share.share({
        message: lang === 'ar' ? `احجز موعد مع ${doc?.n} عبر نبض بلس! الرابط: ${url}` : `Book an appointment with ${doc?.n} via Nabd Plus! Link: ${url}`,
        url: url,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const toggleFaq = (i) => setFaqExpanded(prev => ({ ...prev, [i]: !prev[i] }));
  
  const getPrice = (type) => {
    const base = parseFloat(doc?.consultation_fee || doc?.p) || 150;
    if (type === 'online') return base * 0.7;
    if (type === 'home') return base * 1.5;
    return base;
  };


  const perArr = lang === 'ar' ? PERIODS : PERIODS_EN;
  const timesArr = lang === 'ar' ? TIMES : TIMES_EN;

  const docGradientColors = doc?.cg || ['var(--ps)', '#C8EEF4'];

  const faqs = [
    { q: 'هل الكشف يشمل المتابعة؟', a: 'نعم، الكشف يشمل متابعة مجانية خلال ١٥ يوم من تاريخ الزيارة الأولى.' },
    { q: 'هل يمكن إلغاء الموعد؟', a: 'يمكنك الإلغاء أو التعديل قبل الموعد بـ ٤ ساعات على الأقل بدون رسوم.' }
  ];

  if (!loading && (!doc || Object.keys(doc).length === 0)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 } ]}>
        <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 64, color: colors.t3, marginBottom: 10 }}>person_off</Text>
        <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: colors.n, textAlign: 'center' }}>الطبيب غير متاح حالياً أو غير موجود</Text>
        <TouchableOpacity style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: resolveColor('var(--p)'), borderRadius: 12 }} onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 16 }}>العودة للقائمة</Text>
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
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.t2 }}>
          {isRTL ? 'الطبيب غير موجود' : 'Doctor Not Found'}
        </Text>
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
              ) : <View style={{ width: 120, height: 120 }}/>}

              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', marginHorizontal: 16 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: resolveColor('var(--n)'), marginBottom: 5, textAlign: isRTL ? 'right' : 'left', lineHeight: 28 }}>{doc?.n}</Text>
              <Text style={{ fontSize: 13, color: resolveColor('var(--t2)'), fontWeight: '600', marginBottom: 14, textAlign: isRTL ? 'right' : 'left' }}>{doc?.sp}</Text>
              
              {/* Clickable Clinic/Hospital Link */}
              <TouchableOpacity onPress={() => router.push(`/consultations/clinic/${doc?.clinicId || '1'}`)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--pd)'), fontSize: 16, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>local_hospital</Text>
                <Text style={{ fontSize: 12.5, color: resolveColor('var(--n)'), fontWeight: '800', textDecorationLine: 'underline' }}>{lang === 'ar' ? 'مستشفى وعيادات نبض بلس' : 'Nabd Plus Hospital & Clinics'}</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: 14, width: '90%' }}>
                <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--pd)'), fontSize: 14, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>location_on</Text>
                <Text style={{ fontSize: 11.5, color: resolveColor('var(--t2)'), lineHeight: 14, textAlign: isRTL ? 'right' : 'left', fontWeight: '500' }}>
                  {doc?.loc}{'\n'}
                  <Text style={{ fontSize: 11.5, color: resolveColor('var(--t3)'), fontWeight: '500' }}>{doc?.addr}</Text>
                </Text>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: resolveColor('var(--n)'), letterSpacing: -2 }}>{getPrice(activeVt)}</Text>
                <Text style={{ fontSize: 12, color: resolveColor('var(--t2)'), marginRight: isRTL ? 2 : 0, marginLeft: isRTL ? 0 : 2 }}>{lang === 'ar' ? 'ر.س' : 'SAR'}</Text>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--am)'), fontSize: 14, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>star</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: resolveColor('var(--n)') }}>{doc?.r}</Text>
                <Text style={{ fontSize: 9, color: resolveColor('var(--t3)'), marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>({doc?.rev})</Text>
              </View>
            </View>
          </View>
          </View>

          {/* Aesthetic Cuts - Top Left/Right and Bottom Right/Left using absolute views */}
          {/* Top Left cut */}
          {/* Top Left cut */}
          <View style={{ position: 'absolute', top: 0, left: isRTL ? undefined : 0, right: isRTL ? 0 : undefined, width: 72, height: 72 + Math.max(insets.top, 20), backgroundColor: colors.bg, borderBottomRightRadius: isRTL ? 0 : 28, borderBottomLeftRadius: isRTL ? 28 : 0, zIndex: 10, flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 4 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: resolveColor('var(--n)'), alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width:0,height:3}, shadowOpacity: 0.15, shadowRadius: 10 }}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 18 }}>{isRTL ? 'arrow_forward' : 'arrow_back'}</Text>
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
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: isFav ? resolveColor('var(--cr)') : colors.t3, fontSize: 16 }}>{isFav ? 'favorite' : 'favorite_border'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.bd, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 16 }}>share</Text>
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

          {/* Visit Types (Inline Exact Match) */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 14 }}>
            {[
              { id: 'clinic', n: 'عيادة', ic: 'meeting_room', p: getPrice('clinic'), c: 'var(--n)', bg: 'var(--n)', tc: '#fff' },
              { id: 'online', n: 'أونلاين', ic: 'videocam', p: getPrice('online'), c: 'var(--p)', bg: 'var(--s)', tc: 'var(--t)' },
              { id: 'home', n: 'منزلي', ic: 'home', p: getPrice('home'), c: 'var(--p)', bg: 'var(--s)', tc: 'var(--t)' }
            ].map(vt => {
              const isActive = activeVt === vt.id;
              return (
                <TouchableOpacity key={vt.id} onPress={() => setActiveVt(vt.id)} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, backgroundColor: isActive ? resolveColor('var(--n)') : colors.s, borderWidth: isActive ? 0 : 1.5, borderColor: colors.bd, shadowColor: isActive ? '#141A2A' : undefined, shadowOffset: {width:0,height:6}, shadowOpacity: 0.2, shadowRadius: 20 }}>
                  <View style={{ width: 28, height: 28, backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : resolveColor('var(--p)')+'18', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: isActive ? '#fff' : resolveColor('var(--p)'), fontSize: 18 }}>{vt.ic}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#fff' : colors.t }}>{vt.n}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: isActive ? '#fff' : colors.n }}>{vt.p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Book Appointment Section */}
          <View style={styles.section}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
              احجز موعدك
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 16, transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
              {daysArr.map((d, i) => {
                const isActive = day === i;
                return (
                  <TouchableOpacity key={i} onPress={() => { setDay(i); setPeriod(0); setTime(0); }} style={[styles.dayCard, { backgroundColor: isActive ? colors.n : colors.s, borderColor: isActive ? undefined : colors.bd, marginRight: 7, transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
                    <Text style={{ fontSize: 9.5, color: isActive ? 'rgba(255,255,255,0.5)' : colors.t3, marginBottom: 3 }}>{d}</Text>
                    <View style={[styles.dayNumWrap, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? undefined : colors.bd } ]}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#fff' : colors.n }}>{dnumsArr[i]}</Text>
                    </View>
                    <Text style={{ fontSize: 8, color: isActive ? 'rgba(255,255,255,0.4)' : colors.t3, marginTop: 2 }}>{dmonArr[i]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 12, marginBottom: 10 }}>
              {perArr.map((p, i) => {
                const isActive = period === i;
                return (
                  <TouchableOpacity key={i} onPress={() => { setPeriod(i); setTime(0); }} style={[styles.periodBtn, { backgroundColor: isActive ? colors.n : colors.s, borderColor: isActive ? undefined : colors.bd, marginRight: isRTL && i !== perArr.length-1 ? 5 : 0, marginLeft: !isRTL && i !== perArr.length-1 ? 5 : 0 } ]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? '#fff' : colors.t3 }}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
              {timesArr[period].map((t, i) => {
                const isActive = time === i;
                return (
                  <TouchableOpacity key={i} onPress={() => setTime(i)} style={[styles.timeBtn, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? undefined : colors.bd, marginRight: 6, marginBottom: 6 } ]}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : colors.t2 }}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* About Doctor */}
          <View style={styles.section}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>عن الطبيب</Text>
            <Text style={{ fontSize: 12, color: colors.t2, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
              {doc.biography || 'استشاري باطنة وجهاز هضمي. خبرة +١٥ عامًا. الزمالة البريطانية MRCP.'}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
              {(doc.tags || ['مناظير', 'قولون', 'كبد']).map((t, i) => (
                <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: resolveColor(['var(--ps)', 'var(--ts)', 'var(--cs)'][i%3]) }}>
                  <Text style={{ fontSize: 10, color: resolveColor(['var(--pt)', 'var(--tl)', 'var(--cr)'][i%3]), fontWeight: '700' }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stats Section */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 7, marginTop: 14 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: resolveColor('var(--ps)'), borderRadius: 16 }}>
              <Text style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--p)') }}>{doc.exp || '١٥+'}</Text>
              <Text style={{ fontSize: 8, color: resolveColor('var(--pt)') }}>سنة خبرة</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: resolveColor('var(--ts)'), borderRadius: 16 }}>
              <Text style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--tl)') }}>{doc.patients || '٢,٥٠٠+'}</Text>
              <Text style={{ fontSize: 8, color: '#1A8A74' }}>مريض</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: resolveColor('var(--as)'), borderRadius: 16 }}>
              <Text style={{ fontSize: 19.5, fontWeight: '900', color: resolveColor('var(--am)') }}>{doc.r || '4.9'}</Text>
              <Text style={{ fontSize: 8, color: '#B07D1E' }}>تقييم</Text>
            </View>
          </View>

          {/* Clinic Photos */}
          {/* Clinic Photos */}
          <View style={styles.section}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n }}>{lang === 'ar' ? 'صور العيادة وغرفة الكشف' : 'Clinic & Examination Room'}</Text>
              <Text style={{ fontSize: 11, color: resolveColor('var(--pd)'), fontWeight: '600' }}>عرض الكل</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <View style={{ width: 180, height: 120, borderRadius: 14, overflow: 'hidden' }}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400' }} style={{ width: '100%', height: '100%' }} />
              </View>
              <View style={{ width: 180, height: 120, borderRadius: 14, overflow: 'hidden' }}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=400' }} style={{ width: '100%', height: '100%' }} />
              </View>
            </ScrollView>
          </View>

          {/* Hospital Photos */}
          <View style={[styles.section, { paddingTop: 0 } ]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n }}>{lang === 'ar' ? 'المستشفى والمرافق' : 'Hospital & Facilities'}</Text>
              <Text style={{ fontSize: 11, color: resolveColor('var(--pd)'), fontWeight: '600' }}>عرض الكل</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <View style={{ width: 140, height: 140, borderRadius: 14, overflow: 'hidden' }}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1538108149393-cebb47ac8dcd?auto=format&fit=crop&q=80&w=400' }} style={{ width: '100%', height: '100%' }} />
              </View>
              <View style={{ width: 220, height: 140, borderRadius: 14, overflow: 'hidden' }}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&q=80&w=600' }} style={{ width: '100%', height: '100%' }} />
              </View>
            </ScrollView>
          </View>

          {/* Extra Info */}
          <View style={styles.section}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>معلومات إضافية</Text>
            <View style={{ gap: 8 }}>
              {[
                { ic: 'school', c: 'var(--bl)', cs: 'var(--bs)', t: 'المؤهلات', d: doc.education || 'دكتوراه الباطنة — جامعة القاهرة' },
                { ic: 'language', c: 'var(--tl)', cs: 'var(--ts)', t: 'اللغات', d: doc.languages || 'العربية، الإنجليزية' },
                { ic: 'payments', c: 'var(--am)', cs: 'var(--as)', t: 'طرق الدفع', d: doc.payments || 'كاش، فيزا، تأمين طبي' }
              ].map((x, i) => (
                <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: colors.bg, borderRadius: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: resolveColor(x.cs), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor(x.c), fontSize: 20 }}>{x.ic}</Text>
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.n }}>{x.t}</Text>
                    <Text style={{ fontSize: 10, color: colors.t2 }}>{x.d}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* FAQs */}
          <View style={styles.section}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>أسئلة شائعة</Text>
            <View style={{ gap: 8 }}>
              {faqs.map((f, i) => {
                const isOpen = faqExpanded[i];
                return (
                  <TouchableOpacity key={i} onPress={() => toggleFaq(i)} activeOpacity={0.8} style={{ padding: 12, backgroundColor: colors.bg, borderRadius: 12 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: colors.n, textAlign: isRTL ? 'right' : 'left', flex: 1 }}>{f.q}</Text>
                      <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 18, transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>expand_more</Text>
                    </View>
                    {isOpen && (
                      <Text style={{ fontSize: 10.5, color: colors.t2, lineHeight: 18, marginTop: 8, textAlign: isRTL ? 'right' : 'left' }}>{f.a}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Floating CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.bd }}>
        <TouchableOpacity onPress={() => go('s12')} style={{ width: '100%', padding: 16, borderRadius: 18, backgroundColor: resolveColor('var(--n)'), shadowColor: '#141A2A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 10, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>تأكيد الحجز — {getPrice(activeVt)} ر.س</Text>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 19 }}>{isRTL ? 'arrow_back' : 'arrow_forward'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isImgModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImgModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setIsImgModalVisible(false)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 100 }}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 32 }}>close</Text>
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
