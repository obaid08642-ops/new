// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../src/utils/api';
import { normalizeLabService } from '../../src/utils/labMappers';
import { pickLocalized } from '../../src/utils/localize';

const { width } = Dimensions.get('window');

export default function TestDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  // Cards pass isRadiology=true; search passes type=radiology — accept both
  const isRadiology = params.type === 'radiology' || params.isRadiology === 'true' || params.isRadiology === true;
  
  const { colors } = useApp();
  const { addItem, items } = useDiagnosticsCart();

  const [testData, setTestData] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const prepList = (d: any): string[] => {
    const ar = Array.isArray(d?.preparation_ar) ? d.preparation_ar.filter(Boolean) : [];
    const en = Array.isArray(d?.preparation_en) ? d.preparation_en.filter(Boolean) : [];
    const list = pickLocalized(ar, en) || [];
    return list;
  };

  useEffect(() => {
    const endpoint = isRadiology ? `/radiology/services/${id}` : `/labs/services/${id}`;
    apiFetch(endpoint)
      .then(res => setTestData(normalizeLabService(res?.data || res)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isRadiology]);

  if (loading) return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}><AppText>جاري التحميل...</AppText></SafeAreaView>;
  if (!testData) return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}><AppText>حدث خطأ، يرجى المحاولة لاحقاً</AppText></SafeAreaView>;

  const inCart = items.some(i => i.id === id);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
        <View style={styles.headerBtn}>
          <TouchableOpacity onPress={() => setIsFavorite(!isFavorite)}>
            <Icon name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#E91E63" : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>
          {isRadiology ? 'تفاصيل الأشعة' : 'تفاصيل التحليل'}
        </AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero: the real catalogue image, large — same one shown on the card */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={{ alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
          {testData.image ? (
            <View style={[styles.heroImgWrap, { borderColor: colors.border }]}>
              <Image source={{ uri: testData.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : (
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]} >
              <Icon name={isRadiology ? 'radiology-box' : 'flask'} size={48} color={colors.primary} />
            </View>
          )}
          <AppText style={{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>{testData.name}</AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <AppText variant="h3" style={{ marginBottom: 12, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>وصف الخدمة</AppText>
            <AppText style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 24, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>
              {testData.desc || testData.description || 'لا يوجد وصف متاح.'}
            </AppText>
          </View>

          {/* التحضيرات والاحتياطات — قائمة كاملة من قاعدة البيانات */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 } ]}>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.circleIcon, { backgroundColor: '#FF980015' } ]}>
                <Icon name="alert-circle-outline" size={20} color="#FF9800" />
              </View>
              <AppText style={{ fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 }}>التحضيرات والاحتياطات</AppText>
            </View>
            {testData.fasting_required ? (
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', backgroundColor: '#FF980012', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <Icon name="food-off-outline" size={18} color="#E65100" />
                <AppText style={{ color: '#E65100', fontWeight: 'bold', marginHorizontal: 8, flex: 1, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>
                  يتطلب صيام {testData.fasting_hours || 8} ساعة قبل الفحص
                </AppText>
              </View>
            ) : null}
            {prepList(testData).length
              ? prepList(testData).map((p: string, i: number) => (
                  <View key={i} style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', marginBottom: 6 }}>
                    <AppText style={{ color: colors.primary, marginHorizontal: 6 }}>•</AppText>
                    <AppText style={{ color: colors.textSecondary, flex: 1, lineHeight: 22, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{p}</AppText>
                  </View>
                ))
              : <AppText style={{ color: colors.textSecondary, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>لا توجد تحضيرات خاصة</AppText>}
          </View>

          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 } ]}>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
              <View style={[styles.circleIcon, { backgroundColor: '#4CAF5015' } ]}>
                <Icon name="clock-outline" size={20} color="#4CAF50" />
              </View>
              <AppText style={{ fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 }}>وقت النتيجة</AppText>
            </View>
            <AppText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{testData.time || testData.turnaroundTime || '٢٤ ساعة'}</AppText>
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={SlideInDown.duration(400)} style={[styles.floatingBottom, { backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <AppText style={{ fontSize: 16, color: colors.textSecondary }}>السعر الإجمالي</AppText>
          <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{testData.price} <AppText style={{ fontSize: 14, color: colors.primary }}>ر.س</AppText></AppText>
        </View>

        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', gap: 10 }}>
          <TouchableOpacity
            style={[styles.addBtn, { flex: 1, backgroundColor: inCart ? colors.background : colors.surface, borderColor: inCart ? colors.border : colors.primary }]}
            onPress={() => addItem({ id, name: testData.name, price: parseInt(testData.price), kind: isRadiology ? 'radiology' : 'lab' })}
            disabled={inCart}
          >
            <Icon name={inCart ? "check-circle" : "cart-plus"} size={22} color={inCart ? "#4CAF50" : colors.primary} />
            <AppText style={{ color: inCart ? "#4CAF50" : colors.primary, fontSize: 15, fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}>
              {inCart ? 'تم الإضافة للسلة' : 'أضف للسلة'}
            </AppText>
          </TouchableOpacity>

          {/* حجز الآن — يضيف الخدمة وينتقل مباشرة للسلة لإتمام الحجز */}
          <TouchableOpacity
            style={[styles.addBtn, { flex: 1, backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => {
              // PH-SERVICE: direct booking funnel (slots + cash/insurance) — not the cart.
              router.push({ pathname: '/diagnostics/book', params: { kind: isRadiology ? 'radiology' : 'lab', serviceId: String(id) } });
            }}
          >
            <Icon name="calendar-check" size={22} color="#fff" />
            <AppText style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}>
              احجز الآن
            </AppText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 150 },
  iconBox: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  heroImgWrap: { width: width - 40, height: (width - 40) * 0.62, borderRadius: 24, overflow: 'hidden', borderWidth: 1, backgroundColor: '#fff' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1 },
  infoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 },
  circleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  addBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
});
