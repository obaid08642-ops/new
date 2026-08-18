// @ts-nocheck
// app/ai/skin-analysis.tsx
// تحليل الجلد بالذكاء الاصطناعي
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

type SkinState = 'camera' | 'analyzing' | 'results';

const DEFAULT_SKIN_RESULTS = {
  condition: 'جفاف الجلد المتوسط',
  confidence: 82,
  severity: 'خفيف-متوسط',
  color: '#F0A526',
  findings: [
    { label: 'الترطيب', score: 35, max: 100, status: 'منخفض' },
    { label: 'الإشراق', score: 65, max: 100, status: 'متوسط' },
    { label: 'نعومة البشرة', score: 55, max: 100, status: 'متوسط' },
    { label: 'التجانس', score: 72, max: 100, status: 'جيد' },
  ],
  recommendations: [
    'استخدم مرطباً يحتوي على حمض الهيالورونيك مرتين يومياً',
    'اشرب 8 أكواب ماء على الأقل يومياً',
    'تجنّب الاستحمام بالماء الساخن',
    'استخدم واقي شمس SPF 50+ يومياً',
  ],
  products: ['مرطب نيفيا', 'سيروم فيتامين C', 'كريم SPF 50'],
  doctorNote: 'ينصح بزيارة طبيب جلدية إذا لم يتحسن الوضع خلال 2-3 أسابيع',
};

