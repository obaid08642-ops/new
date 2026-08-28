// @ts-nocheck
// app/articles/index.tsx — Health articles hub (REAL: GET /articles + /articles/categories)
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
import {
  AppText,
  Card,
  Badge,
  IconButton,
  Input,
  Button,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

export default function ArticlesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = useCallback(async (category = activeCategory, q = search) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "30");
      const res = await apiFetch(`/articles?${params.toString()}`);
      setArticles(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      setError(e?.message || "تعذر تحميل المقالات");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    apiFetch("/articles/categories")
      .then((res) => setCategories(Array.isArray(res) ? res.filter(Boolean) : []))
      .catch(() => setCategories([]));
    load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickCategory = (c: string) => {
    const next = activeCategory === c ? "" : c;
    setActiveCategory(next);
    load(next, search);
  };

  const submitSearch = () => load(activeCategory, search);

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
        <IconButton icon="back" onPress={() => router.back()} />
        <AppText variant="h4">مقالات صحية</AppText>
        <IconButton icon="bookmark" onPress={() => router.push("/articles/bookmarks")} />
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث في المقالات…"
          icon="search"
          onSubmitEditing={submitSearch}
          returnKeyType="search"
        />
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row-reverse", gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {categories.map((c) => {
            const active = activeCategory === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => pickCategory(c)}
                style={[
                  st.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText variant="labelSM" color={active ? "#fff" : colors.textPrimary}>
                  {c}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 }}>
          <Icon name="warning" size={44} color={colors.textTertiary} />
          <AppText variant="bodySM" color={colors.textSecondary} align="center">{error}</AppText>
          <Button label="إعادة المحاولة" variant="gradient" icon="refresh" onPress={() => load()} />
        </View>
      ) : articles.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 }}>
          <Icon name="document" size={44} color={colors.textTertiary} />
          <AppText variant="bodySM" color={colors.textTertiary} align="center">
            {search || activeCategory
              ? "لا توجد مقالات مطابقة — جرّب بحثاً أو تصنيفاً آخر"
              : "لا توجد مقالات منشورة بعد"}
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 30 }}>
          {articles.map((a) => (
            <TouchableOpacity
              key={a.id || a.slug}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/articles/[slug]", params: { slug: a.slug } })}
            >
              <Card padding={0} style={{ overflow: "hidden" }}>
                {!!a.cover_image && (
                  <Image source={{ uri: a.cover_image }} style={{ width: "100%", height: 150 }} resizeMode="cover" />
                )}
                <View style={{ padding: 14, gap: 8, alignItems: "flex-end" }}>
                  {!!a.category && <Badge label={a.category} color={colors.primary} />}
                  <AppText variant="h6" style={{ textAlign: "right" }}>
                    {pickLocalized(a.title_ar, a.title_en)}
                  </AppText>
                  {!!(pickLocalized(a.excerpt_ar, a.excerpt_en)) && (
                    <AppText variant="bodySM" color={colors.textSecondary} numberOfLines={2} style={{ textAlign: "right" }}>
                      {pickLocalized(a.excerpt_ar, a.excerpt_en)}
                    </AppText>
                  )}
                  <View style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center" }}>
                    {!!a.author_name && (
                      <View style={{ flexDirection: "row-reverse", gap: 4, alignItems: "center" }}>
                        <Icon name="doctor" size={14} color={colors.textTertiary} />
                        <AppText variant="caption" color={colors.textTertiary}>{a.author_name}</AppText>
                      </View>
                    )}
                    {a.views != null && (
                      <View style={{ flexDirection: "row-reverse", gap: 4, alignItems: "center" }}>
                        <Icon name="eye" size={14} color={colors.textTertiary} />
                        <AppText variant="caption" color={colors.textTertiary}>{a.views}</AppText>
                      </View>
                    )}
                    {!!a.published_at && (
                      <AppText variant="caption" color={colors.textTertiary}>
                        {new Date(a.published_at).toLocaleDateString(dateLocale())}
                      </AppText>
                    )}
                  </View>
                </View>
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
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
