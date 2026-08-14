// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Line, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { apiFetch } from '../../src/utils/api';

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
    apiFetch('/home-care/services').then(setDbServices).catch(console.error);
    apiFetch('/home-care/packages').then(setDbPackages).catch(console.error);
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

  const getPackageImage = (id: string) => {
    return id.includes('icu') ? 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500' : 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500';
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

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        
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
              style={[styles.toggleBtn, paymentFlow === 'insurance' && styles.toggleShadowBlue, { borderColor: colors.surface } ]}>
              <Icons.Insurance active={paymentFlow === 'insurance'} />
              <Text style={[styles.toggleText, paymentFlow === 'insurance' && styles.toggleTextActive]} >تأمين طبي</Text>
            </View>
          </TouchableOpacity>
          <View style={{ width: 12 }}/>
          <TouchableOpacity activeOpacity={0.8} style={styles.toggleBtnWrap} onPress={() => setPaymentFlow('cash')}>
            <View
              style={[styles.toggleBtn, paymentFlow === 'cash' && styles.toggleShadowGreen, { borderColor: colors.surface } ]}>
              <Icons.Cash active={paymentFlow === 'cash'} />
              <Text style={[styles.toggleText, paymentFlow === 'cash' && styles.toggleTextActive]} >بدون تأمين / نقدي</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CONTINUOUS CARE PACKAGES */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary } ]}>باقات الرعاية المستمرة</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesScroll}>
          {dbPackages.map((pkg) => (
            <TouchableOpacity key={pkg.id} activeOpacity={0.9} onPress={() => navToService(pkg.id, pkg.title)}>
              <ImageBackground source={{ uri: getPackageImage(pkg.id) }} style={styles.packageCard} imageStyle={{ borderRadius: 24 }}>
                <BlurView intensity={80} tint="dark" style={styles.packageBlur}>
                  <Text style={styles.packageTitle}>{pkg.title}</Text>
                  <Text style={styles.packageDesc}>{pkg.type === 'monthly' ? 'باقة شهرية' : 'باقة أسبوعية'}</Text>
                </BlurView>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SERVICES GRID */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary } ]}>الرعاية الأساسية والمتقدمة</Text>
        </View>
        <View style={styles.grid}>
          {dbServices.map((svc) => (
            <TouchableOpacity 
              activeOpacity={0.7}
              key={svc.id} 
              style={[styles.gridItem, { backgroundColor: getColor(svc.id) }]}
              onPress={() => navToService(svc.id, svc.title)}
            >
              <View style={styles.iconWrapper}>{getIcon(svc.id)}</View>
              <Text style={[styles.gridTitle, { color: colors.textPrimary } ]}>{svc.title}</Text>
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
                  <Text style={styles.resetText}>إعادة ضبط</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.textPrimary } ]}>خيارات التصفية</Text>
              </View>
              
              <Text style={[styles.filterLabel, { color: colors.textSecondary } ]}>الجنس</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity onPress={() => setGender('any')} style={[gender === 'any' ? styles.filterOptionActive : styles.filterOption]} ><Text style={gender === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setGender('male')} style={[gender === 'male' ? styles.filterOptionActive : styles.filterOption]} ><Text style={gender === 'male' ? styles.filterOptionTextActive : styles.filterOptionText}>رجال فقط</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setGender('female')} style={[gender === 'female' ? styles.filterOptionActive : styles.filterOption]} ><Text style={gender === 'female' ? styles.filterOptionTextActive : styles.filterOptionText}>نساء فقط</Text></TouchableOpacity>
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary } ]}>التوافر (Availability)</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity onPress={() => setAvailability('any')} style={[availability === 'any' ? styles.filterOptionActive : styles.filterOption]} ><Text style={availability === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setAvailability('now')} style={[availability === 'now' ? styles.filterOptionActive : styles.filterOption]} ><Text style={availability === 'now' ? styles.filterOptionTextActive : styles.filterOptionText}>متاح الآن (للطوارئ)</Text></TouchableOpacity>
              </View>

              <Text style={[styles.filterLabel, { color: colors.textSecondary } ]}>الجنسية</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
                <View style={styles.filterOptions}>
                  <TouchableOpacity onPress={() => setNationality('any')} style={[nationality === 'any' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'any' ? styles.filterOptionTextActive : styles.filterOptionText}>الكل</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setNationality('saudi')} style={[nationality === 'saudi' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'saudi' ? styles.filterOptionTextActive : styles.filterOptionText}>سعودي</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setNationality('filipino')} style={[nationality === 'filipino' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'filipino' ? styles.filterOptionTextActive : styles.filterOptionText}>فلبيني</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setNationality('egyptian')} style={[nationality === 'egyptian' ? styles.filterOptionActive : styles.filterOption]} ><Text style={nationality === 'egyptian' ? styles.filterOptionTextActive : styles.filterOptionText}>مصري</Text></TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.applyBtn} onPress={applyFiltersAndSearch}>
                <Text style={styles.applyBtnText}>تطبيق الفلاتر</Text>
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
  toggleShadowBlue: { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6, borderColor: 'transparent' },
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