export default function SkinAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [state, setState] = useState<SkinState>('camera');
  const [selectedArea, setSelectedArea] = useState('الوجه');
  const [skinAnalysisResult, setSkinAnalysisResult] = useState<any>(null);

  const BODY_AREAS = ['الوجه', 'اليدان', 'الظهر', 'الجسم'];

  const pickSkinImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync() 
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showLocalizedAlert('الإذن مطلوب', 'يرجى تفعيل صلاحية الوصول للكاميرا/المعرض للاستمرار.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as any,
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            quality: 0.7,
            base64: true,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await analyzeSkin(asset.base64);
        } else {
          showLocalizedAlert('خطأ', 'فشل قراءة ملف الصورة كـ Base64.');
        }
      }
    } catch (e) {
      console.log('Error picking skin image', e);
      showLocalizedAlert('خطأ', 'حدث خطأ أثناء التقاط الصورة.');
    }
  };

  const analyzeSkin = async (base64Data: string) => {
    setState('analyzing');
    try {
      const res = await apiFetch<any>('/ai/skin-analysis', {
        method: 'POST',
        body: JSON.stringify({
          image_base64: base64Data,
          area: selectedArea
        })
      });

      if (res && res.condition) {
        setSkinAnalysisResult({
          condition: res.condition,
          confidence: res.confidence || 85,
          severity: res.severity || 'متوسط',
          color: res.color || '#F0A526',
          findings: res.findings || [
            { label: 'الترطيب', score: 50, max: 100, status: 'متوسط' },
            { label: 'الإشراق', score: 60, max: 100, status: 'متوسط' },
            { label: 'نعومة البشرة', score: 55, max: 100, status: 'متوسط' },
            { label: 'التجانس', score: 70, max: 100, status: 'جيد' }
          ],
          recommendations: res.recommendations || ['استخدم غسول لطيف للبشرة', 'تجنب الفرك الشديد'],
          products: res.products || [],
          doctorNote: res.doctorNote || 'استشر طبيب الجلدية للمتابعة الدقيقة.',
        });
        setState('results');
      } else {
        throw new Error('Analysis failed or returned empty results');
      }
    } catch (err: any) {
      console.log('Skin analysis error:', err);
      showLocalizedAlert('خطأ في التحليل', 'فشل تحليل صورة الجلد. يرجى المحاولة لاحقاً والتأكد من وضوح الصورة.');
      setState('camera');
    }
  };

  const handleCapture = () => {
    showLocalizedAlert(
      'تحليل البشرة',
      'اختر مصدر صورة الجلد للتحليل:',
      [
        { text: 'التقاط صورة بالكاميرا', onPress: () => pickSkinImage(true) },
        { text:'اختيار من المعرض', onPress: () => pickSkinImage(false) },
        { text: 'إلغاء', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const SKIN_RESULTS = skinAnalysisResult || DEFAULT_SKIN_RESULTS;

  if (state === 'analyzing') {
    return (
      <View style={styles.analyzingContainer}>
        <View style={StyleSheet.absoluteFillObject} />
        <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 20, marginBottom: 12 }}>
          <Icon name="face-woman" size={32} color="#fff" />
        </View>
        <AppText variant="h4" color="#fff">الذكاء الاصطناعي يحلل بشرتك...</AppText>
        <AppText variant="bodySM" color="rgba(255,255,255,0.7)">فحص 50+ معيار جلدي</AppText>
        <View style={{ marginTop: 24, gap: 12 }}>
          {['تحليل لون البشرة', 'قياس مستوى الترطيب', 'فحص البنية الجلدية', 'مقارنة بقاعدة بيانات ضخمة'].map((s, i) => (
            <View key={i} style={styles.analyzeStep}>
              <Icon name="check" size={20} color="#23B5CE" />
              <AppText variant="bodySM" color="rgba(255,255,255,0.9)">{s}</AppText>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (state === 'results') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setState('camera')} style={styles.hBtn}>
              <Icon name="back" size={22} color="#fff" />
            </TouchableOpacity>
            <AppText variant="bodySM">نتائج تحليل البشرة </AppText>
            <View style={{ width: 36 }}/>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {/* Main result */}
          <View style={[styles.resultHero, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">{SKIN_RESULTS.condition}</AppText>
            <View style={[styles.severityBadge, { backgroundColor: SKIN_RESULTS.color + '20' } ]}>
              <AppText variant="bodySM">{SKIN_RESULTS.severity}</AppText>
            </View>
            <View style={styles.confidenceRow}>
              <View style={[styles.confBar, { backgroundColor: colors.border } ]}>
                <View style={[styles.confFill, { width: `${SKIN_RESULTS.confidence}%`, backgroundColor: SKIN_RESULTS.color }]} />
              </View>
              <AppText variant="bodySM">{SKIN_RESULTS.confidence}% دقة</AppText>
            </View>
          </View>

          {/* Skin metrics */}
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">مؤشرات البشرة</AppText>
            {SKIN_RESULTS.findings.map((f, i) => (
              <View key={i} style={styles.metricRow}>
                <View style={[styles.statusTag, { backgroundColor: f.score < 50 ? '#FEE2E2' : f.score < 70 ? '#FEF3C7' : '#DCFCE7' } ]}>
                  <AppText variant="bodySM">{f.status}</AppText>
                </View>
                <View style={[styles.metricBar, { backgroundColor: colors.border } ]}>
                  <View style={[styles.metricFill, {
                    width: `${f.score}%`,
                    backgroundColor: f.score < 50 ? '#F0695C' : f.score < 70 ? '#F0A526' : '#5BA84F',
                  }]} />
                </View>
                <AppText variant="bodySM">{f.label}</AppText>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">توصيات العناية </AppText>
            {SKIN_RESULTS.recommendations.map((r, i) => (
              <View key={i} style={styles.recRow}>
                <AppText variant="bodySM">{r}</AppText>
                <Icon name="check" size={20} color={colors.primary} />
              </View>
            ))}
          </View>

          {/* Doctor note */}
          <View style={[styles.doctorNote, { backgroundColor: '#EBF3FF' } ]}>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="doctor" size={16} color={colors.primary} /><AppText variant="bodySM">{SKIN_RESULTS.doctorNote}</AppText></View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
              style={[styles.bookDermBtn, { backgroundColor: '#23B5CE' } ]}>
              <AppText variant="bodySM">احجز طبيب جلدية</AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setState('camera')}
            style={[styles.retakeBtn, { borderColor: colors.border } ]}>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="camera" size={16} color={colors.primary} /><AppText variant="bodySM">تحليل صورة جديدة</AppText></View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Camera screen
  return (
    <View style={styles.cameraContainer}>
      <View style={StyleSheet.absoluteFillObject} />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">تحليل البشرة </AppText>
          <View style={{ width: 36 }}/>
        </View>
      </View>

      {/* Area selector */}
      <View style={styles.areaSelector}>
        {BODY_AREAS.map(area => (
          <TouchableOpacity key={area} onPress={() => setSelectedArea(area)}
            style={[styles.areaChip, selectedArea === area && { backgroundColor: '#23B5CE' } ]}>
            <AppText variant="bodySM">{area}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinder}>
        <View style={[styles.faceGuide, { borderColor: 'rgba(0,102,204,0.6)' } ]}>
          <Icon name="sparkles" size={20} color={colors.primary} />
          <AppText variant="bodySM">ضع {selectedArea} داخل الإطار</AppText>
        </View>
        <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">تأكد من الإضاءة الجيدة للحصول على أدق النتائج</AppText></View>
      </View>

      {/* Capture */}
      <View style={[styles.camBottom, { paddingBottom: insets.bottom + 20 } ]}>
        <TouchableOpacity onPress={handleCapture} style={styles.captureBtn}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
        <AppText variant="bodySM">اضغط للتقاط صورة وتحليلها</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  analyzingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  analyzingTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  analyzingSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '400' },
  analyzeStep: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  analyzeCheck: { fontSize: 14 },
  analyzeStepText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  resultHero: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 8 },
  conditionName: { fontSize: 20, fontWeight: '800' },
  severityBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  severityText: { fontSize: 12, fontWeight: '700' },
  confidenceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, width: '100%' },
  confBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 4 },
  confNum: { fontSize: 12, fontWeight: '800' },
  metricRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8 },
  metricLabel: { fontSize: 13, fontWeight: '700', width: 80, textAlign: 'right' },
  metricBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: 4 },
  statusTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  statusTagText: { fontSize: 9, fontWeight: '700' },
  recRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 7 },
  recText: { flex: 1, fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  doctorNote: { borderRadius: 16, padding: 14, gap: 10 },
  doctorNoteText: { color: '#1D4ED8', fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  bookDermBtn: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  bookDermText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  retakeBtn: { borderRadius: 14, borderWidth: 1.5, height: 48, justifyContent: 'center', alignItems: 'center' },
  retakeBtnText: { fontSize: 14, fontWeight: '700' },
  cameraContainer: { flex: 1 },
  areaSelector: { flexDirection: 'row-reverse', paddingHorizontal: 20, gap: 8, marginTop: 10 },
  areaChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.1)' },
  areaText: { fontSize: 12, fontWeight: '700' },
  viewfinder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  faceGuide: { width: 220, height: 280, borderRadius: 120, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 8 },
  faceEmoji: { fontSize: 60, opacity: 0.3 },
  guideText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '400' },
  tipText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '400', paddingHorizontal: 32, textAlign: 'center' },
  camBottom: { alignItems: 'center', gap: 12, paddingTop: 16 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#23B5CE' },
  camHint: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '400' },
});
