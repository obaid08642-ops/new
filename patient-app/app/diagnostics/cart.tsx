// @ts-nocheck
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, Stack } from 'expo-router';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';

import { apiFetch } from '../../src/utils/api';

const { width } = Dimensions.get('window');

export default function GlobalCart() {
  const router = useRouter();
  const { colors } = useApp();
  const { items, removeItem, itemCount, clearCart } = useDiagnosticsCart();
  
  const [serviceType, setServiceType] = useState<'home' | 'clinic'>('home');
  const [selectedLab, setSelectedLab] = useState<string | null>(null);
  const [compatibleLabs, setCompatibleLabs] = useState<any[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);

  React.useEffect(() => {
    if (items.length > 0) {
      setLoadingLabs(true);
      const ids = items.map(i => i.id).join(',');
      apiFetch(`/labs/compatible-providers?testIds=${ids}`)
        .then((res: any) => setCompatibleLabs(res?.data || res || []))
        .catch(console.error)
        .finally(() => setLoadingLabs(false));
    } else {
      setCompatibleLabs([]);
      setSelectedLab(null);
    }
  }, [items]);

  // Calculate base total from items
  const baseTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (itemCount === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
          <View style={{ width: 40 }}/>
          <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>السلة الموحدة</AppText>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="cart-remove" size={80} color={colors.textSecondary} style={{ opacity: 0.5 }}/>
          <AppText style={{ fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16 }}>السلة فارغة</AppText>
          <AppText style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>قم بإضافة بعض التحاليل الفردية للسلة للمقارنة بين المختبرات.</AppText>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>العودة للتحاليل</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
        <TouchableOpacity onPress={() => clearCart()} style={styles.headerBtn}>
          <Icon name="trash-can-outline" size={24} color="#E53935" />
        </TouchableOpacity>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>السلة الموحدة ({itemCount})</AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Selected Items */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>التحاليل المضافة</AppText>
          {items.map((item, index) => (
            <Animated.View key={item.id + index} entering={FadeInDown.delay(100 * index)}>
              <View style={[styles.cartItem, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                <TouchableOpacity onPress={() => removeItem(item.id, item.kind)} style={styles.removeBtn}>
                  <Icon name="close" size={20} color="#E53935" />
                </TouchableOpacity>
                <View style={styles.itemInfo}>
                  <AppText style={{ fontWeight: 'bold', fontSize: 14, color: colors.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{item.name}</AppText>
                  <AppText style={{ fontSize: 15, fontWeight: '900', color: colors.primary, marginTop: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{item.price} ر.س</AppText>
                </View>
                <View style={[styles.itemIcon, { backgroundColor: `${colors.primary}15` }]} >
                  <Icon name="test-tube" size={24} color={colors.primary} />
                </View>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Service Type */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>مكان الفحص</AppText>
          <View style={[styles.serviceToggle, { backgroundColor: colors.surface } ]}>
            <TouchableOpacity 
              style={[styles.toggleBtn, serviceType === 'home' && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
              onPress={() => setServiceType('home')}
            >
              <Icon name="home-variant-outline" size={22} color={serviceType === 'home' ? '#fff' : colors.textSecondary} />
              <AppText style={[styles.toggleText, { color: serviceType === 'home' ? '#fff' : colors.textSecondary } ]}>سحب منزلي</AppText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.toggleBtn, serviceType === 'clinic' && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
              onPress={() => setServiceType('clinic')}
            >
              <Icon name="hospital-box-outline" size={22} color={serviceType === 'clinic' ? '#fff' : colors.textSecondary} />
              <AppText style={[styles.toggleText, { color: serviceType === 'clinic' ? '#fff' : colors.textSecondary } ]}>زيارة المختبر</AppText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Labs Engine matching */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3" color={colors.textPrimary}>المختبرات المتوافقة</AppText>
            <AppText style={{ fontSize: 12, color: colors.textSecondary }}>مختبرات توفر كل التحاليل</AppText>
          </View>

          {loadingLabs ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            compatibleLabs.map((lab) => {
              const labTotal = baseTotal;
              const isSelected = selectedLab === lab.id;

              return (
                <TouchableOpacity 
                  key={lab.id} 
                  onPress={() => setSelectedLab(lab.id)}
                  style={[
                    styles.labItem, 
                    { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { borderWidth: 2, shadowColor: colors.primary, shadowOpacity: 0.1, elevation: 4 }]} >
                  <View style={styles.labPrice}>
                    <AppText style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{labTotal}</AppText>
                    <AppText style={{ fontSize: 10, color: colors.textSecondary }}>ر.س</AppText>
                  </View>
                  <View style={styles.labInfo}>
                    <AppText style={{ fontWeight: 'bold', fontSize: 15, color: colors.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{lab.name}</AppText>
                    <View style={styles.labMeta}>
                      <Icon name="map-marker-outline" size={14} color={colors.textSecondary} />
                      <AppText style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 2, marginRight: 12 }}>يؤكد المزود التوفر والسعر النهائي</AppText>
                      {lab.rating != null && (
                        <>
                          <Icon name="star" size={14} color="#FFD700" />
                          <AppText style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>{lab.rating}</AppText>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={[styles.labLogo, { backgroundColor: `${colors.secondary}10` }]} >
                    <Icon name={'hospital-building'} size={28} color={colors.secondary} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          {!loadingLabs && compatibleLabs.length === 0 && <AppText style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>لا يوجد مزود متوافق ومفعّل لهذه الفحوصات حالياً.</AppText>}
        </Animated.View>

        <View style={{ height: 120 }}/>
      </ScrollView>

      {/* Floating Bottom Confirm */}
      {selectedLab && (
        <Animated.View entering={SlideInUp.duration(400)} style={[styles.floatingBottom, { backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
          <View style={styles.totalRow}>
            <AppText style={{ fontSize: 14, color: colors.textSecondary }}>الإجمالي الشامل</AppText>
            <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary }}>
              {baseTotal} <AppText style={{ fontSize: 12, color: colors.textSecondary }}>ر.س</AppText>
            </AppText>
          </View>
          <TouchableOpacity 
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
            onPress={() => {
              const lab = compatibleLabs.find(l => l.id === selectedLab);
              const labName = lab?.name;
              (router.push as any)({ pathname: '/diagnostics/checkout', params: { serviceType, labName, labId: selectedLab } });
            }}
          >
            <AppText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>متابعة لاختيار الموعد</AppText>
          </TouchableOpacity>
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
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  backBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { marginBottom: 16, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  cartItem: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(229,57,53,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: I18nManager.isRTL ? 0 : 12, marginLeft: I18nManager.isRTL ? 12 : 0 },
  itemInfo: { flex: 1, paddingHorizontal: 12 },
  itemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceToggle: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', borderRadius: 16, padding: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  toggleBtn: { flex: 1, flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  toggleText: { fontSize: 14, fontWeight: 'bold' },
  sectionHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  labItem: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  labLogo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: I18nManager.isRTL ? 0 : 12, marginRight: I18nManager.isRTL ? 12 : 0 },
  labInfo: { flex: 1 },
  labMeta: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', marginTop: 4 },
  labPrice: { alignItems: 'center', paddingRight: I18nManager.isRTL ? 12 : 0, paddingLeft: I18nManager.isRTL ? 0 : 12, borderRightWidth: I18nManager.isRTL ? 1 : 0, borderLeftWidth: I18nManager.isRTL ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)' },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  totalRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  confirmBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 }
});
