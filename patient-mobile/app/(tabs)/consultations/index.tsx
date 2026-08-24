// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal } from 'react-native';

import { useApp } from '../../../src/context/AppContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { lightColors, darkColors, resolveColor } from '../../../src/theme/colors';
// Specialty icon palette (display-only — names/counts come from /care/specialties)
const SPEC_ICONS: Record<string, [string, string, string]> = {
  'باطنة': ['stethoscope', 'var(--p)', 'var(--ps)'],
  'أطفال': ['child_care', 'var(--pr)', 'var(--prs)'],
  'قلب': ['favorite', 'var(--cr)', 'var(--cs)'],
  'جلدية': ['dermatology', 'var(--am)', 'var(--as)'],
  'عيون': ['visibility', 'var(--bl)', 'var(--bs)'],
  'أسنان': ['dentistry', 'var(--tl)', 'var(--ts)'],
  'عظام': ['orthopedics', 'var(--gr)', 'var(--grs)'],
  'نساء وولادة': ['pregnant_woman', 'var(--pk)', 'var(--pks)'],
  'نفسي': ['psychology', 'var(--tl)', 'var(--ts)'],
};
const DEFAULT_SPEC_ICON: [string, string, string] = ['medical_services', 'var(--p)', 'var(--ps)'];
import Icon from '../../../src/components/Icon';
import { apiFetch } from '../../../src/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickLocalized } from '../../../src/utils/localize';
import { LocalizedText } from '../../../src/components/LocalizedText';

