// @ts-nocheck
/**
 * app/pharmacy/cart.tsx
 * Shopping cart — reads from CartContext (shared global state).
 * - Shows items added from any screen.
 * - Rx enforcement: blocks checkout if Rx items have no prescription.
 * - Routes to checkout on proceed.
 */
import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { useCart } from '../../src/context/CartContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import * as ImagePicker from 'expo-image-picker';

export default function PharmacyCartScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const { items, updateQty, removeItem, subtotal, hasRxItems, prescriptionUrl, setPrescriptionUrl, clearCart } = useCart();

  // ─── Upload prescription ─────────────────────────────────────────────────────
  const handleUploadPrescription = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'نحتاج إذن الوصول للمعرض لرفع صورة الروشتة');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPrescriptionUrl(result.assets[0].uri);
    }
  }, [setPrescriptionUrl]);

  const handleTakePrescriptionPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('إذن مطلوب', 'نحتاج إذن الكاميرا لتصوير الروشتة');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPrescriptionUrl(result.assets[0].uri);
    }
  }, [setPrescriptionUrl]);

  const proceedToCheckout = () => {
    if (hasRxItems && !prescriptionUrl) return;
    router.push('/pharmacy/checkout');
  };

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.bg } ]}>
        <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 80 }}>remove_shopping_cart</Text>
        <Text style={[styles.emptyTitle, { color: colors.n } ]}>السلة فارغة</Text>
        <Text style={[styles.emptySubtitle, { color: colors.t2 } ]}>لم تقم بإضافة أي أدوية للسلة بعد</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.back()}>
          <Text style={{ fontFamily: 'Cairo-Bold', fontSize: 15, color: '#fff' }}>تصفح الأدوية</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 16 } ]}>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>arrow_forward</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.n } ]}>سلة الطلبات ({items.length})</Text>
        <TouchableOpacity onPress={() => { Alert.alert('تفريغ السلة', 'هل تريد إزالة كل الأصناف؟', [{ text: 'إلغاء' }, { text: 'تفريغ', onPress: clearCart, style: 'destructive' }]); }} style={[styles.iconBtn, { backgroundColor: colors.s } ]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0695C', fontSize: 22 }}>delete_sweep</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>

        {/* ─── Cart Items ──────────────────────────────────────────────────────── */}
        {items.map(item => (
          <View key={item.id} style={[styles.cartItem, { backgroundColor: colors.s, borderColor: colors.bd, flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>

            {/* Icon */}
            <View style={[styles.itemIcon, { backgroundColor: item.iconBg || '#DEF5F9' } ]}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 26, color: item.iconColor || '#23B5CE' }}>
                {item.icon || 'medication'}
              </Text>
            </View>

            <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <Text style={[styles.itemName, { color: colors.n }]} numberOfLines={1}>{item.name}</Text>
                {item.rx && (
                  <View style={[styles.rxBadge, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 } ]}>
                    <Text style={styles.rxText}>Rx</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.itemPrice, { color: '#23B5CE' } ]}>{(item.price * item.qty).toFixed(2)} ر.س</Text>

              {/* Qty Controls */}
              <View style={[styles.qtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.bg, borderColor: colors.bd }]} onPress={() => updateQty(item.id, -1)}>
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 18 }}>remove</Text>
                </TouchableOpacity>
                <Text style={[styles.qtyNum, { color: colors.n } ]}>{item.qty}</Text>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#23B5CE' }]} onPress={() => updateQty(item.id, 1)}>
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 18 }}>add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 20 }}>delete_outline</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ─── Rx Prescription Block ───────────────────────────────────────────── */}
        {hasRxItems && (
          <View style={[styles.rxBlock, {
            backgroundColor: prescriptionUrl ? '#E2F7F2' : '#FEEFED',
            borderColor: prescriptionUrl ? '#2BB89C' : '#F0695C',
          } ]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginBottom: 14 }}>
              <View style={[styles.rxIcon, { backgroundColor: prescriptionUrl ? '#2BB89C' : '#F0695C' } ]}>
                <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 24 }}>
                  {prescriptionUrl ? 'check_circle' : 'receipt_long'}
                </Text>
              </View>
              <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.rxBlockTitle, { color: '#141A2A' } ]}>
                  {prescriptionUrl ? 'تم إرفاق الوصفة الطبية ' : 'مطلوب وصفة طبية (Rx)'}
                </Text>
                <Text style={[styles.rxBlockDesc, { color: '#4C5566' } ]}>
                  {prescriptionUrl ? 'سيراجعها الصيدلي قبل تأكيد طلبك.' : 'بعض أدويتك تستلزم روشتة طبية. يرجى رفعها للمتابعة.'}
                </Text>
              </View>
            </View>

            {!prescriptionUrl && (
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={[styles.rxActionBtn, { backgroundColor: '#23B5CE' }]}
                  onPress={handleTakePrescriptionPhoto}
                >
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>photo_camera</Text>
                  <Text style={{ fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 15 }}>صوّر الروشتة الآن</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rxActionBtn, { backgroundColor: '#DEF5F9', borderWidth: 1, borderColor: '#23B5CE' }]}
                  onPress={handleUploadPrescription}
                >
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 22, marginRight: 10 }}>upload_file</Text>
                  <Text style={{ fontFamily: 'Cairo-Bold', color: '#23B5CE', fontSize: 15 }}>ارفع من المعرض</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rxActionBtn, { backgroundColor: '#EDEBFD', borderWidth: 1, borderColor: '#7A6BEA' }]}
                  onPress={() => router.push('/(tabs)/consultations')}
                >
                  <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#7A6BEA', fontSize: 22, marginRight: 10 }}>forum</Text>
                  <Text style={{ fontFamily: 'Cairo-Bold', color: '#7A6BEA', fontSize: 15 }}>استشارة طبيب للحصول عليها</Text>
                </TouchableOpacity>
              </View>
            )}

            {prescriptionUrl && (
              <TouchableOpacity onPress={() => setPrescriptionUrl(null)} style={[styles.rxActionBtn, { backgroundColor: '#FEEFED', borderWidth: 1, borderColor: '#F0695C' } ]}>
                <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#F0695C', fontSize: 20, marginRight: 10 }}>delete</Text>
                <Text style={{ fontFamily: 'Cairo-Bold', color: '#F0695C', fontSize: 14 }}>حذف الوصفة وإعادة الرفع</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ─── Manual Order Button ─── */}
        <TouchableOpacity
          style={[styles.manualOrderBtn, { borderColor: '#23B5CE', backgroundColor: '#DEF5F9' }]}
          onPress={() => router.push('/pharmacy/manual-order')}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#23B5CE', fontSize: 24, marginRight: 10 }}>add_circle_outline</Text>
          <Text style={{ fontFamily: 'Cairo-Bold', color: '#23B5CE', fontSize: 15 }}>لم تجد دواءك؟ أضف صنف يدوياً</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { backgroundColor: colors.s, borderTopColor: colors.bd, paddingBottom: insets.bottom + 16 } ]}>
        <View style={[styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' } ]}>
          <Text style={[styles.totalLabel, { color: colors.t2 } ]}>المجموع التقديري</Text>
          <Text style={[styles.totalValue, { color: colors.n } ]}>{subtotal.toFixed(2)} <Text style={{ fontSize: 14, color: colors.t3 }}>ر.س</Text></Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: (hasRxItems && !prescriptionUrl) ? colors.bd : '#23B5CE' }]}
          onPress={proceedToCheckout}
          disabled={hasRxItems && !prescriptionUrl}
          activeOpacity={0.85}
        >
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 22, marginRight: 10 }}>
            {hasRxItems && !prescriptionUrl ? 'lock' : 'arrow_back'}
          </Text>
          <Text style={[styles.checkoutText, { color: (hasRxItems && !prescriptionUrl) ? colors.t3 : '#fff' } ]}>
            {hasRxItems && !prescriptionUrl ? 'ارفع الوصفة أولاً للمتابعة' : 'متابعة لإتمام الطلب'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Cairo-Black', fontSize: 22, marginTop: 16 },
  emptySubtitle: { fontFamily: 'Cairo-Regular', fontSize: 14, marginTop: 8, marginBottom: 24 },
  browseBtn: { backgroundColor: '#23B5CE', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Cairo-Black', fontSize: 18 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cartItem: { padding: 14, borderRadius: 20, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  itemIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemName: { fontFamily: 'Cairo-Bold', fontSize: 14, flex: 1 },
  itemPrice: { fontFamily: 'Cairo-Black', fontSize: 16, marginTop: 4 },
  rxBadge: { backgroundColor: '#F0695C', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rxText: { fontFamily: 'Cairo-Bold', color: '#fff', fontSize: 10 },
  qtyRow: { alignItems: 'center', marginTop: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  qtyNum: { fontFamily: 'Cairo-Black', fontSize: 16, marginHorizontal: 14 },
  deleteBtn: { padding: 4, alignSelf: 'flex-start' },
  rxBlock: { padding: 20, borderRadius: 20, borderWidth: 1.5, marginTop: 8 },
  rxIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rxBlockTitle: { fontFamily: 'Cairo-Bold', fontSize: 15 },
  rxBlockDesc: { fontFamily: 'Cairo-Regular', fontSize: 13, lineHeight: 20, marginTop: 4 },
  rxActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
  manualOrderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 16, marginBottom: 40 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  totalRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalLabel: { fontFamily: 'Cairo-Regular', fontSize: 15 },
  totalValue: { fontFamily: 'Cairo-Black', fontSize: 20 },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20 },
  checkoutText: { fontFamily: 'Cairo-Black', fontSize: 16 },
});
