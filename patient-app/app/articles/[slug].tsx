// @ts-nocheck
// app/articles/[slug].tsx — Article detail (REAL: GET /articles/:slug + bookmarks)
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
  Share,
  TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, Badge, IconButton, Button } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

export default function ArticleDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { slug } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [bookmarked, setBookmarked] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/articles/${encodeURIComponent(String(slug))}`);
      setArticle(res);
      // Related: same category, exclude self — real data, honest if empty
      if (res?.category) {
        const rel = await apiFetch(`/articles?category=${encodeURIComponent(res.category)}&limit=4`).catch(() => []);
        setRelated((Array.isArray(rel) ? rel : []).filter((r: any) => r.slug !== res.slug).slice(0, 3));
      }
      // Bookmark status (auth only — failure just means not logged in)
      const st = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/status`).catch(() => null);
      setBookmarked(!!st?.bookmarked);
    } catch (e: any) {
      setError(e?.message || "تعذر تحميل المقال");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const toggleBookmark = async () => {
    try {
      const res = await apiFetch(`/articles/bookmarks/${encodeURIComponent(String(slug))}/toggle`, { method: "POST" });
      setBookmarked(!!res?.bookmarked);
    } catch { /* guest or network — keep current state */ }
  };

  const share = async () => {
    if (!article) return;
    try {
      await Share.share({ message: `${pickLocalized(article.title_ar, article.title_en)}\nhttps://nabdahplus.com/articles/${article.slug}` });
    } catch {}
  };

  if (loading) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 }]}>
        <Icon name="warning" size={44} color={colors.textTertiary} />
        <AppText variant="bodySM" color={colors.textSecondary} align="center">{error || "المقال غير موجود"}</AppText>
        <Button label="العودة" variant="gradient" icon="back" onPress={() => router.back()} />
      </View>
    );
  }

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
        <View style={{ flexDirection: "row", gap: 4 }}>
          <IconButton icon="share" onPress={share} />
          <IconButton icon={bookmarked ? "bookmark" : "bookmark-outline"} color={bookmarked ? colors.primary : undefined} onPress={toggleBookmark} />
        </View>
        <AppText variant="h4" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
          مقال
        </AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {!!article.cover_image && (
          <Image source={{ uri: article.cover_image }} style={{ width: "100%", height: 210 }} resizeMode="cover" />
        )}
        <View style={{ padding: 16, gap: 12, alignItems: "flex-end" }}>
          {!!article.category && <Badge label={article.category} color={colors.primary} />}
          <AppText variant="h3" style={{ textAlign: "right" }}>
            {pickLocalized(article.title_ar, article.title_en)}
          </AppText>

          {/* Author + meta */}
          <View style={{ flexDirection: "row-reverse", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            {!!article.author_name && (
              <View style={{ flexDirection: "row-reverse", gap: 6, alignItems: "center" }}>
                <Icon name="doctor" size={16} color={colors.primary} />
                <AppText variant="bodySM" color={colors.textSecondary}>
                  {article.author_name}{article.author_title ? ` — ${article.author_title}` : ""}
                </AppText>
              </View>
            )}
            {!!article.published_at && (
              <AppText variant="caption" color={colors.textTertiary}>
                {new Date(article.published_at).toLocaleDateString(dateLocale())}
              </AppText>
            )}
            {article.views != null && (
              <AppText variant="caption" color={colors.textTertiary}>{article.views} مشاهدة</AppText>
            )}
          </View>

          {/* Body */}
          <AppText variant="bodyMD" color={colors.textPrimary} style={{ textAlign: "right", lineHeight: 28 }}>
            {pickLocalized(article.body_ar, article.body_en) || article.excerpt_ar || ""}
          </AppText>

          {/* Tags */}
          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              {article.tags.map((t: string, i: number) => (
                <Badge key={i} label={`#${t}`} color={colors.textSecondary} bg={colors.surfaceSecondary} />
              ))}
            </View>
          )}

          {/* Related */}
          {related.length > 0 && (
            <View style={{ width: "100%", marginTop: 10, gap: 10 }}>
              <AppText variant="h6" style={{ textAlign: "right" }}>مقالات ذات صلة</AppText>
              {related.map((r) => (
                <TouchableOpacity
                  key={r.slug}
                  activeOpacity={0.85}
                  onPress={() => router.replace({ pathname: "/articles/[slug]", params: { slug: r.slug } })}
                >
                  <Card style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center" }}>
                    {!!r.cover_image && (
                      <Image source={{ uri: r.cover_image }} style={{ width: 56, height: 56, borderRadius: 12 }} resizeMode="cover" />
                    )}
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <AppText variant="labelMD" numberOfLines={2} style={{ textAlign: "right" }}>
                        {pickLocalized(r.title_ar, r.title_en)}
                      </AppText>
                      {!!r.category && (
                        <AppText variant="caption" color={colors.textTertiary}>{r.category}</AppText>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
});
