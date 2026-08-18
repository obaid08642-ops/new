// @ts-nocheck
// app/services/index.tsx — كل الخدمات: دليل شامل لأقسام التطبيق بروابط حقيقية
import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, IconButton, SectionHeader } from '../../src/components/ui';

interface ServiceItem {
  title: string;
  desc: string;
  icon: IconName;
  route: string;
}

const SECTIONS: { title: string; items: ServiceItem[] }[] = [
  {
    title: 'الرعاية الطبية',
    items: [
      { title: 'استشارات الأطباء', desc: 'عيادة، فيديو، أو زيارة منزلية', icon: 'stethoscope', route: '/(tabs)/consultations' },
      { title: 'التحاليل المخبرية', desc: 'سحب عينة منزلي أو زيارة المختبر', icon: 'science', route: '/(tabs)/diagnostics' },
      { title: 'الأشعة والتصوير', desc: 'حجز مواعيد الأشعة', icon: 'radiology-box-outline', route: '/(tabs)/diagnostics' },
      { title: 'التمريض المنزلي', desc: 'رعاية تمريضية في منزلك', icon: 'nurse', route: '/(tabs)/nursing' },
      { title: 'الإسعاف', desc: 'طلب إسعاف طارئ فوري', icon: 'ambulance', route: '/emergency/sos' },
      { title: 'الصيدلية', desc: 'أدوية ومنتجات صحية بتوصيل سريع', icon: 'prescriptions', route: '/(tabs)/pharmacy' },
    ],
  },
  {
    title: 'صحتي',
    items: [
      { title: 'الملف الصحي', desc: 'علاماتك الحيوية وسجلك الطبي', icon: 'health', route: '/(tabs)/health' },
      { title: 'التذكيرات الذكية', desc: 'تذكيرات الأدوية والمواعيد', icon: 'notification', route: '/health/smart-reminders' },
      { title: 'التقارير الطبية', desc: 'تقاريرك ونتائجك في مكان واحد', icon: 'document', route: '/reports/view-report' },
    ],
  },
  {
    title: 'أدوات الذكاء الاصطناعي',
    items: [
      { title: 'المساعد الطبي الذكي', desc: 'فرز الأعراض وإرشاد أولي', icon: 'robot', route: '/ai/symptom-checker' },
      { title: 'مترجم الروشتات', desc: 'فهم وصفتك الطبية بسهولة', icon: 'translate', route: '/ai/prescription-translator' },
      { title: 'التقرير الشهري', desc: 'ملخص صحتك خلال الشهر', icon: 'insights', route: '/ai/monthly-report' },
    ],
  },
  {
    title: 'العائلة والمجتمع',
    items: [
      { title: 'التغذية', desc: 'خطط وجبات وإرشاد غذائي', icon: 'nutrition', route: '/nutrition/hub' },
      { title: 'الأمومة', desc: 'متابعة الحمل والأمومة', icon: 'pregnant_woman', route: '/maternity/hub' },
      { title: 'الصحة النفسية', desc: 'دعم وموارد الصحة النفسية', icon: 'brain', route: '/mental-health' },
      { title: 'مجتمع نبض', desc: 'تجارب ونقاشات صحية', icon: 'users', route: '/community/hub' },
      { title: 'عائلتي', desc: 'إدارة أفراد العائلة', icon: 'home_health', route: '/family' },
    ],
  },
  {
    title: 'حسابي وخدماتي',
    items: [
      { title: 'مركز الطلبات', desc: 'كل طلباتك وحجوزاتك في مكان واحد', icon: 'receipt', route: '/orders' },
      { title: 'التأمين الطبي', desc: 'وثيقتك وتغطيتك التأمينية', icon: 'shield', route: '/insurance' },
      { title: 'المحفظة', desc: 'رصيدك ومعاملاتك المالية', icon: 'wallet', route: '/wallet/hub' },
      { title: 'نقاط الولاء', desc: 'اكسب واستبدل النقاط', icon: 'gift', route: '/loyalty/hub' },
      { title: 'العروض والباقات', desc: 'خصومات وباقات صحية', icon: 'tag', route: '/offers' },
      { title: 'خريطة مقدمي الخدمة', desc: 'أقرب المنشآت إليك', icon: 'map', route: '/map' },
    ],
  },
];

export default function ServicesHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">كل الخدمات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={{ gap: 10 }}>
            <SectionHeader title={section.title} />
            <Card style={{ paddingVertical: 4 }}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.title}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                  style={[
                    st.row,
                    idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                  ]}
                >
                  <View style={[st.iconWrap, { backgroundColor: colors.primarySurface }]}>
                    <Icon name={item.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="h6">{item.title}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>{item.desc}</AppText>
                  </View>
                  <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 13 },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
