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

const { width } = Dimensions.get('window');

export default function PackageDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { colors } = useApp();
  const { addItem, items } = useDiagnosticsCart();

  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/labs/packages/${id}`)
      .then(res => setPkg(normalizeLabService(res?.data || res)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <AppText>جاري التحميل...</AppText>
      </SafeAreaView>
    );
  }

  if (!pkg) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <AppText>حدث خطأ، لا يمكن عرض بيانات الباقة</AppText>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}><AppText style={{ color: colors.primary }}>العودة</AppText></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const inCart = items.some(i => i.id === id);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
        <View style={{ width: 40 }}/>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>تفاصيل الباقة</AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={[styles.headerCard, { backgroundColor: pkg.color ? `${pkg.color}15` : `${colors.primary}15` }]} >
          <View style={[styles.iconBox, { backgroundColor: pkg.color || colors.primary } ]}>
            <Icon name={pkg.icon || 'shield-check-outline'} size={40} color="#fff" />
          </View>
          <AppText style={{ fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, textAlign: 'center' }}>{pkg.name}</AppText>
          <AppText style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>{pkg.desc}</AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={{ marginTop: 24 }}>
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
              <View style={[styles.circleIcon, { backgroundColor: `${colors.primary}15` }]} >
                <Icon name="flask-outline" size={20} color={colors.primary} />
              </View>
              <AppText style={{ fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 }}>عدد التحاليل</AppText>
            </View>
            <AppText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{pkg.testsCount || pkg.includedTests?.length || 0} تحليل</AppText>
          </View>

          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
              <View style={[styles.circleIcon, { backgroundColor: '#FF980015' } ]}>
                <Icon name="food-off" size={20} color="#FF9800" />
              </View>
              <AppText style={{ fontWeight: 'bold', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 }}>الصيام المطلوب</AppText>
            </View>
            <AppText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{pkg.fasting || '١٠ - ١٢ ساعة'}</AppText>
          </View>
        </Animated.View>

        {(pkg.turnaround || pkg.homeVisit) && (
        <Animated.View entering={FadeInUp.duration(400).delay(250)} style={{ marginTop: 24 }}>
          {pkg.turnaround && (
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <AppText style={{ fontWeight: 'bold' }}>مدة ظهور النتيجة</AppText>
            <AppText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{pkg.turnaround}</AppText>
          </View>)}
          <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            <AppText style={{ fontWeight: 'bold' }}>زيارة منزلية</AppText>
            <AppText style={{ color: colors.textSecondary, fontWeight: 'bold' }}>{pkg.homeVisit ? 'متاحة' : 'غير متاحة'}</AppText>
          </View>
        </Animated.View>)}
        {(pkg.testsList || []).length > 0 && (
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={{ marginTop: 24 }}>
          <AppText variant="h3" style={{ marginBottom: 16, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>التحاليل المشمولة</AppText>
          <View style={[styles.testsList, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            {(pkg.testsList || pkg.includedTests || []).map((testName: any, idx: number) => {
              const name = typeof testName === 'string' ? testName : testName.name;
              return (
                <View key={idx} style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < ((pkg.testsList || pkg.includedTests || []).length) - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <Icon name="check-circle" size={18} color="#4CAF50" style={{ marginRight: I18nManager.isRTL ? 0 : 12, marginLeft: I18nManager.isRTL ? 12 : 0 }}/>
                  <AppText style={{ fontSize: 14 }}>{name}</AppText>
                </View>
              );
            })}
          </View>
        </Animated.View>)}

      </ScrollView>

      <Animated.View entering={SlideInDown.duration(400)} style={[styles.floatingBottom, { backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
        <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start' }}>
            {pkg.oldPrice && <AppText style={{ fontSize: 14, color: colors.textSecondary, textDecorationLine: 'line-through', marginBottom: 2 }}>{pkg.oldPrice} ر.س</AppText>}
            <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.primary }}>{pkg.price} <AppText style={{ fontSize: 14, color: colors.primary }}>ر.س</AppText></AppText>
          </View>
          <View style={{ backgroundColor: '#4CAF5015', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <AppText style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 12 }}>وفر {pkg.oldPrice ? (parseInt(pkg.oldPrice) - parseInt(pkg.price)) : 0} ر.س</AppText>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: inCart ? colors.background : colors.primary, borderColor: inCart ? colors.border : colors.primary }]}
          onPress={() => addItem({ id, name: pkg.name, price: parseInt(pkg.price), kind: 'lab' })}
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
  headerCard: { padding: 24, borderRadius: 24, alignItems: 'center' },
  iconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  infoRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  circleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  testsList: { padding: 16, borderRadius: 16, borderWidth: 1 },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  addBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
});
