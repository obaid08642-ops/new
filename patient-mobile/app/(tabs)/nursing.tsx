// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Dimensions, ImageBackground, Modal, TouchableWithoutFeedback, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Line, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized, pickDbField } from '../../src/utils/localize';
import { LocalizedText } from '../../src/components/LocalizedText';

const { width } = Dimensions.get('window');

// Premium Vector Icons
const Icons = {
  Search: () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><Circle cx="11" cy="11" r="8"/><Line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>,
  Filter: () => <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={'#1E293B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Line x1="4" y1="21" x2="4" y2="14"/><Line x1="4" y1="10" x2="4" y2="3"/><Line x1="12" y1="21" x2="12" y2="12"/><Line x1="12" y1="8" x2="12" y2="3"/><Line x1="20" y1="21" x2="20" y2="16"/><Line x1="20" y1="12" x2="20" y2="3"/><Line x1="1" y1="14" x2="7" y2="14"/><Line x1="9" y1="8" x2="15" y2="8"/><Line x1="17" y1="16" x2="23" y2="16"/></Svg>,
  Insurance: ({ active }: { active: boolean }) => <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#3b82f6"} strokeWidth="2"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>,
  Cash: ({ active }: { active: boolean }) => <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#10B981"} strokeWidth="2"><Rect x="2" y="6" width="20" height="12" rx="3"/><Circle cx="12" cy="12" r="2"/></Svg>,
  Wound: () => <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F0695C" strokeWidth="2"><Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><Path d="M8 12h8"/><Path d="M12 8v8"/></Svg>,
  IV: () => <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="2"><Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></Svg>,
  Blood: () => <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><Path d="M12 2v20"/><Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Svg>,
  Catheter: () => <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><Path d="M12 20h9"/><Path d="M16.5 14c-3 0-5.5-2.5-5.5-5.5S13.5 3 16.5 3 22 5.5 22 8.5"/><Path d="M12 20V10"/></Svg>
};

export default function NursingDirectoryHub() {
  const router = useRouter();
  const { colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const [paymentFlow, setPaymentFlow] = useState<'insurance'|'cash'>('cash');
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);

  // Filter States
  const [gender, setGender] = useState('any');
  const [availability, setAvailability] = useState('any');
  const [nationality, setNationality] = useState('any');

  const [dbServices, setDbServices] = useState<any[]>([]);
  const [dbPackages, setDbPackages] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/home-care/services')
      .then((rows: any) => setDbServices((Array.isArray(rows) ? rows : []).map((s: any) => ({
        ...s,
        title: pickDbField(s, 'name') || s.name_ar || s.name_en || s.title,
        image: s.image_url || s.image || null,
      }))))
      .catch(console.error);
    apiFetch('/home-care/packages').then((r: any) => setDbPackages(Array.isArray(r) ? r : (r?.data || []))).catch(console.error);
  }, []);

  const getIcon = (id: string) => {
    switch (id) {
      case 'svc-iv': return <Icons.IV />;
      case 'svc-wound': return <Icons.Wound />;
      case 'blood_test': return <Icons.Blood />;
      case 'catheter': return <Icons.Catheter />;
      default: return <Icons.IV />;
    }
  };

  const getColor = (id: string) => {
    switch (id) {
      case 'svc-iv': return '#E8F8FA';
      case 'svc-wound': return '#FDECEB';
      case 'blood_test': return '#F3E8FF';
      case 'catheter': return '#E6F4F0';
      default: return '#F1F5F9';
    }
  };

  const getPackageImage = (id: string, pkg?: any) => {
    // E2: only real images from the catalog — never stock photos
    return pkg?.image || pkg?.image_url || null;
  };

  const applyFiltersAndSearch = () => {
    setFilterVisible(false);
  };

  const resetFilters = () => {
    setGender('any');
    setAvailability('any');
    setNationality('any');
  };

  const navToService = (id: string, title: string) => {
    router.push({
      pathname: '/nursing/service-details',
      params: { serviceId: id, title, flow: paymentFlow, gender, availability, nationality, search }
    });
  };

  // Card tap → service PROFILE (image + full description + احجز الآن)
  const navToServiceInfo = (id: string) => {
    router.push({
      pathname: '/nursing/service-info',
      params: { serviceId: id, flow: paymentFlow, gender, availability, nationality, search }
    });
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>

        {/* PREMIUM SEARCH BAR */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setFilterVisible(true)}>
            <Icons.Filter />
          </TouchableOpacity>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <Icons.Search />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="ابحث عن خدمة أو ممرض..."
              value={search}
              onChangeText={setSearch}
              textAlign="right"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* PAYMENT TOGGLES */}
        <View style={styles.toggleRow}>
          <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('insurance')}>
            <View
              style={[styles.toggleBtn, paymentFlow === 'insurance' && styles.toggleActiveBlue, { borderColor: colors.surface } ]}>
              <Icons.Insurance active={paymentFlow === 'insurance'} />
              <LocalizedText style={[styles.toggleText, paymentFlow === 'insurance' && styles.toggleTextActive]} >تأمين طبي</LocalizedText>
            </View>
          </TouchableOpacity>
          <View style={{ width: 12 }}/>
          <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('cash')}>
            <View
              style={[styles.toggleBtn, paymentFlow === 'cash' && styles.toggleActiveGreen, { borderColor: colors.surface } ]}>
              <Icons.Cash active={paymentFlow === 'cash'} />
              <LocalizedText style={[styles.toggleText, paymentFlow === 'cash' && styles.toggleTextActive]} >بدون تأمين / نقدي</LocalizedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* CONTINUOUS CARE PACKAGES */}
        <View style={styles.sectionHeader}>
          <LocalizedText style={[styles.sectionTitle, { color: colors.textPrimary } ]}>باقات الرعاية المستمرة</LocalizedText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesScroll}>
          {dbPackages.map((pkg) => {
            const pkgImg = getPackageImage(pkg.id, pkg);
            return (
            <TouchableOpacity key={pkg.id} activeOpacity={0.9} onPress={() => navToService(pkg.id, pickLocalized(pkg.name_ar, pkg.title))}>
              {pkgImg ? (
              <ImageBackground source={{ uri: pkgImg }} style={styles.packageCard} imageStyle={{ borderRadius: 24 }}>
                <BlurView intensity={80} tint="dark" style={styles.packageBlur}>
                  <LocalizedText style={styles.packageTitle}>{pickLocalized(pkg.name_ar, pkg.title)}</LocalizedText>
                  <LocalizedText style={styles.packageDesc}>{pkg.type === 'monthly' ? 'باقة شهرية' : pkg.type === 'weekly' ? 'باقة أسبوعية' : (pkg.duration || 'خدمة رعاية')}</LocalizedText>
                </BlurView>
              </ImageBackground>
              ) : (
              <View style={[styles.packageCard, { borderRadius: 24, overflow: 'hidden', backgroundColor: '#0D9488' }]}>
                <View style={[styles.packageBlur, { backgroundColor: 'transparent', justifyContent: 'center', padding: 16 }]}>
                  <LocalizedText style={styles.packageTitle}>{pickLocalized(pkg.name_ar, pkg.title)}</LocalizedText>
                  <LocalizedText style={styles.packageDesc}>{pkg.type === 'monthly' ? 'باقة شهرية' : pkg.type === 'weekly' ? 'باقة أسبوعية' : (pkg.duration || 'خدمة رعاية')}</LocalizedText>
                </View>
              </View>
              )}
            </TouchableOpacity>
            );
          })}
          {dbPackages.length === 0 && (
            <View style={{ paddingVertical: 24, paddingHorizontal: 32, alignItems: 'center' }}>
              <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>لا توجد باقات متاحة حالياً — تابعنا قريباً</LocalizedText>
            </View>
          )}
        </ScrollView>

        {/* SERVICES GRID */}
        <View style={styles.sectionHeader}>
          <LocalizedText style={[styles.sectionTitle, { color: colors.textPrimary } ]}>الرعاية الأساسية والمتقدمة</LocalizedText>
        </View>
        <View style={styles.grid}>
          {dbServices.map((svc) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={svc.id}
              style={[styles.gridItem, { backgroundColor: getColor(svc.id) }]}
              onPress={() => navToServiceInfo(svc.id)}
            >
              <View style={[styles.iconWrapper, svc.image && { overflow: 'hidden', borderRadius: 20, width: 64, height: 64 }]}>
                {svc.image
                  ? <Image source={{ uri: svc.image }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                  : getIcon(svc.id)}
              </View>
              <LocalizedText style={[styles.gridTitle, { color: colors.textPrimary } ]}>{svc.title}</LocalizedText>
              {(pickDbField(svc, 'description')) ? (
                <LocalizedText numberOfLines={2} style={{ fontSize: 10, color: colors.textSecondary || '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 15 }}>{pickDbField(svc, 'description')}</LocalizedText>
              ) : null}
              {svc.price != null && (
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 12, color: '#23B5CE', marginTop: 4 }}>{svc.price} ر.س</LocalizedText>
              )}
              {/* حجز سريع — يتخطى صفحة التفاصيل مباشرة لاختيار الممرض */}
              <TouchableOpacity
                style={styles.quickBookBtn}
                activeOpacity={0.85}
                onPress={() => navToService(svc.id, svc.title)}
              >
                <LocalizedText style={styles.quickBookText}>احجز الآن</LocalizedText>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FILTER BOTTOM SHEET WITH DISMISS ON BACKDROP */}
      <Modal visible={filterVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setFilterVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: colors.surface } ]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

              <View style={styles.modalHeaderRow}>
                <TouchableOpacity onPress={resetFilters}>
                  <LocalizedText style={styles.resetText}>إعادة ضبط</LocalizedText>
                </TouchableOpacity>
                <LocalizedText style={[styles.modalTitle, { color: colors.textPrimary } ]}>خيارات التصفية</LocalizedText>
              </View>

              <LocalizedText style={[styles.filterLabel, { color: colors.textSecondary } ]}>الجنس</LocalizedText>
              <View style={styles.filterOptions}>
                <TouchableOpacity onPress={() => setGender('any')} style={[gender === 'any' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={gender === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</LocalizedText></TouchableOpacity>
                <TouchableOpacity onPress={() => setGender('male')} style={[gender === 'male' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={gender === 'male' ? styles.filterOptionTextActive : styles.filterOptionText}>رجال فقط</LocalizedText></TouchableOpacity>
                <TouchableOpacity onPress={() => setGender('female')} style={[gender === 'female' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={gender === 'female' ? styles.filterOptionTextActive : styles.filterOptionText}>نساء فقط</LocalizedText></TouchableOpacity>
              </View>

              <LocalizedText style={[styles.filterLabel, { color: colors.textSecondary } ]}>التوافر (Availability)</LocalizedText>
              <View style={styles.filterOptions}>
                <TouchableOpacity onPress={() => setAvailability('any')} style={[availability === 'any' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={availability === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</LocalizedText></TouchableOpacity>
                <TouchableOpacity onPress={() => setAvailability('now')} style={[availability === 'now' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={availability === 'now' ? styles.filterOptionTextActive : styles.filterOptionText}>متاح الآن (للطوارئ)</LocalizedText></TouchableOpacity>
              </View>

              <LocalizedText style={[styles.filterLabel, { color: colors.textSecondary } ]}>الجنسية</LocalizedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity onPress={() => setNationality('any')} style={[nationality === 'any' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={nationality === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</LocalizedText></TouchableOpacity>
                  <TouchableOpacity onPress={() => setNationality('saudi')} style={[nationality === 'saudi' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={nationality === 'saudi' ? styles.filterOptionTextActive : styles.filterOptionText}>سعودي</LocalizedText></TouchableOpacity>
                  <TouchableOpacity onPress={() => setNationality('filipino')} style={[nationality === 'filipino' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={nationality === 'filipino' ? styles.filterOptionTextActive : styles.filterOptionText}>فلبيني</LocalizedText></TouchableOpacity>
                  <TouchableOpacity onPress={() => setNationality('egyptian')} style={[nationality === 'egyptian' ? styles.filterOptionActive : styles.filterOption]} ><LocalizedText style={nationality === 'egyptian' ? styles.filterOptionTextActive : styles.filterOptionText}>مصري</LocalizedText></TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.applyBtn} onPress={applyFiltersAndSearch}>
                <LocalizedText style={styles.applyBtnText}>تطبيق الفلاتر</LocalizedText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glassHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 60, paddingBottom: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  backBtn: { position: 'absolute', right: 20, top: 60, padding: 8 },
  headerTitle: { fontFamily: 'Cairo-Bold', fontSize: 18, color: '#1E293B' },
  content: { paddingBottom: 100 },

  searchRow: { flexDirection: 'row-reverse', paddingHorizontal: 20, marginBottom: 28, gap: 12 },
  filterBtn: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  searchBox: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'transparent', borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  searchInput: { flex: 1, fontFamily: 'Cairo-Bold', fontSize: 15, marginRight: 12, height: 56, color: '#1E293B', textAlign: 'right' },

  toggleRow: { flexDirection: 'row-reverse', paddingHorizontal: 20, marginBottom: 32 },
  toggleBtnWrap: { flex: 1 },
  toggleBtn: { padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff', shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  toggleActiveBlue: { backgroundColor: '#2563EB', borderColor: 'transparent', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 },
  toggleShadowBlue: { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6, borderColor: 'transparent' },
  toggleActiveGreen: { backgroundColor: '#059669', borderColor: 'transparent', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 },
  toggleShadowGreen: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6, borderColor: 'transparent' },
  toggleText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#64748B', marginTop: 8 },
  toggleTextActive: { color: '#fff' },

  sectionHeader: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 18, color: '#0F172A', textAlign: 'right' },

  packagesScroll: { paddingHorizontal: 20, marginBottom: 32 },
  packageCard: { width: 280, height: 160, borderRadius: 24, marginRight: 16, overflow: 'hidden', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 5 },
  packageBlur: { flex: 1, padding: 16, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.15)' },
  packageTitle: { fontFamily: 'Cairo-Bold', fontSize: 17, color: '#fff', textAlign: 'right' },
  packageDesc: { fontFamily: 'Cairo-Medium', fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between' },
  gridItem: { width: (width - 56) / 2, padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2, borderWidth: 1.5, borderColor: '#fff' },
  iconWrapper: { marginBottom: 12 },
  gridTitle: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#1E293B', textAlign: 'center' },
  quickBookBtn: { marginTop: 10, backgroundColor: '#23B5CE', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100 },
  quickBookText: { fontFamily: 'Cairo-Bold', fontSize: 12, color: '#fff' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'transparent', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cairo-Bold', fontSize: 20, color: '#0F172A' },
  resetText: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#EF4444' },

  filterLabel: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#475569', textAlign: 'right', marginBottom: 12 },
  filterOptions: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
  filterOption: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterOptionActive: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, backgroundColor: '#23B5CE', borderWidth: 1, borderColor: '#23B5CE' },
  filterOptionText: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#64748B' },
  filterOptionTextActive: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#fff' },

  applyBtn: { backgroundColor: '#1E293B', paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  applyBtnText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#fff' },
});
