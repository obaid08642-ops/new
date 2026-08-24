// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Modal, TouchableWithoutFeedback } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, Stop, Line, LinearGradient as SvgGradient } from 'react-native-svg';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';

const { width } = Dimensions.get('window');

// Premium Icons
const StarIcon = () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="2"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></Svg>;
const HospitalIcon = () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5"><Path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></Svg>;
const FilterIcon = () => <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="2.5"><Line x1="4" y1="21" x2="4" y2="14"/><Line x1="4" y1="10" x2="4" y2="3"/><Line x1="12" y1="21" x2="12" y2="12"/><Line x1="12" y1="8" x2="12" y2="3"/><Line x1="20" y1="21" x2="20" y2="16"/><Line x1="20" y1="12" x2="20" y2="3"/><Line x1="1" y1="14" x2="7" y2="14"/><Line x1="9" y1="8" x2="15" y2="8"/><Line x1="17" y1="16" x2="23" y2="16"/></Svg>;

export default function NursingServiceDetails() {
  const router = useRouter();
  const { colors, isDark } = useApp();
  const { serviceId, title, flow, gender, availability, nationality, search } = useLocalSearchParams();
  const [nurses, setNurses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortVisible, setSortVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState('nearest');

  // Pre-Booking Lock (Injection Policy)
  const [lockVisible, setLockVisible] = useState(false);
  const [selectedNurseForLock, setSelectedNurseForLock] = useState<any>(null);

  const fetchNurses = async (sortType: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/home-care/providers?type=${serviceId}&sort=${sortType}&gender=${gender || "any"}&availability=${availability || "any"}&nationality=${nationality || "any"}&search=${search || ""}`);
      setNurses(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNurses(currentSort);
  }, [serviceId]);

  const handleSortChange = (type: string) => {
    setCurrentSort(type);
    setSortVisible(false);
    fetchNurses(type);
  };

  const sortLabel = currentSort === 'nearest' ? 'الأقرب أولاً' : (currentSort === 'highest_rated' ? 'الأعلى تقييماً' : 'الكل');

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />

      <BlurView intensity={80} tint="light" style={styles.glassHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5"><Path d="M9 18l6-6-6-6" /></Svg>
        </TouchableOpacity>
        <LocalizedText style={styles.headerTitle}>{title}</LocalizedText>
      </BlurView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* PREMIUM TOP CARD (No Emojis) */}
        <View style={styles.heroBox}>
          <View style={styles.heroIconWrap}>
             <Svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
          </View>
          <LocalizedText style={styles.heroDesc}>خدمة طبية موثوقة يقدمها طاقم تمريض مرخص وتحت إشراف مباشر من وزارة الصحة.</LocalizedText>
          <View style={styles.heroMeta}>
            <LocalizedText style={styles.heroMetaText}>استجابة فورية</LocalizedText>
            <View style={styles.dot} />
            <LocalizedText style={styles.heroMetaText}>تغطية شاملة</LocalizedText>
          </View>
        </View>

        <View style={styles.listHeaderRow}>
          <LocalizedText style={styles.sectionTitle}>التمريض المتاح للخدمة</LocalizedText>
          {/* FUNCTIONAL SORT BUTTON */}
          <TouchableOpacity activeOpacity={0.7} style={styles.quickFilter} onPress={() => setSortVisible(true)}>
            <LocalizedText style={styles.quickFilterText}>{sortLabel}</LocalizedText>
            <FilterIcon />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#23B5CE" style={{ marginTop: 50 }}/>
        ) : (
          nurses.map((nurse: any) => (
            <View key={nurse.id} style={styles.card}>
              <View style={styles.cardRow}>
                {/* Right: Avatar */}
                <View style={styles.avatarBox}>
                  {nurse.gender === 'female' ? (
                     <Svg width="48" height="48" viewBox="0 0 24 24" fill="#FDECEB" stroke="#F0695C" strokeWidth="1"><Circle cx="12" cy="7" r="4"/><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></Svg>
                  ) : (
                     <Svg width="48" height="48" viewBox="0 0 24 24" fill="#E8F8FA" stroke="#23B5CE" strokeWidth="1"><Circle cx="12" cy="7" r="4"/><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></Svg>
                  )}
                  <View style={[styles.onlineBadge, { backgroundColor: nurse.available_now ? '#10B981' : '#F59E0B' }]} />
                </View>

                {/* Middle: Info */}
                <View style={styles.infoCol}>
                  <LocalizedText style={styles.nurseName}>{nurse.name_ar}</LocalizedText>

                  {/* PROMINENT HOSPITAL NAME */}
                  <View style={styles.hospitalRow}>
                    <HospitalIcon />
                    <LocalizedText style={styles.hospitalText}>{nurse.facility_name || ''}</LocalizedText>
                  </View>

                  {(nurse.rating != null || nurse.distance_km != null) && (
                    <View style={styles.ratingRow}>
                      {nurse.rating != null && (
                        <>
                          <StarIcon />
                          <LocalizedText style={styles.ratingText}>{nurse.rating}</LocalizedText>
                        </>
                      )}
                      {nurse.rating != null && nurse.distance_km != null && <View style={styles.dotGray} />}
                      {nurse.distance_km != null && (
                        <LocalizedText style={styles.distanceText}>يبعد {nurse.distance_km} كم</LocalizedText>
                      )}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.actionRow}>
                {nurse.price != null ? (
                  <LocalizedText style={styles.priceText}>{nurse.price} <LocalizedText style={styles.currency}>ر.س</LocalizedText></LocalizedText>
                ) : (
                  <LocalizedText style={styles.priceText}><LocalizedText style={styles.currency}>يُحدد عند الحجز</LocalizedText></LocalizedText>
                )}

                {/* SELECT BUTTON */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.selectBtn}
                  onPress={() => {
                    // Check if service is injection-related
                    if (serviceId === 'injections' || serviceId === 'iv_drip' || title?.includes('حقن') || title?.includes('وريد')) {
                      setSelectedNurseForLock(nurse.id);
                      setLockVisible(true);
                    } else {
                      router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: nurse.id, flow, serviceId } });
                    }
                  }}
                >
                  <View style={styles.selectBtnGradient}>
                    <LocalizedText style={styles.selectBtnText}>اختيار</LocalizedText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* SORT BOTTOM SHEET WITH DISMISS */}
      <Modal visible={sortVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setSortVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderRow}>
                <TouchableOpacity onPress={() => handleSortChange('any')}>
                  <LocalizedText style={styles.resetText}>إعادة ضبط</LocalizedText>
                </TouchableOpacity>
                <LocalizedText style={styles.modalTitle}>ترتيب الممرضين حسب</LocalizedText>
              </View>

              <TouchableOpacity style={styles.sortOption} onPress={() => handleSortChange('nearest')}>
                <LocalizedText style={[styles.sortOptionText, currentSort === 'nearest' && styles.sortOptionTextActive]} >الأقرب أولاً</LocalizedText>
                {currentSort === 'nearest' && <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="3"><Path d="M20 6L9 17l-5-5"/></Svg>}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.sortOption} onPress={() => handleSortChange('highest_rated')}>
                <LocalizedText style={[styles.sortOptionText, currentSort === 'highest_rated' && styles.sortOptionTextActive]} >الأعلى تقييماً</LocalizedText>
                {currentSort === 'highest_rated' && <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="3"><Path d="M20 6L9 17l-5-5"/></Svg>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSortVisible(false)}>
                <LocalizedText style={styles.closeBtnText}>إغلاق</LocalizedText>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* PRE-BOOKING LOCK MODAL (Injections) */}
      <Modal visible={lockVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><Line x1="12" y1="9" x2="12" y2="13"/><Line x1="12" y1="17" x2="12.01" y2="17"/></Svg>
            </View>
            <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 18, color: '#0F172A', textAlign: 'center', marginBottom: 12 }}>سياسة الحقن والمحاليل الوريدية</LocalizedText>
            <LocalizedText style={{ fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 24 }}>
              لضمان سلامتك، يشترط الممرض رؤية <LocalizedText style={{ color: '#EF4444', fontFamily: 'Cairo-Bold' }}>وصفة طبية معتمدة</LocalizedText> قبل إعطاء أي حقن أو محاليل وريدية. لن يتم تقديم الخدمة بدون وصفة، وقد يتم احتساب رسوم الإلغاء.
            </LocalizedText>

            <View style={{ flexDirection: 'row-reverse', width: '100%', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#23B5CE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                onPress={() => {
                  setLockVisible(false);
                  router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: selectedNurseForLock, flow, serviceId } });
                }}
              >
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>أوافق وأمتلك وصفة</LocalizedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                onPress={() => setLockVisible(false)}
              >
                <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#64748B', fontSize: 15 }}>تراجع</LocalizedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glassHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 60, paddingBottom: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)' },
  backBtn: { position: 'absolute', right: 20, top: 60, padding: 8 },
  headerTitle: { fontFamily: 'Cairo-Bold', fontSize: 18, color: '#1E293B' },
  content: { paddingTop: 120, paddingBottom: 100 },

  heroBox: { marginHorizontal: 20, borderRadius: 24, padding: 28, alignItems: 'center', marginBottom: 28, backgroundColor: '#0F172A', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(56,189,248,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroDesc: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#E2E8F0', textAlign: 'center', marginBottom: 20, lineHeight: 26 },
  heroMeta: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  heroMetaText: { fontFamily: 'Cairo-Medium', fontSize: 13, color: '#fff' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 12 },

  listHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 18, color: '#0F172A' },
  quickFilter: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'transparent', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  quickFilterText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#23B5CE', marginLeft: 8 },

  card: { backgroundColor: 'transparent', marginHorizontal: 20, marginBottom: 20, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatarBox: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginLeft: 16, borderWidth: 1.5, borderColor: '#F1F5F9' },
  onlineBadge: { position: 'absolute', bottom: 2, left: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },

  infoCol: { flex: 1, alignItems: 'flex-end' },
  nurseName: { fontFamily: 'Cairo-Bold', fontSize: 17, color: '#1E293B', marginBottom: 6 },
  hospitalRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, backgroundColor: '#E8F8FA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  hospitalText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#0F766E', marginRight: 6 },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  ratingText: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B', marginRight: 6 },
  dotGray: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  distanceText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#64748B' },

  actionRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  priceText: { fontFamily: 'Cairo-Bold', fontSize: 24, color: '#0F172A' },
  currency: { fontSize: 14, color: '#64748B' },
  selectBtn: { width: 140, height: 48, borderRadius: 16, overflow: 'hidden', shadowColor: '#23B5CE', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  selectBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  selectBtnText: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#fff' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cairo-Bold', fontSize: 20, color: '#0F172A' },
  resetText: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#EF4444' },
  sortOption: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  sortOptionText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#64748B' },
  sortOptionTextActive: { color: '#23B5CE' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  closeBtn: { backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 100, alignItems: 'center', marginTop: 24 },
  closeBtnText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#475569' }
});
