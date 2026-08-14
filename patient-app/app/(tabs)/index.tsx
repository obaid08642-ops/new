// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import Icon from '../../src/components/Icon';
import { Svg, Path } from 'react-native-svg';

import { apiFetch } from '../../src/utils/api';

const { width } = Dimensions.get('window');

const quick = [
  ['استشارات', 'stethoscope', 'var(--p)', 'var(--ps)', 's0'],
  ['صيدلية', 'prescriptions', 'var(--pr)', 'var(--prs)', 's1'],
  ['تحاليل', 'science', 'var(--tl)', 'var(--ts)', 's2'],
  ['تمريض', 'home_health', 'var(--bl)', 'var(--bs)', 's3'],
  ['التغذية', 'nutrition', 'var(--gr)', 'var(--grs)', 's139'],
  ['الأمومة', 'pregnant_woman', 'var(--pk)', 'var(--pks)', 's154'],
  ['الخريطة', 'pin_drop', 'var(--tl)', 'var(--ts)', 's116'],
  ['صحتي', 'ecg_heart', 'var(--cr)', 'var(--cs)', 's4'],
  ['إسعاف', 'emergency', 'var(--or)', 'var(--ors)', 's158']
];

const aiTools = [
  ['المساعد الطبي الذكي', 'robot', 'var(--p)', 's47'],
  ['مترجم روشتات', 'translate', 'var(--pr)', 's135'],
  ['تحليل البشرة', 'face-woman', 'var(--pk)', 's136'],
  ['تقرير شهري', 'chart-line', 'var(--tl)', 's137']
];

