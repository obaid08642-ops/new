// app/diagnostics/book-sample.tsx — routes the legacy entrypoint into the live provider-selection flow.
import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';

export default function BookSampleScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { items } = useDiagnosticsCart();

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">حجز سحب عينة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={18} color={colors.info} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>اختيار المزوّد والتوفر والسعر النهائي يتم من السلة بناءً على بيانات الخدمة الحية. لا يُنشأ طلب أو دفع من هذه الشاشة.</AppText>
          </View>
        </Card>

        <Card>
          <SectionHeader title="التحاليل المطلوبة" />
          {items.length > 0 ? items.map((item, index) => (
            <View key={`${item.id}-${index}`} style={{ flexDirection: 'row-reverse', gap: 6, paddingVertical: 4, alignItems: 'center' }}>
              <Icon name="check_circle" size={16} color={colors.success} />
              <AppText variant="bodySM">{item.name}</AppText>
            </View>
          )) : <AppText variant="bodySM" color={colors.textSecondary}>لا يوجد تحاليل في السلة حالياً.</AppText>}
        </Card>

        <Card>
          <SectionHeader title="الخطوة التالية" />
          <AppText variant="bodySM" color={colors.textSecondary}>اختر مزوّداً مفعلاً من السلة، ثم أرسل طلب الحجز. سيُظهر النظام حالة التوافر وتفاصيل الحجز من الخادم.</AppText>
        </Card>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
        <Button label="الذهاب إلى السلة" variant="gradient" size="lg" icon="cart" onPress={() => router.replace('/diagnostics/cart')} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
