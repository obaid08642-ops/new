// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, Input, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';

export default function DiagSearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [q, setQ] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/labs/services");
        if (res && Array.isArray(res?.data) && res?.data.length > 0) {
          setTests(
            res?.data.map((t: any) => ({
              id: t._id || t.id,
              name: pickLocalized(t.name_ar, t.name),
              price: t.price || t.base_price || 0,
              category: pickLocalized(t.category_ar, t.category) || "",
            })),
          );
        }
      } catch {
        // keep static fallback
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = q ? tests.filter((t) => t.name.includes(q)) : tests;

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
        <View style={{ flex: 1 }}>
          <Input
            value={q}
            onChangeText={setQ}
            placeholder="ابحث عن تحليل..."
            icon="search"
            autoFocus
          />
        </View>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        >
          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Icon name="science" size={48} color={colors.textTertiary} />
              <AppText variant="h5" style={{ marginTop: 12 }}>
                لا توجد نتائج
              </AppText>
            </View>
          ) : (
            filtered.map((t) => (
              <Card
                key={t.id}
                onPress={() =>
                  router.push({
                    pathname: "/diagnostics/test-detail",
                    params: { testId: t.id },
                  })
                }
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={[st.icon, { backgroundColor: "#7A6BEA18" }]}>
                  <Icon name="science" size={22} color="#7A6BEA" />
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <AppText variant="h6">{t.name}</AppText>
                  {t.category ? (
                    <AppText variant="caption" color={colors.textTertiary}>
                      {t.category}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="h5" color={colors.primary}>
                  {t.price} ر.س
                </AppText>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
