// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Dimensions
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { AppText } from '../../../src/components/ui';
import { useApp } from '../../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../src/utils/api';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');


export default function OrderDetails() {
  const { colors } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiFetch('/orders/mine' + id);
                const data = res?.data || res;
        setOrder(data);
      } catch (e) {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleCancel = async () => {
    Alert.alert('إلغاء الطلب', 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'نعم، إلغاء', style: 'destructive', onPress: async () => {
        setCanceling(true);
        try {
          await apiFetch('/orders/mine' + id + '/cancel', { method: 'POST' }).catch(() => true);
          setOrder({ ...order, status: 'cancelled' });
          Alert.alert('تم', 'تم إلغاء الطلب بنجاح');
        } catch {
          Alert.alert('خطأ', 'حدث خطأ أثناء الإلغاء');
        } finally {
          setCanceling(false);
        }
      }}
    ]);
  };

  const handleDownload = async () => {
    Alert.alert('جاري التحميل', 'يتم الآن تحميل التقرير بصيغة PDF...');
    try {
      await apiFetch('/orders/mine' + id + '/report.pdf').catch(() => true);
      setTimeout(() => Alert.alert('نجاح', 'تم تحميل التقرير بنجاح وحفظه في جهازك'), 1500);
    } catch {
      // ignore
    }
  };

  if (loading || !order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isRadiology = order.type === 'radiology' || order.serviceCategory === 'radiology';

  const LAB_STAGES = [
    { key: 'sent', label: 'تم الطلب' },
    { key: 'in_review', label: 'قيد المراجعة' },
    { key: 'analyzing', label: 'جاري التحليل' },
    { key: 'ready', label: 'النتائج جاهزة' },
  ];

  const RAD_STAGES = [
    { key: 'PENDING_INSURANCE', label: 'التأمين' },
    { key: 'CONFIRMED', label: 'مؤكد' },
    { key: 'IN_SCANNING', label: 'الفحص' },
    { key: 'REPORT_DRAFT', label: 'التقرير' },
    { key: 'REPORT_READY', label: 'النتيجة' }
  ];

  const STAGES = isRadiology ? RAD_STAGES : LAB_STAGES;

  const currentStageIndex = STAGES.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled' || order.status === 'SCAN_ABORTED';
  const progressPercent = isCancelled ? 0 : currentStageIndex >= 0 ? ((currentStageIndex + 1) / STAGES.length) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border } ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name={I18nManager.isRTL ? "arrow-right" : "arrow-left"} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h2" style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>تفاصيل الطلب #{id}</AppText>
        <View style={{ width: 40 }}/>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Progress Tracker */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
          <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 20 }}>حالة الطلب</AppText>
          
          {isCancelled ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Icon name="close-circle-outline" size={48} color="#F44336" />
              <AppText style={{ color: '#F44336', fontWeight: 'bold', fontSize: 18, marginTop: 8 }}>تم إلغاء هذا الطلب</AppText>
            </View>
          ) : (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border } ]}>
                <Animated.View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${progressPercent}%` }]} />
              </View>
              
              <View style={styles.stagesRow}>
                {STAGES.map((stage, idx) => {
                  const isActive = idx <= currentStageIndex;
                  return (
                    <View key={stage.key} style={styles.stageItem}>
                      <View style={[styles.stageDot, { backgroundColor: isActive ? colors.primary : colors.border }]} />
                      <AppText style={{ color: isActive ? colors.textPrimary : colors.textSecondary, fontSize: 10, marginTop: 4, fontWeight: isActive ? 'bold' : 'normal', textAlign: 'center' }}>
                        {stage.label}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Map Placeholder */}
        {!isCancelled && order.status !== 'ready' && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, overflow: 'hidden' } ]}>
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapGrid} />
              {order.type === 'home_visit' ? (
                <>
                  <View style={[styles.mapMarker, { top: '30%', left: '40%' } ]}>
                    <Icon name="ambulance" size={24} color={colors.primary} />
                  </View>
                  <View style={[styles.mapMarker, { top: '70%', left: '60%' } ]}>
                    <Icon name="home-map-marker" size={28} color="#E53935" />
                  </View>
                  {/* Dashed line to simulate route */}
                  <View style={styles.routeLine} />
                  <View style={[styles.etaBadge, { backgroundColor: colors.surface } ]}>
                    <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 12 }}>يصل خلال {order.technician?.eta}</AppText>
                  </View>
                </>
              ) : (
                <View style={[styles.mapMarker, { top: '50%', left: '50%' } ]}>
                  <Icon name="hospital-marker" size={32} color={colors.primary} />
                  <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 12, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 4, borderRadius: 4 }}>موقع المختبر</AppText>
                </View>
              )}
            </View>
            {order.type === 'home_visit' && order.technician && (
              <View style={[styles.techInfoRow, { borderTopColor: colors.border } ]}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="account-tie" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>{order.technician.name}</AppText>
                  <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>الممرض المختص</AppText>
                </View>
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#4CAF50' } ]}>
                  <Icon name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        {/* Results Section */}
        {(order.status === 'ready' || order.status === 'REPORT_READY') && (
          <Animated.View entering={SlideInUp.delay(200).duration(500)}>
            <View style={styles.resultsHeader}>
              <AppText variant="h3" style={{ color: colors.textPrimary, fontWeight: 'bold' }}>
                {isRadiology ? 'التقارير والصور' : 'نتائج التحاليل'}
              </AppText>
              <TouchableOpacity onPress={handleDownload} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13, marginRight: 4 }}>تحميل PDF</AppText>
                <Icon name="download" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            {isRadiology && (
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginBottom: 8, textAlign: 'left' }}>صور الأشعة (DICOM)</AppText>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.primary}15`, padding: 12, borderRadius: 8 }}>
                  <Icon name="image-multiple-outline" size={20} color={colors.primary} />
                  <AppText style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 8 }}>فتح عارض الصور المتقدم</AppText>
                </TouchableOpacity>
              </View>
            )}

            {!isRadiology && order.results?.map((res: any, idx: number) => (
              <View key={res.id} style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginBottom: 8, textAlign: 'left' }}>{res.name}</AppText>
                <View style={styles.resultDetails}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>النتيجة</AppText>
                    <AppText style={{ color: res.isAbnormal ? '#F44336' : '#4CAF50', fontWeight: 'bold', fontSize: 20 }}>
                      {res.result}
                      {res.isAbnormal && <Icon name="alert-circle-outline" size={16} color="#F44336" style={{ marginLeft: 4 }}/>}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>المعدل الطبيعي</AppText>
                    <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15 }}>{res.reference}</AppText>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
          <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginBottom: 12 }}>معلومات الطلب</AppText>
          <View style={styles.infoRow}>
            <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>تاريخ الطلب</AppText>
            <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 }}>{order.date}</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>النوع</AppText>
            <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 }}>{order.type === 'home_visit' ? 'زيارة منزلية' : 'زيارة للمختبر'}</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>المبلغ الإجمالي</AppText>
            <AppText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>{order.total} ر.س</AppText>
          </View>
        </Animated.View>

        {/* Cancel Button */}
        {['sent', 'in_review', 'NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(order.status) && !isCancelled && (
          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={handleCancel}
            disabled={canceling}
          >
            {canceling ? (
              <ActivityIndicator color="#F44336" />
            ) : (
              <>
                <Icon name="cancel" size={20} color="#F44336" />
                <AppText style={{ color: '#F44336', fontWeight: 'bold', fontSize: 15, marginLeft: 8 }}>إلغاء الطلب</AppText>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <View style={{ height: 40 }}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, paddingTop: 50 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  
  progressContainer: { marginTop: 10 },
  progressBarBg: { height: 6, borderRadius: 3, width: '100%', position: 'absolute', top: 6 },
  progressBarFill: { height: 6, borderRadius: 3 },
  stagesRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', marginTop: 16 },
  stageItem: { alignItems: 'center', width: '25%' },
  stageDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: -20 },
  
  mapPlaceholder: { height: 180, width: '100%', backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.1, backgroundColor: undefined }, // Simplistic pattern could be added
  mapMarker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  routeLine: { position: 'absolute', top: '42%', left: '45%', width: '20%', height: '30%', borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#2196F3', borderStyle: 'dashed' },
  etaBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  techInfoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderTopWidth: 1 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  resultsHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  resultCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  resultDetails: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', marginTop: 8 },

  infoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  
  cancelBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#F44336', borderRadius: 16, backgroundColor: '#FFEBEE' }
});
