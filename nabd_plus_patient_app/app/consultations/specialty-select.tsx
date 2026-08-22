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
  const [specs, setSpecs] = useState<any[]>([]);
  const [loadError, setLoadError] = useState(false);

  const loadSpecs = React.useCallback(() => {
    setLoadError(false);
    apiFetch('/care/specialties')
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        // Real specialties with live counts only — never a fabricated fallback list
        setSpecs(Array.isArray(list) ? list : []);
      })
      .catch(() => { setSpecs([]); setLoadError(true); });
  }, []);

  React.useEffect(() => { loadSpecs(); }, [loadSpecs]);

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
        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 40 }}>
            <Icon name="stethoscope" size={40} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textTertiary} align="center">
              {loadError ? 'تعذر تحميل التخصصات. تحقق من اتصالك.' : 'لا توجد تخصصات مطابقة'}
            </AppText>
            {loadError && (
              <AppText variant="labelMD" color={colors.primary} onPress={loadSpecs}>إعادة المحاولة</AppText>
            )}
          </View>
        )}
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
