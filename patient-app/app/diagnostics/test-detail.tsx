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

const { width } = Dimensions.get('window');

export default function TestDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const isRadiology = params.type === 'radiology';
  
  const { colors } = useApp();
  const { addItem, items } = useDiagnosticsCart();

  const [testData, setTestData] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = isRadiology ? `/radiology/services/${id}` : `/labs/services/${id}`;
    apiFetch(endpoint)
      .then(res => setTestData(res?.data || res))
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
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={{ alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]} >
            <Icon name={isRadiology ? 'radiology-box' : 'flask'} size={48} color={colors.primary} />
          </View>
          <AppText style={{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>{testData.name}</AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <AppText variant="h3" style={{ marginBottom: 12, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>وصف الخدمة</AppText>
            <AppText style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 24, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>
              {testData.desc || testData.description || 'لا يوجد وصف متاح.'}
            </AppText>
          </View>

          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 } ]}>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
              <View style={[styles.circleIcon, { backgroundColor: '#FF980015' } ]}>
                <Icon name="alert-circle-outline" size={20} color="#FF9800" />
              </View>
              <AppText style={{ fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 }}>التحضيرات المطلوبة</AppText>
            </View>
            <AppText style={{ color: colors.textSecondary, fontWeight: 'bold', flex: 1, textAlign: I18nManager.isRTL ? 'left' : 'right' }}>
              {testData.requirements || 'لا توجد تحضيرات خاصة'}
            </AppText>
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

        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: inCart ? colors.background : colors.primary, borderColor: inCart ? colors.border : colors.primary }]}
          onPress={() => addItem({ id, name: testData.name, price: parseInt(testData.price), kind: isRadiology ? 'radiology' : 'lab' })}
          disabled={inCart}
        >
          <Icon name={inCart ? "check-circle" : "cart-plus"} size={22} color={inCart ? "#4CAF50" : "#fff"} />
          <AppText style={{ color: inCart ? "#4CAF50" : "#fff", fontSize: 16, fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}>
            {inCart ? 'تم الإضافة للسلة' : 'أضف للسلة'}
          </AppText>
        </TouchableOpacity>
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
  card: { padding: 20, borderRadius: 16, borderWidth: 1 },
  infoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1 },
  circleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  addBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
});
