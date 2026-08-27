// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Linking, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, I18nManager, Dimensions } from 'react-native';
import { AppText } from '../../../src/components/ui';
import { useApp } from '../../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../../src/utils/api';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';

const { width } = Dimensions.get('window');


export default function OrderDetails() {
  const { colors } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const [kind, setKind] = useState<'lab' | 'radiology' | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // E2 fix: was apiFetch('/orders/mine' + id) — a malformed URL that ALWAYS 404'd,
    // so this screen never loaded (eternal spinner). Try radiology then lab.
    const fetchOrder = async () => {
      try {
        let data: any = null;
        try {
          const res = await apiFetch(`/radiology/bookings/${id}`);
          data = res?.data || res;
          if (data && !data?.message) setKind('radiology');
        } catch { /* try lab */ }
        if (!data || data?.message) {
          const res = await apiFetch(`/labs/bookings/${id}`);
          data = res?.data || res;
          setKind('lab');
        }
        setOrder(data);
      } catch (e) {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, reload]);

  const handleCancel = async () => {
    showLocalizedAlert('إلغاء الطلب', 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'نعم، إلغاء', style: 'destructive', onPress: async () => {
        setCanceling(true);
        try {
          const base = kind === 'radiology' ? '/radiology' : '/labs';
          const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });
          setOrder(response?.data || response || order);
          showLocalizedAlert('تم', 'تم إلغاء الطلب بنجاح');
        } catch (e: any) {
          showLocalizedAlert('تعذر الإلغاء', e?.message || 'حدث خطأ أثناء الإلغاء');
        } finally {
          setCanceling(false);
        }
      }}
    ]);
  };

  const handleDownload = async () => {
    // Never open a raw report/CDN URL supplied in a booking payload. A report is
    // viewed only by its server-owned identifier through the protected report API.
    const reportId = order?.report_id || order?.report?.id || (Array.isArray(order?.reports) && order.reports[0]?.id);
    if (reportId) {
      router.push({ pathname: '/reports/view-report', params: { id: reportId } });
      return;
    }
    showLocalizedAlert('التقرير غير متاح بعد', 'لم يُنشر تقرير آمن قابل للعرض لحسابك حتى الآن.');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 } ]}>
        <Icon name="file-search-outline" size={48} color={colors.textSecondary} />
        <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16 }}>تعذر تحميل الطلب</AppText>
        <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>تحقق من اتصالك ثم حاول مجدداً</AppText>
        <TouchableOpacity onPress={() => { setLoading(true); setKind(null); setOrder(null); setReload(r => r + 1); }} style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 }}>
          <AppText style={{ color: '#fff', fontWeight: 'bold' }}>إعادة المحاولة</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const isRadiology = kind === 'radiology' || order.type === 'radiology' || order.serviceCategory === 'radiology';
  const orderState = order.state || order.status;
  const locationType = order.location_type || (order.type === 'home_visit' ? 'home' : 'facility');

  const LAB_STAGES = [
    { key: 'NEW_REQUEST', label: 'تم الطلب' },
    { key: 'CONFIRMED', label: 'مؤكد' },
    { key: 'PROCESSING', label: 'جاري التحليل' },
    { key: 'REPORTED', label: 'النتائج جاهزة' },
  ];

  const RAD_STAGES = [
    { key: 'PENDING_INSURANCE', label: 'التأمين' },
    { key: 'CONFIRMED', label: 'مؤكد' },
    { key: 'IN_SCANNING', label: 'الفحص' },
    { key: 'REPORT_DRAFT', label: 'التقرير' },
    { key: 'REPORT_READY', label: 'النتيجة' }
  ];

  const STAGES = isRadiology ? RAD_STAGES : LAB_STAGES;

  const normalizedState = isRadiology ? orderState : ({
    PENDING_INSURANCE: 'NEW_REQUEST', WAITING_COPAY: 'NEW_REQUEST', IN_TRANSIT: 'CONFIRMED',
    IN_LAB: 'PROCESSING', SAMPLE_COLLECTED: 'PROCESSING', RESULT_UPLOADED: 'REPORTED',
  } as Record<string, string>)[orderState] || orderState;
  const currentStageIndex = STAGES.findIndex(s => s.key === normalizedState);
  const isCancelled = orderState === 'CANCELLED' || orderState === 'cancelled' || orderState === 'SCAN_ABORTED';
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

        {/* Visit / technician info — shown only with real backend data (no simulated map) */}
        {!isCancelled && orderState !== 'REPORTED' && locationType === 'home' && order.technician && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, overflow: 'hidden' } ]}>
            <View style={[styles.techInfoRow, { borderTopColor: colors.border }]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="account-tie" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14 }}>{order.technician.name}</AppText>
                <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>الممرض المختص{order.technician.eta ? ` — يصل خلال ${order.technician.eta}` : ''}</AppText>
              </View>
              {!!order.technician.phone && (
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#4CAF50' } ]} onPress={() => Linking.openURL(`tel:${order.technician.phone}`)}>
                  <Icon name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Results Section */}
        {(orderState === 'REPORTED' || orderState === 'RESULT_UPLOADED' || orderState === 'REPORT_READY') && (
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
            
            {isRadiology && !!(order?.images_url || order?.dicom_url || order?.report?.images_url) && (
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginBottom: 8, textAlign: 'left' }}>صور الأشعة (DICOM)</AppText>
                <TouchableOpacity
                  onPress={() => Linking.openURL(order.images_url || order.dicom_url || order.report?.images_url).catch(() => showLocalizedAlert('تعذر الفتح', 'تعذر فتح عارض الصور.'))}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.primary}15`, padding: 12, borderRadius: 8 }}>
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
            <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 }}>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleDateString() : (order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—')}</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>النوع</AppText>
            <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13 }}>{locationType === 'home' ? 'زيارة منزلية' : 'زيارة للمختبر'}</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>المبلغ الإجمالي</AppText>
            <AppText style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>{order.total ?? order.total_price ?? '—'} ر.س</AppText>
          </View>
        </Animated.View>

        {/* Cancel Button */}
        {['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'sent', 'in_review'].includes(orderState) && !isCancelled && (
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
  header: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, paddingTop: 60 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  
  progressContainer: { marginTop: 10 },
  progressBarBg: { height: 6, borderRadius: 3, width: '100%', position: 'absolute', top: 6 },
  progressBarFill: { height: 6, borderRadius: 3 },
  stagesRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', marginTop: 16 },
  stageItem: { alignItems: 'center', width: '25%' },
  stageDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', top: -20 },
  
  techInfoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderTopWidth: 1 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  resultsHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  resultCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12 },
  resultDetails: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', marginTop: 8 },

  infoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  
  cancelBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#F44336', borderRadius: 16, backgroundColor: '#FFEBEE' }
});
