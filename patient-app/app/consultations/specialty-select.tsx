// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import { AppText, Card, Input, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";



export default function SpecialtySelectScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [q, setQ] = useState("");
  const DEFAULT_SPECIALTIES = [
    { slug: 'general', name_ar: 'الطب العام والأسرة', count: 45 },
    { slug: 'physiotherapy', name_ar: 'العلاج الطبيعي والتأهيل', count: 28 },
    { slug: 'dental', name_ar: 'طب وجراحة الأسنان', count: 34 },
    { slug: 'dermatology', name_ar: 'الأمراض الجلدية والتجميل', count: 32 },
    { slug: 'ophthalmology', name_ar: 'طب وجراحة العيون', count: 19 },
    { slug: 'pediatrics', name_ar: 'طب الأطفال وحديثي الولادة', count: 40 },
    { slug: 'cardiology', name_ar: 'أمراض القلب والأوعية الدموية', count: 22 },
    { slug: 'obgyn', name_ar: 'النساء والولادة', count: 38 },
    { slug: 'orthopedics', name_ar: 'جراحة العظام والمفاصل', count: 26 },
    { slug: 'psychiatry', name_ar: 'الطب النفسي والاستشارات', count: 24 },
  ];

  React.useEffect(() => {
    apiFetch('/care/specialties')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(list) && list.length > 0) setSpecs(list);
        else setSpecs(DEFAULT_SPECIALTIES);
      })
      .catch(() => setSpecs(DEFAULT_SPECIALTIES));
  }, []);

  const filtered = q ? specs.filter((s) => s.name_ar.includes(q)) : specs;

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <AppText variant="h4">التخصصات الطبية</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Input
          value={q}
          onChangeText={setQ}
          placeholder="ابحث عن تخصص..."
          icon="search"
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
      >
        {filtered.map((sp, idx) => {
          const colorList = ['#23B5CE', '#00C9A7', '#7A6BEA', '#F0695C', '#F0A526', '#EC4899'];
          const color = colorList[idx % colorList.length];
          return (
          <Card
            key={sp.slug || idx}
            onPress={() =>
              router.push({
                pathname: "/consultations/doctor-search",
                params: { specialty: sp.name_ar },
              })
            }
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={[st.spIcon, { backgroundColor: color + "18" }]}>
              <Icon name="stethoscope" size={24} color={color} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText variant="h6">{sp.name_ar}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {sp.count} طبيب متاح
              </AppText>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
          </Card>
        )})}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  spIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
