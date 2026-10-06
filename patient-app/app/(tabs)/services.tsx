// @ts-nocheck
import React from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import { AppText, Card, SectionHeader } from "../../src/components/ui";

interface ServiceItem {
  icon: IconName;
  title: string;
  desc: string;
  route: string;
  color: string;
  badge?: string;
}

const MAIN_SERVICES: ServiceItem[] = [
  {
    icon: "science",
    title: "التحاليل المخبرية",
    desc: "حجز تحاليل في المنزل أو المختبر",
    route: "/(tabs)/diagnostics",
    color: "#7A6BEA",
  },
  {
    icon: "monitor_heart",
    title: "التمريض المنزلي",
    desc: "ممرضون معتمدون يصلون إليك",
    route: "/(tabs)/nursing",
    color: "#23B5CE",
    badge: "جديد",
  },
  {
    icon: "xray",
    title: "الأشعة التشخيصية",
    desc: "حجز أشعة سينية، رنين، أشعة مقطعية",
    route: "/diagnostics/packages",
    color: "#F0695C",
  },
  {
    icon: "baby",
    title: "رعاية الأمومة",
    desc: "متابعة الحمل والولادة والنفاس",
    route: "/maternity/pregnancy-tracker",
    color: "#EC4899",
  },
];

const MORE_SERVICES: ServiceItem[] = [
  {
    icon: "emergency",
    title: "الطوارئ والإسعاف",
    desc: "طلب إسعاف أو استشارة طارئة",
    route: "/emergency/sos",
    color: "#DC2626",
  },
  {
    icon: "eye",
    title: "فحص النظر",
    desc: "حجز فحص عيون مع أخصائي",
    route: "/consultations/specialty-select",
    color: "#0EA5E9",
  },
  {
    icon: "tooth",
    title: "طب الأسنان",
    desc: "تنظيف، حشو، تقويم، زراعة",
    route: "/consultations/specialty-select",
    color: "#14B8A6",
  },
  {
    icon: "brain",
    title: "الصحة النفسية",
    desc: "استشارات نفسية وجلسات علاجية",
    route: "/mental-health/hub",
    color: "#A855F7",
  },
  {
    icon: "food",
    title: "التغذية والحمية",
    desc: "خطط غذائية وتتبع السعرات",
    route: "/nutrition/hub",
    color: "#F0A526",
  },
  {
    icon: "home",
    title: "الرعاية المنزلية",
    desc: "رعاية كبار السن والأمراض المزمنة",
    route: "/(tabs)/nursing",
    color: "#059669",
  },
];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <AppText variant="h3" color="#fff">
          الخدمات
        </AppText>
        <AppText variant="bodySM" color="rgba(255,255,255,0.85)">
          جميع الخدمات الصحية في مكان واحد
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}
      >
        {/* Main services — large cards */}
        <SectionHeader title="الخدمات الرئيسية" />
        <View style={{ gap: 10 }}>
          {MAIN_SERVICES.map((srv, i) => (
            <Card
              key={i}
              onPress={() => router.push(srv.route as any)}
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View style={[st.srvIcon, { backgroundColor: srv.color + "18" }]}>
                <Icon name={srv.icon} size={26} color={srv.color} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                <View
                  style={{
                    flexDirection: "row-reverse",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <AppText variant="h6">{srv.title}</AppText>
                  {srv.badge && (
                    <View
                      style={[st.badge, { backgroundColor: colors.success }]}
                    >
                      <AppText variant="caption" color="#fff">
                        {srv.badge}
                      </AppText>
                    </View>
                  )}
                </View>
                <AppText variant="caption" color={colors.textTertiary}>
                  {srv.desc}
                </AppText>
              </View>
              <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
            </Card>
          ))}
        </View>

        {/* More services — grid */}
        <SectionHeader title="خدمات إضافية" />
        <View
          style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}
        >
          {MORE_SERVICES.map((srv, i) => (
            <Card
              key={i}
              onPress={() => router.push(srv.route as any)}
              style={[st.gridCard]}
            >
              <View
                style={[st.gridIcon, { backgroundColor: srv.color + "18" }]}
              >
                <Icon name={srv.icon} size={24} color={srv.color} />
              </View>
              <AppText variant="labelSM" align="center" numberOfLines={1}>
                {srv.title}
              </AppText>
              <AppText
                variant="caption"
                color={colors.textTertiary}
                align="center"
                numberOfLines={2}
              >
                {srv.desc}
              </AppText>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 4,
  },
  srvIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  gridCard: { width: "47%", alignItems: "center", gap: 6, paddingVertical: 16 },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