export default function Consultations() {
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  const go = (screen: string, title?: string, params?: any) => {
    if (screen === 's11' || screen === 's5') {
      router.push(`/consultations/doctor/${params?.doc?.id || params?.id || 'd1'}`);
    } else if (screen === 's47') {
      router.push('/ai-assistant');
    }
  };
  const isRTL = lang === 'ar' || lang === 'ur';
  const colors = isDark ? darkColors : lightColors;
  const [activePay, setActivePay] = useState('الكل');
  const [activeVt, setActiveVt] = useState('clinic');
  const [activeSpec, setActiveSpec] = useState('الكل');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterTitle, setFilterTitle] = useState('الكل');
  const [filterGender, setFilterGender] = useState('الكل');
  const [filterPrice, setFilterPrice] = useState('الكل');
  const [filterAvail, setFilterAvail] = useState('الكل');
  const [filterSort, setFilterSort] = useState('الأعلى تقييماً');
  const [showInsModal, setShowInsModal] = useState(false);
  const [insCompany, setInsCompany] = useState('');
  const [insClass, setInsClass] = useState('');
  const [stepIns, setStepIns] = useState(1);
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]);
  const [insuranceNetworks, setInsuranceNetworks] = useState<any[]>([]);
  const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);


  React.useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const data = await apiFetch('/providers?type=doctor');
        // Normalize real provider-profile fields into the card display shape
        const normalized = (Array.isArray(data) ? data : []).map((d: any) => ({
          ...d,
          n: pickLocalized(d.name_ar, d.name_en) || '',
          sp: [d.title, d.specialty].filter(Boolean).join(' — '),
          specialty_ar: d.specialty,
          badge: d.title || '',
          loc: [d.district, d.city].filter(Boolean).join('، '),
          addr: d.address || '',
          services: (Array.isArray(d.consultation_modes) ? d.consultation_modes : []).map((m: string) => (m === 'video' ? 'online' : m)),
          r: d.rating_avg ?? null,
          rev: d.rating_count ?? 0,
          av: null,
          p: (typeof d.price_clinic === 'number' ? d.price_clinic : null) ?? d.price_online ?? d.price_home ?? null,
        }));
        setDoctors(normalized);
      } catch (err) {
        console.log('Error fetching doctors:', err);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();

    // Real specialties (names + live doctor counts) and real active offers
    apiFetch('/care/specialties')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        setSpecialties(Array.isArray(list) ? list : []);
      })
      .catch(() => setSpecialties([]));
    apiFetch('/home/offers')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        setOffers(Array.isArray(list) ? list : []);
      })
      .catch(() => setOffers([]));
    apiFetch('/insurance/companies')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setInsuranceCompanies(list);
        setInsuranceCatalogUnavailable(list.length === 0);
      })
      .catch(() => { setInsuranceCompanies([]); setInsuranceCatalogUnavailable(true); });
  }, []);

  React.useEffect(() => {
    if (!insCompany) { setInsuranceNetworks([]); return; }
    apiFetch(`/insurance/companies/${insCompany}/networks`)
      .then((res: any) => setInsuranceNetworks(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setInsuranceNetworks([]));
  }, [insCompany]);

  function resolveColor(c: any) {
    if (!c) return '#000';
    if (c.startsWith('var(')) {
      const v = c.replace('var(--', '').replace(')', '');
      return colors[v] || c;
    }
    return c;
  };

  const [showOnboarding, setShowOnboarding] = useState(true);

  const filteredDocs = doctors.filter((d: any) => {
    const matchesSearch = (d.name || d.name_ar || d.n || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (d.description || d.desc || d.sp || d.specialty_ar || '').toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by visit type (clinic, online, home)
    const matchesVt = (d.services && d.services.includes(activeVt)) ||
                      (activeVt === 'home' && d.home_visit_enabled) ||
                      (activeVt === 'online' && d.video_enabled) ||
                      (activeVt === 'clinic' && !d.video_enabled && !d.home_visit_enabled) ||
                      (d.services === undefined);

    // Filter by payment type (cash, insurance)
    let matchesPay = true;
    if (activePay === 'كاش') {
      matchesPay = !d.insurance_only;
    } else if (activePay === 'تأمين') {
      let isInsured = (d.insurance_supported && d.insurance_supported.length > 0) || (d.tags && d.tags.includes('تأمين'));
      if (!isInsured) matchesPay = false;
      else if (insCompany) {
        const supportedCompanies = Array.isArray(d.accepted_insurance) ? d.accepted_insurance : (Array.isArray(d.insurance_supported) ? d.insurance_supported : []);
        const acceptsCompany = supportedCompanies.some((value: any) => (value?.id || value?.code || value) === insCompany);
        const acceptedNetworks = d.insurance_plans?.[insCompany];
        matchesPay = acceptsCompany && (!insClass || (Array.isArray(acceptedNetworks) && acceptedNetworks.includes(insClass)));
      }
    }

    // Filter by specialty
    let matchesSpec = true;
    if (activeSpec !== 'الكل') {
      matchesSpec = (d.specialty_ar === activeSpec || (d.sp && d.sp.includes(activeSpec)));
    }

    // Modal Filters — real fields only (no name-based gender guessing)
    let matchesGender = true;
    if (filterGender !== 'الكل' && d.gender) {
      matchesGender = filterGender === 'طبيب' ? d.gender === 'male' : d.gender === 'female';
    }

    let matchesTitle = filterTitle === 'الكل' || (d.sp || d.badge || d.biography || '').includes(filterTitle);

    // Filter by Price
    let matchesPrice = true;
    const price = d.consultation_fee || parseInt((d.p||'0').toString().replace(/\\D/g, '')) || 0;
    if (filterPrice === 'أقل من 100') matchesPrice = price < 100;
    else if (filterPrice === '100 - 200') matchesPrice = price >= 100 && price <= 200;
    else if (filterPrice === 'أكثر من 200') matchesPrice = price > 200;

    // Filter by Availability
    let matchesAvail = true;
    if (filterAvail === 'اليوم') matchesAvail = (d.av || d.availability || '').includes('اليوم');
    else if (filterAvail === 'غداً') matchesAvail = (d.av || d.availability || '').includes('غداً');

    return matchesSearch && matchesVt && matchesPay && matchesSpec && matchesGender && matchesTitle && matchesPrice && matchesAvail;
  }).sort((a, b) => {
    if (filterSort === 'الأقل سعراً') {
      const pa = a.consultation_fee || parseInt((a.p||'0').toString().replace(/\\D/g, '')) || 0;
      const pb = b.consultation_fee || parseInt((b.p||'0').toString().replace(/\\D/g, '')) || 0;
      return pa - pb;
    }
    // Default: الأعلى تقييماً
    const ra = a.rating || parseFloat(a.r || 0);
    const rb = b.rating || parseFloat(b.r || 0);
    return rb - ra;
  });

  const vtOptions = [
    { id: 'clinic', n: 'في العيادة', ic: 'meeting_room', desc: 'احجز موعداً لزيارة الطبيب في عيادته المجهزة.' },
    { id: 'online', n: 'أونلاين', ic: 'videocam', desc: 'استشارة فيديو آمنة مع الطبيب وأنت في منزلك.' },
    { id: 'home', n: 'استشارة منزلية', ic: 'home', desc: 'طبيب مختص يزورك في منزلك لتقديم الرعاية.' }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <View
          style={[styles.searchBar, { backgroundColor: colors.s, borderColor: colors.bd, flex: 1, marginRight: 8 } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--t3)'), fontSize: 22 }}>search</LocalizedText>
          <TextInput
            style={{ flex: 1, fontSize: 13, color: colors.n, marginLeft: 8, textAlign: isRTL ? 'right' : 'left' }}
            placeholder="ابحث عن دكتور أو تخصص..."
            placeholderTextColor={colors.t3}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.tuneBtn, { backgroundColor: colors.n }]}
          activeOpacity={0.8}
          onPress={() => setShowFilter(true)}
        >
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 20 }}>tune</LocalizedText>
        </TouchableOpacity>
      </View>

      {/* Visit Types */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        {vtOptions.map((vt) => {
          const isActive = activeVt === vt.id;
          return (
            <TouchableOpacity key={vt.id} activeOpacity={0.8} style={[styles.vtBtn, { backgroundColor: isActive ? resolveColor('var(--p)') : colors.s, borderColor: isActive ? resolveColor('var(--p)') : colors.bd }]} onPress={() => setActiveVt(vt.id)}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: isActive ? '#fff' : resolveColor('var(--t3)'), fontSize: 18 }}>{vt.ic}</LocalizedText>
              <LocalizedText style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : colors.n, marginLeft: 6 }}>{vt.n}</LocalizedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Payment Segments */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
        <TouchableOpacity style={[styles.segmentBtn, activePay === 'الكل' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('الكل')}>
          <LocalizedText style={[styles.segmentText, activePay === 'الكل' ? { color: '#fff' } : { color: colors.t2 }]} >الكل</LocalizedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, activePay === 'كاش' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => setActivePay('كاش')}>
          <LocalizedText style={[styles.segmentText, activePay === 'كاش' ? { color: '#fff' } : { color: colors.t2 }]} >كاش</LocalizedText>
        </TouchableOpacity>
                <TouchableOpacity style={[styles.segmentBtn, activePay === 'تأمين' && { backgroundColor: resolveColor('var(--n)') }]} onPress={() => { setActivePay('تأمين'); setStepIns(1); setShowInsModal(true); }}>
          <LocalizedText style={[styles.segmentText, activePay === 'تأمين' ? { color: '#fff' } : { color: colors.t2 }]} >تأمين</LocalizedText>
        </TouchableOpacity>
      </View>

      {/* Specialties — real list from /care/specialties with live doctor counts */}
      {specialties.length > 0 && (
      <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <LocalizedText style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>التخصصات</LocalizedText>
        <TouchableOpacity onPress={() => router.push('/consultations/specialty-select')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 20 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveSpec('الكل')} style={[styles.specBtn, { backgroundColor: activeSpec === 'الكل' ? colors.n : colors.s, borderColor: activeSpec === 'الكل' ? colors.n : colors.bd }]}>
          <View style={[styles.specIconBox, { backgroundColor: activeSpec === 'الكل' ? 'rgba(255,255,255,0.15)' : resolveColor('var(--ps)') }]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: activeSpec === 'الكل' ? '#fff' : resolveColor('var(--p)'), fontSize: 24 }}>apps</LocalizedText>
          </View>
          <LocalizedText style={{ fontSize: 11, fontWeight: '800', color: activeSpec === 'الكل' ? '#fff' : colors.n, marginTop: 8 }}>الكل</LocalizedText>
        </TouchableOpacity>
        {specialties.filter((s: any) => (s.count || 0) > 0).slice(0, 10).map((s: any, i: number) => {
          const meta = SPEC_ICONS[s.name_ar] || SPEC_ICONS[s.specialty] || DEFAULT_SPEC_ICON;
          const isActive = activeSpec === s.name_ar;
          return (
          <TouchableOpacity key={s.slug || i} activeOpacity={0.7} onPress={() => setActiveSpec(isActive ? 'الكل' : s.name_ar)} style={[styles.specBtn, { backgroundColor: isActive ? resolveColor(meta[2]) : colors.s, borderColor: isActive ? resolveColor(meta[1]) : colors.bd }]}>
            <View style={[styles.specIconBox, { backgroundColor: isActive ? '#fff' : resolveColor(meta[2]) }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor(meta[1]), fontSize: 24 }}>{meta[0]}</LocalizedText>
            </View>
            <LocalizedText style={{ fontSize: 11, fontWeight: '800', color: isActive ? resolveColor(meta[1]) : colors.n, marginTop: 8 }}>{s.name_ar}</LocalizedText>
            <LocalizedText style={{ fontSize: 9, color: colors.t3, marginTop: 2 }}>{s.count} طبيب</LocalizedText>
          </TouchableOpacity>
        )})}
        <View style={{ width: 40 }}/>
      </ScrollView>
      </>
      )}

      {/* Best Doctors (Docs 1) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <LocalizedText style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>أفضل الأطباء</LocalizedText>
        <TouchableOpacity onPress={() => router.push('/consultations/doctor-search')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
      </View>

      <View style={{ marginBottom: 24 }}>
        {filteredDocs.slice(0, 2).map((doc, i) => {
          const docGradientColors = doc.cg || ['var(--ps)', '#C8EEF4'];
          return (
          <TouchableOpacity key={i} activeOpacity={0.9} style={[styles.docCard, { backgroundColor: colors.s, borderColor: colors.bd, overflow: 'hidden' }]} onPress={() => go('s5', doc.n, { doc })}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', padding: 16 }}>
              <View style={{ width: 90, height: 104, marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>
                <View
                  style={{ flex: 1, borderTopLeftRadius: 40, borderTopRightRadius: 50, borderBottomLeftRadius: 46, borderBottomRightRadius: 54, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: resolveColor('var(--ps)') }}>
                  {doc.img ? (
                    <Image source={{ uri: doc.img }} resizeMode="cover" style={{ width: '118%', height: '118%' }} />
                  ) : (
                    <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 40 }}>stethoscope</LocalizedText>
                  )}
                </View>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <LocalizedText style={{ fontSize: 15, fontWeight: '800', color: colors.n, marginBottom: 3, textAlign: isRTL ? 'right' : 'left' }}>{doc.n}</LocalizedText>
                {doc.badge ? <View style={[styles.badge, { backgroundColor: resolveColor('var(--ps)'), marginBottom: 5 } ]}><LocalizedText style={{ color: resolveColor('var(--pt)'), fontSize: 9, fontWeight: '700' }}>{doc.badge}</LocalizedText></View> : null}
                <LocalizedText style={{ fontSize: 11, color: colors.t2, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>{pickLocalized(doc.specialty_ar, doc.specialty_en || doc.specialty || doc.sp)}</LocalizedText>

                {(doc.loc || doc.addr) ? (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 14, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0 }}>location_on</LocalizedText>
                  <LocalizedText style={{ fontSize: 10, color: colors.t2, lineHeight: 14, textAlign: isRTL ? 'right' : 'left' }}>
                    {doc.loc}
                    {doc.addr ? <LocalizedText style={{ fontSize: 9, color: colors.t3 }}>{'\n'}{doc.addr}</LocalizedText> : null}
                  </LocalizedText>
                </View>
                ) : null}

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                  {doc.services && doc.services.map((sv, idx) => {
                    const m = {
                      clinic: ['meeting_room', 'var(--bl)', 'var(--bs)', 'عيادة'],
                      home: ['home_health', 'var(--tl)', 'var(--ts)', 'منزلي'],
                      online: ['videocam', 'var(--pr)', 'var(--prs)', 'أونلاين']
                    }[sv];
                    if (!m) return null;
                    return (
                      <View key={idx} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: resolveColor(m[2]), marginRight: isRTL ? 0 : 5, marginLeft: isRTL ? 5 : 0, marginBottom: 4 }}>
                        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor(m[1]), fontSize: 13, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0 }}>{m[0]}</LocalizedText>
                        <LocalizedText style={{ fontSize: 9, fontWeight: '700', color: resolveColor(m[1]) }}>{m[3]}</LocalizedText>
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
                  {doc.tags && doc.tags.map((t, idx) => (
                    <View key={idx} style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0, marginBottom: 4 }}>
                      <LocalizedText style={{ fontSize: 10, color: colors.t2, fontWeight: '600' }}>{t}</LocalizedText>
                    </View>
                  ))}
                </View>

              </View>
            </View>
            <View style={[styles.docFooter, { padding: 11, paddingHorizontal: 16, borderTopWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' } ]}>
              {doc.r != null && doc.r > 0 ? (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 15, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>star</LocalizedText>
                <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{doc.r}</LocalizedText>
                <LocalizedText style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>({doc.rev})</LocalizedText>
              </View>
              ) : <View />}

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <LocalizedText style={{ fontSize: 15, fontWeight: '900', color: '#fff', marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
                  {doc.p != null ? doc.p : '—'}<LocalizedText style={{ fontSize: 9, opacity: 0.6 }}> ر.س</LocalizedText>
                </LocalizedText>
                <TouchableOpacity onPress={() => go('s5', doc.n, { doc })} style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.s }}>
                  <LocalizedText style={{ fontSize: 11, fontWeight: '700', color: resolveColor('var(--pd)') }}>احجز</LocalizedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )})}
      </View>

      {/* Promos — real active campaigns from /home/offers */}
      {offers.length > 0 && (
      <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <LocalizedText style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>عروض وباقات</LocalizedText>
        <TouchableOpacity onPress={() => router.push('/offers')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 24 }}>
        {offers.map((p: any, i: number) => (
          <TouchableOpacity key={p.id || i} activeOpacity={0.9} onPress={() => p.id && router.push(`/offers/${p.id}`)} style={[styles.promoCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
            <View style={{ flex: 1 }}>
              <View style={[styles.promoBadge, { backgroundColor: resolveColor('var(--cr)') }]}><LocalizedText style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>خصم {p.disc}</LocalizedText></View>
              <LocalizedText style={{ fontSize: 13, fontWeight: '800', color: colors.n, marginTop: 8, textAlign: 'left' }}>{p.t}</LocalizedText>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <LocalizedText style={{ fontSize: 16, fontWeight: '900', color: resolveColor('var(--cr)') }}>{p.price}</LocalizedText>
                <LocalizedText style={{ fontSize: 11, color: colors.t3, textDecorationLine: 'line-through', marginRight: 6 }}>{p.old}</LocalizedText>
                <LocalizedText style={{ fontSize: 9, color: colors.t3, marginRight: 2 }}>ر.س</LocalizedText>
              </View>
            </View>
            <View style={[styles.promoIconBox, { backgroundColor: resolveColor('var(--cr)') + '15', marginLeft: 12 }]}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--cr)'), fontSize: 28 }}>local_offer</LocalizedText>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ width: 40 }}/>
      </ScrollView>
      </>
      )}

      {/* More Doctors (Docs 2) */}
      {filteredDocs.length > 2 && (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <LocalizedText style={{ fontSize: 15, fontWeight: '800', color: colors.n }}>أطباء آخرون</LocalizedText>
        <TouchableOpacity onPress={() => router.push('/consultations/doctor-search')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
      </View>
      )}

      <View style={{ marginBottom: 24 }}>
        {/* S10: render at most 8 inline cards — the full directory lives in doctor-search.
            Mapping hundreds of doctors inside a ScrollView blocked the UI thread. */}
        {filteredDocs.slice(2, 10).map((doc, i) => {
          const docGradientColors = doc.cg || ['var(--ps)', '#C8EEF4'];
          return (
          <TouchableOpacity key={i} activeOpacity={0.9} style={[styles.docCard, { backgroundColor: colors.s, borderColor: colors.bd, overflow: 'hidden' }]} onPress={() => go('s5', doc.n, { doc })}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', padding: 16 }}>
              <View style={{ width: 90, height: 104, marginRight: isRTL ? 0 : 14, marginLeft: isRTL ? 14 : 0 }}>
                <View
                  style={{ flex: 1, borderTopLeftRadius: 40, borderTopRightRadius: 50, borderBottomLeftRadius: 46, borderBottomRightRadius: 54, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: resolveColor('var(--ps)') }}>
                  {doc.img ? (
                    <Image source={{ uri: doc.img }} resizeMode="cover" style={{ width: '118%', height: '118%' }} />
                  ) : (
                    <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 40 }}>stethoscope</LocalizedText>
                  )}
                </View>
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <LocalizedText style={{ fontSize: 15, fontWeight: '800', color: colors.n, marginBottom: 3, textAlign: isRTL ? 'right' : 'left' }}>{doc.n}</LocalizedText>
                {doc.badge ? <View style={[styles.badge, { backgroundColor: resolveColor('var(--ps)'), marginBottom: 5 } ]}><LocalizedText style={{ color: resolveColor('var(--pt)'), fontSize: 9, fontWeight: '700' }}>{doc.badge}</LocalizedText></View> : null}
                <LocalizedText style={{ fontSize: 11, color: colors.t2, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>{pickLocalized(doc.specialty_ar, doc.specialty_en || doc.specialty || doc.sp)}</LocalizedText>

                {(doc.loc || doc.addr) ? (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 14, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0 }}>location_on</LocalizedText>
                  <LocalizedText style={{ fontSize: 10, color: colors.t2, lineHeight: 14, textAlign: isRTL ? 'right' : 'left' }}>
                    {doc.loc}
                    {doc.addr ? <LocalizedText style={{ fontSize: 9, color: colors.t3 }}>{'\n'}{doc.addr}</LocalizedText> : null}
                  </LocalizedText>
                </View>
                ) : null}

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                  {doc.services && doc.services.map((sv, idx) => {
                    const m = {
                      clinic: ['meeting_room', 'var(--bl)', 'var(--bs)', 'عيادة'],
                      home: ['home_health', 'var(--tl)', 'var(--ts)', 'منزلي'],
                      online: ['videocam', 'var(--pr)', 'var(--prs)', 'أونلاين']
                    }[sv];
                    if (!m) return null;
                    return (
                      <View key={idx} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: resolveColor(m[2]), marginRight: isRTL ? 0 : 5, marginLeft: isRTL ? 5 : 0, marginBottom: 4 }}>
                        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor(m[1]), fontSize: 13, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0 }}>{m[0]}</LocalizedText>
                        <LocalizedText style={{ fontSize: 9, fontWeight: '700', color: resolveColor(m[1]) }}>{m[3]}</LocalizedText>
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
                  {doc.tags && doc.tags.map((t, idx) => (
                    <View key={idx} style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0, marginBottom: 4 }}>
                      <LocalizedText style={{ fontSize: 10, color: colors.t2, fontWeight: '600' }}>{t}</LocalizedText>
                    </View>
                  ))}
                </View>

              </View>
            </View>
            <View style={[styles.docFooter, { padding: 11, paddingHorizontal: 16, borderTopWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' } ]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 15, marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>star</LocalizedText>
                <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{doc.r}</LocalizedText>
                <LocalizedText style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}>({doc.rev})</LocalizedText>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 13, marginRight: isRTL ? 0 : 3, marginLeft: isRTL ? 3 : 0 }}>schedule</LocalizedText>
                <LocalizedText style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>{doc.av}</LocalizedText>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <LocalizedText style={{ fontSize: 15, fontWeight: '900', color: '#fff', marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
                  {doc.p}<LocalizedText style={{ fontSize: 9, opacity: 0.6 }}> ر.س</LocalizedText>
                </LocalizedText>
                <TouchableOpacity onPress={() => go('s5', doc.n, { doc })} style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.s }}>
                  <LocalizedText style={{ fontSize: 11, fontWeight: '700', color: resolveColor('var(--pd)') }}>احجز</LocalizedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )})}
        {filteredDocs.length > 10 && (
          <TouchableOpacity onPress={() => router.push('/consultations/doctor-search')} style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.s, borderWidth: 1, borderColor: colors.bd }}>
            <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: resolveColor('var(--pd)') }}>
              عرض كل الأطباء ({filteredDocs.length}) في صفحة البحث
            </LocalizedText>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showFilter} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => { setFilterSort('الأعلى تقييماً'); setFilterTitle('الكل'); setFilterGender('الكل'); setFilterPrice('الكل'); setFilterAvail('الكل'); }}>
                <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: resolveColor('var(--pd)') }}>إعادة ضبط</LocalizedText>
              </TouchableOpacity>
              <LocalizedText style={{ fontSize: 18, fontWeight: '900', color: colors.n }}>تصفية متقدمة</LocalizedText>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 28, color: colors.t3 }}>close</LocalizedText>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>الترتيب حسب</LocalizedText>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                {['الأعلى تقييماً', 'الأقل سعراً', 'الأقرب'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setFilterSort(t)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: filterSort === t ? resolveColor('var(--p)') : colors.s, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, marginBottom: 8, borderWidth: 1, borderColor: filterSort === t ? resolveColor('var(--p)') : colors.bd }}>
                    <LocalizedText style={{ color: filterSort === t ? '#fff' : colors.t2, fontWeight: '800', fontSize: 13 }}>{t}</LocalizedText>
                  </TouchableOpacity>
                ))}
              </View>

              <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>اللقب المهني</LocalizedText>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                {['الكل', 'أخصائي', 'استشاري'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setFilterTitle(t)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: filterTitle === t ? resolveColor('var(--p)') : colors.s, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, marginBottom: 8, borderWidth: 1, borderColor: filterTitle === t ? resolveColor('var(--p)') : colors.bd }}>
                    <LocalizedText style={{ color: filterTitle === t ? '#fff' : colors.t2, fontWeight: '800', fontSize: 13 }}>{t}</LocalizedText>
                  </TouchableOpacity>
                ))}
              </View>

              <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>جنس الطبيب</LocalizedText>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                {['الكل', 'طبيب', 'طبيبة'].map(g => (
                  <TouchableOpacity key={g} onPress={() => setFilterGender(g)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: filterGender === g ? resolveColor('var(--p)') : colors.s, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, marginBottom: 8, borderWidth: 1, borderColor: filterGender === g ? resolveColor('var(--p)') : colors.bd }}>
                    <LocalizedText style={{ color: filterGender === g ? '#fff' : colors.t2, fontWeight: '800', fontSize: 13 }}>{g}</LocalizedText>
                  </TouchableOpacity>
                ))}
              </View>

              <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>السعر</LocalizedText>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                {['الكل', 'أقل من 100', '100 - 200', 'أكثر من 200'].map(p => (
                  <TouchableOpacity key={p} onPress={() => setFilterPrice(p)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: filterPrice === p ? resolveColor('var(--p)') : colors.s, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, marginBottom: 8, borderWidth: 1, borderColor: filterPrice === p ? resolveColor('var(--p)') : colors.bd }}>
                    <LocalizedText style={{ color: filterPrice === p ? '#fff' : colors.t2, fontWeight: '800', fontSize: 13 }}>{p}</LocalizedText>
                  </TouchableOpacity>
                ))}
              </View>

              <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.n, marginBottom: 12, textAlign: 'left' }}>المواعيد المتاحة</LocalizedText>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                {['الكل', 'اليوم', 'غداً'].map(a => (
                  <TouchableOpacity key={a} onPress={() => setFilterAvail(a)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: filterAvail === a ? resolveColor('var(--p)') : colors.s, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0, marginBottom: 8, borderWidth: 1, borderColor: filterAvail === a ? resolveColor('var(--p)') : colors.bd }}>
                    <LocalizedText style={{ color: filterAvail === a ? '#fff' : colors.t2, fontWeight: '800', fontSize: 13 }}>{a}</LocalizedText>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={{ backgroundColor: resolveColor('var(--p)'), padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 }} onPress={() => setShowFilter(false)}>
                <LocalizedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>تطبيق الفلاتر</LocalizedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Insurance Modal */}
      <Modal visible={showInsModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bg, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, width: '100%', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              {stepIns === 2 ? (
                <TouchableOpacity onPress={() => setStepIns(1)}>
                  <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 28, color: colors.t3 }}>arrow_back</LocalizedText>
                </TouchableOpacity>
              ) : <View style={{ width: 28 }}/>}
              <LocalizedText style={{ fontSize: 18, fontWeight: '900', color: colors.n }}>
                {stepIns === 1 ? 'اختر شركة التأمين' : 'اختر فئة التأمين'}
              </LocalizedText>
              <TouchableOpacity onPress={() => setShowInsModal(false)}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 28, color: colors.t3 }}>close</LocalizedText>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {stepIns === 1 ? (
                <>
                  <TouchableOpacity
                    onPress={() => { setInsCompany(''); setInsClass(''); setShowInsModal(false); }} style={{ padding: 16, backgroundColor: !insCompany ? resolveColor('var(--p)') : colors.s, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: !insCompany ? resolveColor('var(--p)') : colors.bd }}
                  >
                    <LocalizedText style={{ fontSize: 15, fontWeight: '800', textAlign: 'center', color: !insCompany ? '#fff' : colors.n }}>الكل</LocalizedText>
                  </TouchableOpacity>
                  {insuranceCompanies.map((company: any) => {
                    const companyId = company.id || company._id || company.code;
                    const selected = insCompany === companyId;
                    return <TouchableOpacity
                      key={companyId}
                      onPress={() => { setInsCompany(companyId); setInsClass(''); setStepIns(2); }} style={{ padding: 16, backgroundColor: selected ? resolveColor('var(--p)') : colors.s, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: selected ? resolveColor('var(--p)') : colors.bd }}
                    >
                      <LocalizedText style={{ fontSize: 15, fontWeight: '800', textAlign: 'center', color: selected ? '#fff' : colors.n }}>{pickLocalized(company.name_ar, company.name_en || company.name) || company.code}</LocalizedText>
                    </TouchableOpacity>;
                  })}
                  {insuranceCatalogUnavailable && <LocalizedText style={{ color: colors.t2, textAlign: 'center', padding: 16 }}>كتالوج التأمين غير متاح حالياً. يرجى المحاولة لاحقاً.</LocalizedText>}
                </>
              ) : (
                insuranceNetworks.map((network: any) => {
                  const networkId = network.id || network._id || network.code;
                  const selected = insClass === networkId;
                  return <TouchableOpacity
                    key={networkId}
                    onPress={() => { setInsClass(networkId); setShowInsModal(false); }} style={{ padding: 16, backgroundColor: selected ? resolveColor('var(--p)') : colors.s, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: selected ? resolveColor('var(--p)') : colors.bd }}
                  >
                    <LocalizedText style={{ fontSize: 15, fontWeight: '800', textAlign: 'center', color: selected ? '#fff' : colors.n }}>{pickLocalized(network.name_ar, network.name_en || network.name) || network.code}</LocalizedText>
                  </TouchableOpacity>;
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Onboarding Hologram Modal */}

      <Modal visible={showOnboarding} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(14, 20, 34, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.bg, padding: 24, borderRadius: 24, width: '100%', alignItems: 'center', shadowColor: resolveColor('var(--p)'), shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: resolveColor('var(--ps)'), justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 40 }}>auto_awesome</LocalizedText>
            </View>
            <LocalizedText style={{ fontSize: 22, fontWeight: '900', color: colors.n, marginBottom: 12, textAlign: 'center' }}>
              {lang === 'ar' ? 'أهلاً بك في قسم الاستشارات!' : 'Welcome to Consultations!'}
            </LocalizedText>
            <LocalizedText style={{ fontSize: 14, color: colors.t2, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              {lang === 'ar'
                ? 'الآن يمكنك تصفية الأطباء بسهولة. اختر "في العيادة" أو "أونلاين" أو "استشارة منزلية" ليتم عرض الأطباء المتاحين لتلك الخدمة فوراً.'
                : 'Now you can easily filter doctors. Choose "Clinic", "Online" or "Home Visit" to see available doctors instantly.'}
            </LocalizedText>

            <View style={{ width: '100%' }}>
              {vtOptions.map((v, i) => (
                <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12, backgroundColor: colors.s, padding: 12, borderRadius: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: resolveColor('var(--ps)'), justifyContent: 'center', alignItems: 'center', marginLeft: isRTL ? 12 : 0, marginRight: isRTL ? 0 : 12 }}>
                    <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 20 }}>{v.ic}</LocalizedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.n, textAlign: isRTL ? 'right' : 'left' }}>{v.n}</LocalizedText>
                    <LocalizedText style={{ fontSize: 11, color: colors.t3, textAlign: isRTL ? 'right' : 'left', marginTop: 2 }}>{v.desc}</LocalizedText>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: resolveColor('var(--p)'), width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12 }} onPress={() => setShowOnboarding(false)}
            >
              <LocalizedText style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{lang === 'ar' ? 'ابدأ الآن' : 'Start Now'}</LocalizedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 20, paddingBottom: 120 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, borderWidth: 1 },
  tuneBtn: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#141A2A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  vtBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, marginHorizontal: 4 },
  segmentContainer: { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, marginBottom: 20, width: 220, alignSelf: 'flex-start' },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '700' },
  specBtn: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, marginRight: 10, minWidth: 76 },
  specIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  docCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(20, 26, 42, 0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  badge: {
    paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  docFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderWidth: 0, borderTopWidth: 1 },
  promoCard: { width: 220, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1.5, marginRight: 12 },
  promoIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  promoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }
});
