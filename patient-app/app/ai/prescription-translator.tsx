// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';



function IconRow({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <View style={st.iconRow}>
      <Icon name={icon as any} size={16} color={color} />
      <AppText variant="bodySM">{text}</AppText>
    </View>
  );
}

export default function PrescriptionTranslatorScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [expandedMed, setExpandedMed] = useState<number | null>(null);
  const [translatedResult, setTranslatedResult] = useState<any>(null);

  const pickImage = async (useCamera: boolean) => {
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
          await handleTranslate(asset.base64);
        } else {
          showLocalizedAlert('خطأ', 'فشل قراءة ملف الصورة كـ Base64.');
        }
      }
    } catch (e) {
      console.log('Error picking image', e);
      showLocalizedAlert('خطأ', 'حدث خطأ أثناء اختيار الصورة.');
    }
  };

  const handleSelectImage = () => {
    showLocalizedAlert(
      'اختر مصدر الصورة',
      'يرجى تحديد طريقة رفع صورة الوصفة الطبية:',
      [
        { text: 'التقاط صورة بالكاميرا', onPress: () => pickImage(true) },
        { text:'اختيار من المعرض', onPress: () => pickImage(false) },
        { text: 'إلغاء', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const handleTranslate = async (base64Data: string) => {
    setTranslating(true);
    try {
      const res = await apiFetch<any>('/ai/ocr-translate', {
        method: 'POST',
        body: JSON.stringify({
          image_base64: base64Data,
          target_lang: 'ar'
        })
      });

      if (res && res.ok !== false) {
        const mappedMedications = (res.medications || []).map((med: any) => ({
          originalText: med.originalText || med.name_en || med.name || '',
          translatedName: med.translatedName || pickLocalized(med.name_ar, med.name) || 'دواء مترجم',
          dosage: med.dosage || 'قرص عند الحاجة',
          timing: med.frequency || med.instructions || med.timing || 'حسب إرشاد الطبيب',
          duration: med.duration || 'حسب الوصفة',
          notes: med.instructions || med.notes || 'استخدام طبي موصوف',
          interactions: med.interactions || [],
          sideEffects: med.sideEffects || [],
          price: (typeof med.price === 'number' && med.price > 0) ? med.price : null,
          alternatives: med.alternatives || ['متوفر بدائل بالصيدلية'],
        }));

        setTranslatedResult({
          doctorName: res.doctor_name || 'طبيب غير محدد',
          date: res.date || new Date().toISOString().split('T')[0],
          medications: mappedMedications,
          ocrAccuracy: typeof res.ocrAccuracy === 'number' ? res.ocrAccuracy : null,
          langFrom: 'English',
          langTo: 'العربية',
        });
        setTranslated(true);
      } else {
        throw new Error(res?.error || 'Failed translation');
      }
    } catch (err: any) {
      console.log('Prescription translation error:', err);
      showLocalizedAlert('خطأ في الترجمة', 'لم نتمكن من معالجة صورة الوصفة الطبية. يرجى التأكد من وضوح الصورة والمحاولة مرة أخرى.');
    } finally {
      setTranslating(false);
    }
  };

  const RESULT = translatedResult;

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 } ]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }}/>
          <AppText variant="h4" color="#fff">مترجم الوصفات</AppText>
          <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* Upload area */}
        {!translated && (
          <TouchableOpacity activeOpacity={0.9} onPress={handleSelectImage} style={[st.uploadArea, { borderColor: colors.primary, backgroundColor: colors.primarySurface } ]}>
            <Icon name="document" size={40} color={colors.primary} />
            <AppText variant="h5" color={colors.primary} align="center">صوّر أو ارفع الوصفة</AppText>
            <AppText variant="bodySM" color={colors.textTertiary} align="center">سنترجم الوصفة من الإنجليزية للعربية</AppText>
            <Button label="ابدأ الترجمة" variant="gradient" icon="robot" loading={translating} onPress={handleSelectImage} />
          </TouchableOpacity>
        )}

        {/* Result */}
        {translated && (
          <>
            {/* Accuracy */}
            <Card style={{ backgroundColor: colors.successSurface }}>
              <View style={st.iconRow}>
                <Icon name="check_circle" size={20} color={colors.success} />
                <AppText variant="h6" color={colors.success}>تمت الترجمة بنجاح</AppText>
              </View>
              <View style={{ gap: 4, marginTop: 8 }}>
                {RESULT.ocrAccuracy != null && <IconRow icon="success" text={`دقة القراءة: ${RESULT.ocrAccuracy}%`} color={colors.primary} />}
                <IconRow icon="document" text={`من: ${RESULT.langFrom} → إلى: ${RESULT.langTo}`} color={colors.primary} />
              </View>
            </Card>

            {/* Doctor info */}
            <Card style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
              <View style={[st.docIcon, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="doctor" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <IconRow icon="doctor" text={RESULT.doctorName} color={colors.primary} />
                <AppText variant="caption" color={colors.textTertiary}>{RESULT.date}</AppText>
              </View>
            </Card>

            {/* Medications */}
            <SectionHeader title={`الأدوية (${RESULT.medications.length})`} />

            {RESULT.medications.map((med, i) => (
              <Card key={i} onPress={() => setExpandedMed(expandedMed === i ? null : i)}>
                {/* Med header */}
                <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
                  <View style={[st.medIcon, { backgroundColor: colors.primarySurface } ]}>
                    <Icon name="medication" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                    <AppText variant="h6">{med.translatedName}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>{med.originalText}</AppText>
                  </View>
                  <Icon name={expandedMed === i ? 'trendingUp' : 'trendingDown'} size={18} color={colors.textTertiary} />
                </View>

                {/* Info chips */}
                <View style={st.chipRow}>
                  <View style={[st.chip, { backgroundColor: isDark ? colors.surfaceSecondary : '#FEF3C7' } ]}>
                    <IconRow icon="clock" text={med.timing} color={colors.accent} />
                  </View>
                  <View style={[st.chip, { backgroundColor: isDark ? colors.surfaceSecondary : '#E0F2FE' } ]}>
                    <IconRow icon="calendar" text={med.duration} color={colors.primary} />
                  </View>
                  <View style={[st.chip, { backgroundColor: isDark ? colors.surfaceSecondary : '#DCFCE7' } ]}>
                    <IconRow icon="medication" text={med.dosage} color={colors.success} />
                  </View>
                </View>

                {/* Expanded details */}
                {expandedMed === i && (
                  <View style={[st.expanded, { borderTopColor: colors.borderLight } ]}>
                    <IconRow icon="document" text={`الاستخدام: ${med.notes}`} color={colors.primary} />

                    {med.interactions.length > 0 && (
                      <View style={[st.warningBox, { backgroundColor: '#FEF3C7' } ]}>
                        <IconRow icon="warning" text={med.interactions.join(' • ')} color={colors.warning} />
                      </View>
                    )}

                    <AppText variant="labelMD" style={{ marginTop: 8 }}>الآثار الجانبية المحتملة:</AppText>
                    <View style={st.tagsRow}>
                      {med.sideEffects.map((se, j) => (
                        <View key={j} style={[st.tag, { backgroundColor: '#FEE2E2' } ]}>
                          <AppText variant="caption" color="#DC2626">{se}</AppText>
                        </View>
                      ))}
                    </View>

                    <AppText variant="labelMD" style={{ marginTop: 8 }}>البدائل المتوفرة:</AppText>
                    <View style={st.tagsRow}>
                      {med.alternatives.map((alt, j) => (
                        <View key={j} style={[st.tag, { backgroundColor: colors.primarySurface } ]}>
                          <AppText variant="caption" color={colors.primary}>{alt}</AppText>
                        </View>
                      ))}
                    </View>

                    <View style={st.actionRow}>
                      <Button label={med.price != null ? `اطلب — ${med.price} ر.س` : 'اطلب من الصيدلية'} variant="primary" icon="shopping_cart" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} style={{ flex: 1 }} />
                      <Button label="تفاصيل" variant="outline" icon="info" size="sm" full={false} onPress={() => router.push('/pharmacy/product-detail')} style={{ flex: 1 }} />
                    </View>
                  </View>
                )}
              </Card>
            ))}

            {/* Order all */}
            <TouchableOpacity onPress={() => router.push('/(tabs)/pharmacy')} style={{ borderRadius: 18, overflow: 'hidden' }}>
              <View style={st.orderAll}>
                <View style={st.iconRow}>
                  <Icon name="shopping_cart" size={20} color="#fff" />
                  <AppText variant="h6" color="#fff">اطلب جميع الأدوية من الصيدلية</AppText>
                </View>
              </View>
            </TouchableOpacity>

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <Button label="إضافة للتذكيرات" variant="outline" icon="bell" onPress={() => router.push('/health/medication-reminder-add')} />
              <Button label="مشاركة مع الطبيب" variant="ghost" icon="share" onPress={() => router.push('/consultations/share-report')} />
            </View>

            {/* Upload new */}
            <Card onPress={() => { setTranslated(false); setExpandedMed(null); }} style={{ alignItems: 'center', gap: 8, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary }}>
              <Icon name="document" size={28} color={colors.primary} />
              <AppText variant="labelMD" color={colors.primary}>ترجمة وصفة أخرى</AppText>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hdrRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  uploadArea: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 24, padding: 32, alignItems: 'center', gap: 12 },
  iconRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  docIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  medIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  expanded: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 6 },
  warningBox: { padding: 10, borderRadius: 10, marginTop: 4 },
  tagsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actionRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  orderAll: { padding: 16, alignItems: 'center' },
});