export default function Home() {
  const { isDark, lang } = useApp() as any;
  const go = (screen: string, title?: string, params?: any) => {
    // Map raw screen IDs to expo router paths
    const m: any = { 
      s0: '/(tabs)/consultations', 
      s1: '/(tabs)/pharmacy', 
      s2: '/(tabs)/diagnostics', 
      s3: '/(tabs)/nursing', 
      s4: '/(tabs)/health',
      s139: '/nutrition/hub',
      s154: '/maternity/hub',
      s116: '/map',
      s158: '/emergency/sos',
      s19: '/health/smart-reminders',
      s22: '/(tabs)/consultations',
      s47: '/ai/symptom-checker',
      s135: '/ai/prescription-translator',
      s136: '/ai/skin-analysis',
      s137: '/ai/monthly-report',
      sH: '/map', // Hologram Map
    };
    if (m[screen]) router.push(m[screen]);
    else {
      alert(lang === 'ar' ? 'هذا المسار غير متاح في الإصدار الحالي.' : 'This route is unavailable in the current release.');
    }
  };
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ecgAnim = useRef(new Animated.Value(0)).current;

  const [offers, setOffers] = useState<any[]>([]);
  const [upcomingAppt, setUpcomingAppt] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [offersRes, apptRes, profRes] = await Promise.all([
          apiFetch('/home/offers').catch(() => null),
          apiFetch('/home/upcoming-appointment').catch(() => null),
          apiFetch('/users/me/profile').catch(() => null)
        ]);
        if (offersRes) setOffers(Array.isArray(offersRes) ? offersRes : offersRes?.data || []);
        if (apptRes) setUpcomingAppt(Array.isArray(apptRes) ? apptRes[0] : apptRes?.data?.[0] || apptRes);
        if (profRes) setProfile(profRes.data || profRes || null);
      } catch (err) {
        console.error(err);
      }
    }
    loadHomeData();

    Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 4800, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(ecgAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const { DeviceEventEmitter } = require('react-native');
    const copayListener = DeviceEventEmitter.addListener('onCopayRequired', (payload) => {
      console.log('[PatientApp] Copay triggered from WS:', payload);
      router.push({
        pathname: '/insurance/copay',
        params: { approvalCode: payload?.approval_code, amount: payload?.amount }
      });
    });
    return () => copayListener.remove();
  }, []);



  const resolveColor = (c) => {
    if (!c) return '#000';
    if (c.startsWith('var(')) {
      const v = c.replace('var(--', '').replace(')', '');
      return colors[v] || c;
    }
    return c;
  };

  

  const ecgPath = "M0 20 h30 l6 -3 l6 3 h22 l5 4 l6 -4 h26 l5 -3 l6 3 h20 l7 5 l5 -5 h18 l8 -13 l9 26 l8 -22 l6 11 h26 l6 -3 l6 3 h22 l5 4 l6 -4 h24 l5 -3 l6 3 h40";
  const ecgPeakPath = "M179 20 l8 -13 l9 26 l8 -22 l6 11";

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.35, 1]
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.16, 0, 0]
  });

  const ecgTranslate = ecgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 400]
  });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={[styles.content, { paddingTop: 20 } ]}>
      
      {/* GREETING CARD */}
      <View style={[styles.greetingCard, { borderColor: colors.bd } ]}>
        <View style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
          <View>
            <Text style={{ fontSize: 11, color: colors.t3, marginBottom: 3, textAlign: isRTL ? 'right' : 'left' }}>{lang === 'ar' ? 'مساء الخير' : 'Good evening'}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.n, textAlign: isRTL ? 'right' : 'left' }}>{profile?.name || (lang === 'ar' ? 'مستخدم نبض' : 'Nabdah user')}</Text>
          </View>
          
          <View style={{ position: 'relative', width: 58, height: 58 }}>
            <Animated.View style={{ position: 'absolute', inset: 0, borderRadius: 29, backgroundColor: resolveColor('var(--p)'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }}/>
            <View style={{ position: 'absolute', inset: 6, borderRadius: 23, overflow: 'hidden', shadowColor: resolveColor('var(--p)'), shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="ecg_heart" color="#fff" size={28} />
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 14, height: 40, overflow: 'hidden' }}>
          {/* Background subtle path */}
          <Svg viewBox="0 0 380 40" preserveAspectRatio="none" style={{ position: 'absolute', width: '100%', height: '100%' }}>
            <Path d={ecgPath} stroke={colors.bd} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
          
          {/* Animated active path masked by an animated view */}
          <Animated.View style={{ position: 'absolute', inset: 0, transform: [{ translateX: ecgTranslate }] }}>
            <Svg viewBox="0 0 380 40" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <Path d={ecgPath} stroke={resolveColor('var(--p)')} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d={ecgPeakPath} stroke={resolveColor('var(--pd)')} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
            <View style={{ position: 'absolute', top: 0, left: 100, width: 300, height: '100%' }}/>
          </Animated.View>
        </View>
      </View>

      {/* Search Bar */}
      <TouchableOpacity activeOpacity={0.9} style={[styles.homeSearchBar, { borderColor: colors.bd, backgroundColor: colors.s }]} onPress={() => router.push('/search')}>
        <Icon name="search" color={colors.t3} size={22} />
        <Text style={{ flex: 1, fontSize: 13, color: colors.t3, textAlign: isRTL ? 'right' : 'left', marginHorizontal: 12 }}>
          {lang === 'ar' ? 'ابحث عن طبيب، دواء، تحليل...' : 'Search doctor, medicine, lab...'}
        </Text>
        <Icon name="mic" color={resolveColor('var(--p)')} size={22} />
      </TouchableOpacity>

      {/* CMS Health Banner */}
      <TouchableOpacity activeOpacity={0.8} style={[styles.healthBanner, { borderColor: resolveColor('var(--prs)') }]} onPress={() => go('s19', 'تذكير صحي')}>
        <View style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.iconBox, { backgroundColor: resolveColor('var(--pr)'), marginRight: 14 } ]}>
            <Icon name="water_drop" color="#fff" size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: resolveColor('var(--pr)'), marginBottom: 2, textAlign: 'left' }}>تذكير صحي</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, textAlign: 'left' }}>حان وقت فحص السكر التراكمي</Text>
            <Text style={{ fontSize: 11, color: colors.t3, marginTop: 4, textAlign: 'left' }}>مرّت ٣ شهور على آخر فحص HbA1c</Text>
          </View>
          <Icon name="chevron_right" color="var(--pr)" size={24} />
        </View>
      </TouchableOpacity>

      {/* Quick Access Grid */}
      <View style={styles.quickGrid}>
        {quick.map((q, i) => (
          <TouchableOpacity key={i} activeOpacity={0.7} style={[styles.quickItem, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => go(q[4], q[0])}>
            <View style={[styles.quickIconBg, { backgroundColor: resolveColor(q[3]) }]}>
              <Icon name={q[1]} color={q[2]} size={28} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.n, marginTop: 8 }}>{q[0]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Triage Banner */}
      <TouchableOpacity activeOpacity={0.8} style={styles.aiTriage} onPress={() => go('s133', 'المساعد الذكي')}>
        <View style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18 }}>
          <View style={[styles.aiIconBox, { marginRight: 16 } ]}>
            <View style={styles.aiGradientBox}>
              <Icon name="neurology" color="#fff" size={30} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(155,139,250,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#C4B8FF' }}>مدعوم بالذكاء الاصطناعي</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'left' }}>المساعد الطبي الذكي</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4, textAlign: 'left' }}>حلّل أعراضك واعرف التخصص المناسب فوراً</Text>
          </View>
          <Icon name="arrow_forward" color="rgba(255,255,255,0.7)" size={20} />
        </View>
      </TouchableOpacity>

      {/* AI Tools */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        {aiTools.map((t, i) => (
          <TouchableOpacity key={i} activeOpacity={0.7} style={[styles.aiTool, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => go(t[3], t[0])}>
            <View style={[styles.aiToolIconBox, { backgroundColor: resolveColor(t[2]) + '20' }]}>
              <Icon name={t[1]} color={t[2]} size={22} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.n, textAlign: 'center', marginTop: 8 }}>{t[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* All Services */}
      <TouchableOpacity activeOpacity={0.7} style={[styles.allServices, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => go('s158', 'كل الخدمات')}>
        <View style={[styles.iconBox, { backgroundColor: resolveColor('var(--ps)'), marginRight: 14 } ]}>
          <Icon name="apps" color="var(--p)" size={26} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, textAlign: 'left' }}>كل الخدمات</Text>
          <Text style={{ fontSize: 11, color: colors.t3, textAlign: 'left', marginTop: 2 }}>تغذية، أمومة، مجتمع، تمريض، وأكثر</Text>
        </View>
        <Icon name="chevron_right" color="var(--t3)" size={24} />
      </TouchableOpacity>

      {/* Upcoming Appointment */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>موعدك القادم</Text>
        <TouchableOpacity onPress={() => go('s22')}><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>كل المواعيد</Text></TouchableOpacity>
      </View>
      {upcomingAppt ? (
        <View style={[styles.apptCard, { backgroundColor: colors.n } ]}>
          <View style={[styles.apptDateBox, { marginRight: 14 } ]}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{upcomingAppt.date?.split('-')[2] || '٢٦'}</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>يونيو</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'left' }}>{upcomingAppt.doctorName}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'left', marginTop: 4 }}>{upcomingAppt.type} • {upcomingAppt.time}</Text>
          </View>
          <TouchableOpacity style={[styles.apptBtn, { backgroundColor: colors.s }]} onPress={() => go('s22')}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.n }}>التفاصيل</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.apptCard, { backgroundColor: colors.n, justifyContent: 'center' } ]}>
          <Text style={{ color: '#fff' }}>لا توجد مواعيد قادمة</Text>
        </View>
      )}

      {/* Offers */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>عروض وباقات</Text>
        <TouchableOpacity onPress={() => go('s26')}><Text style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 24 }}>
        {offers.map((o, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} style={[styles.offerCard, { backgroundColor: colors.s, borderColor: colors.bd, borderWidth: 1 }]} onPress={() => go('s23', o.t, { offerIndex: i })}>
            <View style={styles.offerCover}>
              <View style={StyleSheet.absoluteFill} />
              <Icon name={o.ic} color="rgba(255,255,255,0.2)" size={90} style={{ position: 'absolute', bottom: -15, right: -10 }}/>
              <View style={styles.offerDiscBadge}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{o.disc}-</Text></View>
              {o.sponsored && <View style={[styles.offerSponsored, { backgroundColor: 'rgba(255,255,255,0.9)' } ]}><Text style={{ color: o.c, fontSize: 10, fontWeight: '800' }}>ممول</Text></View>}
            </View>
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Icon name="star" color="#F5A623" size={14} style={{ marginRight: 4 }}/>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.n, marginRight: 6 }}>{o.rating}</Text>
                <Text style={{ fontSize: 10, color: colors.t3 }}>{o.prov}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.n, textAlign: 'left', marginBottom: 8 }} numberOfLines={1}>{o.t}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: resolveColor('var(--p)') }}>{o.price}</Text>
                <Text style={{ fontSize: 13, color: colors.t3, textDecorationLine: 'line-through', marginLeft: 8 }}>{o.old}</Text>
                <Text style={{ fontSize: 10, color: colors.t3, marginLeft: 4 }}>ر.س</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ width: 40 }}/>
      </ScrollView>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 20, paddingBottom: 120 },
  homeSearchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderWidth: 1.5, marginBottom: 18 },
  greetingCard: { borderRadius: 24, padding: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1.5, minHeight: 120 },
  ecgIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(35,181,206,0.15)', justifyContent: 'center', alignItems: 'center' },
  ecgGradient: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#23B5CE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  healthBanner: { borderRadius: 20, padding: 16, marginBottom: 18, overflow: 'hidden', borderWidth: 1.5 },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
  quickItem: { width: (width - 60) / 3, alignItems: 'center', paddingVertical: 18, borderRadius: 20, marginBottom: 10, borderWidth: 1 },
  quickIconBg: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  aiTriage: { width: '100%', borderRadius: 22, marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(155,139,250,0.3)' },
  aiIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(122,107,234,0.3)', padding: 2 },
  aiGradientBox: { flex: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#7A6BEA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  aiTool: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, minWidth: 80, marginRight: 10 },
  aiToolIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  allServices: { width: '100%', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center' },
  apptCard: { borderRadius: 20, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center' },
  apptDateBox: { width: 54, height: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  apptBtn: { backgroundColor: 'transparent', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  offerCard: { width: 240, borderRadius: 22, overflow: 'hidden', marginRight: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  offerCover: { height: 130, position: 'relative' },
  offerDiscBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FF4B55', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  offerSponsored: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }
});
