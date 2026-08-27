// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../../src/components/ui';
import { useApp } from '../../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDiagnosticsCart } from '../../../src/context/DiagnosticsCartContext';
import { apiFetch } from '../../../src/utils/api';
import { showLocalizedAlert } from '../../../src/components/LocalizedAlert';

export default function LabProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useApp();
  const { items, addItem } = useDiagnosticsCart();
  
  const [lab, setLab] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [labRes, testsRes] = await Promise.all([
          apiFetch(`/providers/${id}`),
          apiFetch(`/labs/services?providerId=${id}`)
        ]);
        setLab(labRes.data || labRes);
        setTests(testsRes.data || testsRes || []);
      } catch (err) {
        console.error(err);
        // Fallback or handle error
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!lab) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <AppText>حدث خطأ في جلب بيانات المختبر</AppText>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <AppText style={{ color: colors.primary }}>عودة</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topHeader, { backgroundColor: colors.background } ]}>
        <View style={{ width: 40 }}/>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>ملف المختبر</AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
          <View style={[styles.logoWrap, { backgroundColor: `${lab.color || '#1A1F71'}15` }]} >
            <Icon name={lab.logo || 'hospital-building'} size={64} color={lab.color || '#1A1F71'} />
          </View>
          <AppText style={{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16 }}>{lab.name}</AppText>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="star" size={16} color="#FFD700" />
              <AppText style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 4 }}>{lab.rating ?? '—'}</AppText>
            </View>
            {lab.distance != null && (
              <View style={styles.metaItem}>
                <Icon name="map-marker-outline" size={16} color={colors.textSecondary} />
                <AppText style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 4 }}>{lab.distance}</AppText>
              </View>
            )}
            {lab.branches != null && (
              <View style={styles.metaItem}>
                <Icon name="store-outline" size={16} color={colors.textSecondary} />
                <AppText style={{ fontSize: 14, color: colors.textSecondary, marginLeft: 4 }}>{lab.branches} فرع</AppText>
              </View>
            )}
          </View>

          {(lab.lat != null && lab.lng != null) || lab.address ? (
            <TouchableOpacity
              style={[styles.directionBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                const url = lab.lat != null && lab.lng != null
                  ? `https://www.google.com/maps/dir/?api=1&destination=${lab.lat},${lab.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lab.address)}`;
                Linking.openURL(url).catch(() => showLocalizedAlert('تعذّر فتح الخرائط'));
              }}
            >
              <Icon name="directions" size={20} color="#fff" />
              <AppText style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>الاتجاهات للمختبر</AppText>
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>عن المختبر</AppText>
          <AppText style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 24, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>
            {lab.description || `تعتبر ${lab.name} من أحدث المختبرات الطبية المجهزة بأفضل التقنيات. نقدم مجموعة متكاملة من التحاليل المخبرية لضمان دقة وسرعة النتائج مع التزامنا بأعلى معايير الجودة العالمية.`}
          </AppText>
        </Animated.View>

        {/* Tests */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>التحاليل المتوفرة هنا</AppText>
          
          {tests.map((test, i) => {
             const isAdded = items.some(item => item.id === test.id && (item.lockedProviderId === id || !item.lockedProviderId));
             return (
             <TouchableOpacity 
               key={i} 
               style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} 
               onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}&labId=${id}`)}
             >
               <View style={[styles.testIconWrap, { backgroundColor: `${test.color || '#1E88E5'}15` }]} >
                 <Icon name={test.icon || 'water-outline'} size={28} color={test.color || '#1E88E5'} />
               </View>
               <View style={styles.testTextWrap}>
                 <AppText style={{ fontWeight: 'bold', fontSize: 14, color: colors.textPrimary, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{test.name}</AppText>
                 <AppText style={{ fontSize: 16, fontWeight: '900', color: colors.primary, marginTop: 4, textAlign: I18nManager.isRTL ? 'right' : 'left' }}>{test.price} ر.س</AppText>
               </View>

               {isAdded ? (
                 <View style={[styles.addBtn, { backgroundColor: '#4CAF50' } ]}>
                   <Icon name="check-bold" size={18} color="#fff" />
                   <AppText style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>مضاف للسلة</AppText>
                 </View>
               ) : (
                 <TouchableOpacity 
                   style={[styles.addBtn, { backgroundColor: '#E53935' }]}
                   onPress={() => addItem({ id: test.id, name: test.name, price: test.price, kind: 'lab', lockedProviderId: id as string })}
                 >
                   <Icon name="cart-plus" size={18} color="#fff" />
                   <AppText style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>أضف للسلة</AppText>
                 </TouchableOpacity>
               )}

             </TouchableOpacity>
          ); })}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  banner: { alignItems: 'center', padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 32 },
  logoWrap: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16, marginBottom: 24 },
  metaItem: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' },
  directionBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: '100%' },
  section: { marginBottom: 32 },
  sectionTitle: { marginBottom: 12, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  testItem: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  testIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginLeft: I18nManager.isRTL ? 12 : 0, marginRight: I18nManager.isRTL ? 0 : 12 },
  testTextWrap: { flex: 1, paddingHorizontal: 8 },
  addBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }
});
