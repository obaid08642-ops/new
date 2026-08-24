// @ts-nocheck
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, Stack } from 'expo-router';
import Animated, { FadeInDown, SlideInUp, ZoomIn, FadeIn } from 'react-native-reanimated';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const { width } = Dimensions.get('window');

// Backend labs for matching will be fetched

export default function InsuranceUpload() {
  const router = useRouter();
  const { colors } = useApp();
  const { items, setPrescriptionUrl, setPaymentType } = useDiagnosticsCart();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showInsPicker, setShowInsPicker] = useState(false);

  const [uploadedImg, setUploadedImg] = useState<string | null>(null);

  // Auto-fill from Auth Profile
  const [selCompany, setSelCompany] = useState<string>('');
  const [selClass, setSelClass] = useState<string>('');

  const [visitType, setVisitType] = useState<'clinic' | 'home'>('clinic');
  const [selLab, setSelLab] = useState<string | null>(null);
  const [nearbyLabs, setNearbyLabs] = useState<any[]>([]);
  const [ocrItems, setOcrItems] = useState<string[] | null>(null);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  const [insuranceCatalogUnavailable, setInsuranceCatalogUnavailable] = useState(false);

  React.useEffect(() => {
    const fetchLabs = async () => {
      try {
        const res = await apiFetch('/providers?type=lab');
        setNearbyLabs(Array.isArray(res) ? res : res?.data || []);
      } catch (e) {
        console.log('Error fetching labs', e);
      }
    };
    const fetchCompanies = async () => {
      try {
        const res = await apiFetch('/insurance/companies');
        const list = Array.isArray(res) ? res : res?.data || [];
        setCompanies(list);
        setInsuranceCatalogUnavailable(list.length === 0);
      } catch (e) {
        console.log('Error fetching insurance companies', e);
        setCompanies([]);
        setInsuranceCatalogUnavailable(true);
      }
    };
    fetchLabs();
    fetchCompanies();
  }, []);

  React.useEffect(() => {
    if (!selCompany) { setNetworks([]); return; }
    (async () => {
      try {
        const res = await apiFetch(`/insurance/companies/${selCompany}/networks`);
        setNetworks(Array.isArray(res) ? res : res?.data || []);
      } catch {
        setNetworks([]);
      }
    })();
  }, [selCompany]);

  const activeCompany = companies.find(c => c.id === selCompany || c.code === selCompany);
  const activeClass = networks.find(c => c.id === selClass || c.code === selClass);

  const handlePick = async (source: 'camera' | 'gallery') => {
    setShowBottomSheet(false);

    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showLocalizedAlert('عذراً', 'نحتاج إلى صلاحية الوصول للكاميرا.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showLocalizedAlert('عذراً', 'نحتاج إلى صلاحية الوصول لمعرض الصور.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setUploadedImg(asset.uri);
      setStep(2);

      // EPIC4/S21: REAL OCR via the AI gateway — the old code faked a 3s
      // "AI processing" then displayed hardcoded tests (CBC, Vitamin D).
      setOcrItems(null);
      setOcrFailed(false);
      try {
        const res = await apiFetch('/ai/ocr-translate', {
          method: 'POST',
          body: JSON.stringify({ image_base64: asset.base64 || '', target_lang: 'ar' }),
        });
        const items = Array.isArray(res?.items) ? res.items : [];
        const names = items
          .map((it: any) => it?.raw_name_string)
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0);
        if (names.length > 0) {
          setOcrItems(names);
        } else {
          setOcrFailed(true);
        }
      } catch (e) {
        console.error(e);
        setOcrFailed(true);
      } finally {
        setStep(3);
      }
    }
  };

  const getFilteredLabs = () => {
    return nearbyLabs.filter(lab => {
      if (visitType === 'home' && !lab.providesHome && !lab.home_visit_enabled) return false;
      return true;
    }).slice(0, visitType === 'home' ? 2 : 3);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
        <View style={{ width: 40 }}/>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>التأمين والوصفة الطبية</AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {step === 1 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.uploadSection}>
            <AppText style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 24 }}>
              ارفع صورة الوصفة الطبية (أو التوصية الطبية من الطبيب) / موافقة طبية لمعرفة التغطية التأمينية.
            </AppText>

            <TouchableOpacity
              style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}
              onPress={() => setShowBottomSheet(true)}
            >
              <View style={[styles.uploadIconWrap, { backgroundColor: `${colors.primary}15` }]} >
                <Icon name="camera-plus" size={40} color={colors.primary} />
              </View>
              <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16 }}>التقط أو ارفع الصورة</AppText>
            </TouchableOpacity>

            <View style={{ marginTop: 40, padding: 20, backgroundColor: `${colors.secondary}10`, borderRadius: 16, alignItems: 'center' }}>
              <AppText style={{ color: colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>ليس لديك توصية طبية؟ اطلب استشارة الآن</AppText>
              <TouchableOpacity
                style={[styles.consultBtn, { backgroundColor: colors.secondary }]}
                onPress={() => (router.push as any)('/consultations')}
              >
                <AppText style={{ color: '#fff', fontWeight: 'bold' }}>تحدث مع طبيب عام</AppText>
                <Icon name="stethoscope" size={20} color="#fff" style={{ marginLeft: 8 }}/>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={ZoomIn.duration(400)} style={styles.analyzingSection}>
            <View style={[styles.pulseCircle, { borderColor: colors.primary } ]}>
              <Icon name="brain" size={48} color={colors.primary} />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginTop: 24 }}>جاري تحليل الوصفة...</AppText>
            <AppText style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>يتم الآن استخراج التحاليل من الصورة المرفوعة</AppText>
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(400)}>

            {/* AI Results */}
            <View style={styles.section}>
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <AppText variant="h3" color={colors.textPrimary}>نتيجة قراءة الوصفة</AppText>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <AppText style={{ color: colors.primary, fontSize: 14 }}>إعادة الرفع</AppText>
                </TouchableOpacity>
              </View>

              <View style={[styles.extractedBox, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', marginBottom: 16 }}>
                  <View style={{ width: 60, height: 80, backgroundColor: '#eee', borderRadius: 8, overflow: 'hidden' }}>
                    {uploadedImg && <Image source={{ uri: uploadedImg }} style={{ width: '100%', height: '100%' }} />}
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 12, justifyContent: 'center' }}>
                    <AppText style={{ fontSize: 13, color: colors.textSecondary, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>تم إرفاق صورة الوصفة بنجاح. سيتم إرسالها لـ (المختبر المختار) لمطابقتها مع التأمين.</AppText>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12 }}/>
                {Array.isArray(ocrItems) && ocrItems.length > 0 ? (
                  <>
                    <AppText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>
                      قرأنا من الصورة (تحقق قبل الإرسال):
                    </AppText>
                    {ocrItems.map((name, i) => (
                      <View key={i} style={styles.extractedItem}>
                        <Icon name="check-circle" size={18} color="#4CAF50" />
                        <AppText style={{ fontWeight: 'bold', marginLeft: 8 }}>{name}</AppText>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={styles.extractedItem}>
                    <Icon name="information" size={18} color={colors.textSecondary} />
                    <AppText style={{ color: colors.textSecondary, marginLeft: 8, flex: 1, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>
                      تعذر استخراج الفحوصات تلقائياً من الصورة — سيقوم المختبر بقراءة الوصفة ومطابقتها مع تأمينك يدوياً.
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {/* Insurance details from profile */}
            <View style={styles.section}>
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <AppText variant="h3" color={colors.textPrimary}>بيانات التأمين</AppText>
              </View>
              <TouchableOpacity
                style={[styles.dropdownBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowInsPicker(!showInsPicker)}
              >
                <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
                  <Icon name="shield-check" size={24} color={colors.primary} style={{ marginRight: I18nManager.isRTL ? 0 : 8, marginLeft: I18nManager.isRTL ? 8 : 0 }}/>
                  <AppText style={{ fontSize: 15, fontWeight: 'bold', color: colors.textPrimary }}>{activeCompany ? `${pickLocalized(activeCompany?.name_ar, activeCompany?.name)}${activeClass ? ` - ${activeClass.name_ar || activeClass.name || activeClass.code}` : ''}` : 'اختر شركة التأمين والشبكة'}</AppText>
                </View>
                <AppText style={{ fontSize: 12, color: colors.primary }}>تغيير</AppText>
              </TouchableOpacity>

              {showInsPicker && (
                <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginTop: 8, padding: 12 }}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                    {companies.map(c => (
                      <TouchableOpacity
                        key={c.id || c.code}
                        style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setSelCompany(c.id || c.code); setSelClass(''); }}
                      >
                        <AppText style={{ color: selCompany === (c.id || c.code) ? colors.primary : colors.textPrimary }}>{pickLocalized(c.name_ar, c.name)}</AppText>
                      </TouchableOpacity>
                    ))}
                    {selCompany !== '' && networks.map(network => (
                      <TouchableOpacity
                        key={network.id || network.code}
                        style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={() => { setSelClass(network.id || network.code); setShowInsPicker(false); }}
                      >
                        <AppText style={{ color: selClass === (network.id || network.code) ? colors.primary : colors.textPrimary }}>— {network.name_ar || network.name || network.code}</AppText>
                      </TouchableOpacity>
                    ))}
                    {insuranceCatalogUnavailable && <AppText style={{ color: colors.textSecondary, paddingVertical: 8 }}>كتالوج التأمين غير متاح حالياً. يرجى إعادة المحاولة لاحقاً.</AppText>}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Visit Type */}
            <View style={styles.section}>
              <AppText variant="h3" color={colors.textPrimary} style={{ marginBottom: 12, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>نوع الخدمة المفضل</AppText>
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.visitTypeBtn, { borderColor: visitType === 'clinic' ? colors.primary : colors.border, backgroundColor: visitType === 'clinic' ? `${colors.primary}10` : colors.surface }]}
                  onPress={() => { setVisitType('clinic'); setSelLab(null); }}
                >
                  <Icon name="hospital-building" size={24} color={visitType === 'clinic' ? colors.primary : colors.textSecondary} />
                  <AppText style={{ color: visitType === 'clinic' ? colors.primary : colors.textSecondary, marginTop: 8, fontWeight: visitType === 'clinic' ? 'bold' : 'normal' }}>زيارة للمختبر</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.visitTypeBtn, { borderColor: visitType === 'home' ? colors.primary : colors.border, backgroundColor: visitType === 'home' ? `${colors.primary}10` : colors.surface }]}
                  onPress={() => { setVisitType('home'); setSelLab(null); }}
                >
                  <Icon name="home-plus" size={24} color={visitType === 'home' ? colors.primary : colors.textSecondary} />
                  <AppText style={{ color: visitType === 'home' ? colors.primary : colors.textSecondary, marginTop: 8, fontWeight: visitType === 'home' ? 'bold' : 'normal' }}>سحب منزلي</AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Nearby Labs */}
            <View style={styles.section}>
              <AppText variant="h3" color={colors.textPrimary} style={{ marginBottom: 12, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>المختبرات الأقرب التي تقبل تأمينك</AppText>
              {getFilteredLabs().map(lab => (
                <TouchableOpacity
                  key={lab.id}
                  style={[styles.labCard, { borderColor: selLab === lab.id ? colors.primary : colors.border, backgroundColor: selLab === lab.id ? `${colors.primary}05` : colors.surface }]}
                  onPress={() => setSelLab(lab.id)}
                >
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: 'bold', fontSize: 16, color: colors.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{lab.name}</AppText>
                    <AppText style={{ color: colors.textSecondary, marginTop: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>يبعد {lab.distance} • تقييم {lab.rating}</AppText>
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: selLab === lab.id ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    {selLab === lab.id && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }}/>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

          </Animated.View>
        )}

        <View style={{ height: 120 }}/>
      </ScrollView>

      {/* Floating Bottom */}
      {step === 3 && selLab && (
        <Animated.View entering={SlideInUp.duration(400)} style={[styles.floatingBottom, { backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={async () => {
              setPaymentType('insurance');
              if (uploadedImg) setPrescriptionUrl(uploadedImg);

              const selectedLabData = nearbyLabs.find(l => l.id === selLab);

              try {
                const orderData = {
                  status: 'PENDING_INSURANCE_APPROVAL',
                  visitType,
                  providerId: selLab,
                  cartItems: items,
                  totalAmount: 0
                };
                const res = await apiFetch('/orders/create', {
                  method: 'POST',
                  body: JSON.stringify(orderData)
                });

                (router.push as any)({
                  pathname: '/diagnostics/insurance-approval',
                  params: { labName: selectedLabData?.name, visitType, orderId: res?.data?.id || res?.id }
                });
              } catch (e) {
                console.error(e);
                showLocalizedAlert('خطأ', 'حدث خطأ أثناء رفع الطلب');
              }
            }}
          >
            <AppText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>إرسال الطلب للمختبر للاعتماد</AppText>
            <Icon name="send" size={20} color="#fff" style={{ marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}/>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Real Bottom Sheet for Camera/Gallery */}
      {showBottomSheet && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowBottomSheet(false)} />
          <Animated.View entering={SlideInUp.duration(300)} style={[styles.sheet, { backgroundColor: colors.surface } ]}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }}/>
            <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginBottom: 24 }}>اختر مصدر الصورة</AppText>

            <TouchableOpacity style={[styles.sheetBtn, { borderColor: colors.border }]} onPress={() => handlePick('camera')}>
              <Icon name="camera" size={24} color={colors.primary} />
              <AppText style={{ fontSize: 16, color: colors.textPrimary, marginHorizontal: 16 }}>التقط صورة بالكاميرا</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetBtn, { borderColor: colors.border }]} onPress={() => handlePick('gallery')}>
              <Icon name="image-multiple" size={24} color={colors.primary} />
              <AppText style={{ fontSize: 16, color: colors.textPrimary, marginHorizontal: 16 }}>اختر من الاستوديو</AppText>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  uploadSection: { marginTop: 40 },
  uploadBox: { alignItems: 'center', justifyContent: 'center', padding: 40, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed' },
  uploadIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  consultBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  analyzingSection: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  pulseCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: 32 },
  extractedBox: { padding: 16, borderRadius: 16, borderWidth: 1 },
  extractedItem: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', paddingVertical: 8 },
  dropdownBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 },
  visitTypeBtn: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  labCard: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  confirmBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 }
});
