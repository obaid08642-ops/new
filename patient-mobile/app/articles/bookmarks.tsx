// @ts-nocheck
// app/articles/bookmarks.tsx — My saved articles (REAL: GET /articles/bookmarks/mine)
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, Badge, IconButton, Button } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';

export default function ArticleBookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/articles/bookmarks/mine");
      setArticles(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || "تعذر تحميل المحفوظات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <View style={{ width: 40 }} />
        <AppText variant="h4">مقالاتي المحفوظة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 }}>
          <Icon name="warning" size={44} color={colors.textTertiary} />
          <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>
          <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={load} />
        </View>
      ) : articles.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 }}>
          <Icon name="bookmark-outline" size={44} color={colors.textTertiary} />
          <AppText variant="bodySM" color={colors.textTertiary} align="center">
            لم تحفظ أي مقال بعد — احفظ مقالاتك المفضلة لتجدها هنا
          </AppText>
          <Button label="تصفح المقالات" variant="gradient" icon="document" onPress={() => router.push("/articles")} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 30 }}>
          {articles.map((a) => (
            <TouchableOpacity
              key={a.id || a.slug}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/articles/[slug]", params: { slug: a.slug } })}
            >
              <Card style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center" }}>
                {!!a.cover_image && (
                  <Image source={{ uri: a.cover_image }} style={{ width: 64, height: 64, borderRadius: 14 }} resizeMode="cover" />
                )}
                <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
                  <AppText variant="labelMD" numberOfLines={2} style={{ textAlign: "right" }}>
                    {pickLocalized(a.title_ar, a.title_en)}
                  </AppText>
                  {!!a.category && <Badge label={a.category} color={colors.primary} />}
                </View>
                <Icon name="bookmark" size={20} color={colors.primary} />
              </Card>
            </TouchableOpacity>
          ))}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
});
