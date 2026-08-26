// @ts-nocheck
import React, { useState, useEffect } from "react";
import { FlatList,
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Button,
  IconButton,
  SectionHeader,
  Badge,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function Screen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Real server-side categories from the community module
  const CATEGORIES: { key: string; label: string }[] = [
    { key: "", label: "الكل" },
    { key: "health-tip", label: "مقالات طبية" },
    { key: "experience", label: "تجارب المرضى" },
    { key: "question", label: "أسئلة وأجوبة" },
  ];
  const [activeCategory, setActiveCategory] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [postText, setPostText] = useState("");
  const [postCategory, setPostCategory] = useState("question");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadPosts(activeCategory);
  }, [activeCategory]);

  const loadPosts = async (category = "") => {
    try {
      setLoading(true);
      const qs = category ? `&category=${encodeURIComponent(category)}` : "";
      const res = await apiFetch(`/community/posts?page=1&limit=20${qs}`);
      const fetchedPosts = Array.isArray(res) ? res : res.posts || [];
      setPosts(fetchedPosts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async () => {
    const txt = postText.trim();
    if (!txt || publishing) return;
    setPublishing(true);
    try {
      await apiFetch("/community/posts", {
        method: "POST",
        body: JSON.stringify({ title: txt.slice(0, 80), body: txt, category: postCategory }),
      });
      setShowComposer(false);
      setPostText("");
      showLocalizedAlert("تم النشر", "تم إرسال منشورك للمراجعة والظهور في المجتمع الصحي.");
      loadPosts(activeCategory);
    } catch (e: any) {
      showLocalizedAlert("تعذر النشر", e?.message || "حدث خطأ أثناء نشر المنشور.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <IconButton
            icon="add"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => setShowComposer(true)}
          />
          <AppText variant="h4" color="#fff">
            المجتمع الصحي
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post: any) => String(post.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <View>
              <SectionHeader title="الخيارات" />
              <View
                style={{
                  flexDirection: "row-reverse",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key || "all"}
                      onPress={() => setActiveCategory(cat.key)}
                      style={[
                        st.catBadge,
                        {
                          backgroundColor: isActive ? colors.primary : colors.surface,
                          borderColor: isActive ? colors.primary : colors.borderLight,
                        },
                      ]}
                    >
                      <AppText variant="bodySM" color={isActive ? "#fff" : colors.textPrimary}>
                        {cat.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <SectionHeader title="المنشورات الحالية" />
            </View>
          }
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: "center" }}>
              <AppText variant="bodySM" color={colors.textTertiary}>
                لا توجد منشورات حالياً في المجتمع.
              </AppText>
            </View>
          }
          renderItem={({ item: post }: { item: any }) => (
            <Card
              onPress={() =>
                router.push({
                  pathname: "/community/post-detail",
                  params: { id: post.id, title: post.title },
                })
              }
              style={st.postCard}
            >
              <View style={st.postHdr}>
                <Badge label={post.category || "عام"} color={colors.primary} />
                <AppText variant="caption" color={colors.textTertiary}>
                  {post.createdAt
                    ? new Date(post.createdAt).toLocaleDateString(dateLocale())
                    : "الآن"}
                </AppText>
              </View>
              <AppText
                variant="h6"
                style={{ marginTop: 8, textAlign: "right" }}
              >
                {post.title}
              </AppText>
              <AppText
                variant="bodySM"
                color={colors.textSecondary}
                numberOfLines={2}
                style={{ marginTop: 4, textAlign: "right" }}
              >
                {post.body}
              </AppText>
              <View
                style={[st.postFooter, { borderTopColor: colors.borderLight }]}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon name="chat" size={14} color={colors.textTertiary} />
                  <AppText variant="caption" color={colors.textTertiary}>
                    {post.comment_count || 0}
                  </AppText>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Icon name="favorite" size={14} color={colors.error} />
                  <AppText variant="caption" color={colors.textTertiary}>
                    {post.upvotes || 0}
                  </AppText>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* New-post composer — works on both iOS and Android (Alert.prompt is iOS-only) */}
      <Modal visible={showComposer} transparent animationType="slide" onRequestClose={() => setShowComposer(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={st.composerOverlay}>
            <View style={[st.composerCard, { backgroundColor: colors.surface }]}>
              <AppText variant="h5" style={{ textAlign: "right", marginBottom: 10 }}>منشور جديد</AppText>
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {CATEGORIES.filter((c) => c.key).map((c) => {
                  const isActive = postCategory === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setPostCategory(c.key)}
                      style={[st.catBadge, { backgroundColor: isActive ? colors.primary : colors.surfaceSecondary, borderColor: isActive ? colors.primary : colors.borderLight }]}
                    >
                      <AppText variant="caption" color={isActive ? "#fff" : colors.textSecondary}>{c.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={postText}
                onChangeText={setPostText}
                placeholder="اكتب استفسارك أو تجربتك الصحية للمجتمع الطبي..."
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[st.composerInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                textAlign="right"
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button
                  label={publishing ? "جاري النشر..." : "نشر"}
                  variant="primary"
                  icon="send"
                  onPress={publishPost}
                  disabled={!postText.trim() || publishing}
                  style={{ flex: 1 }}
                />
                <Button label="إلغاء" variant="ghost" onPress={() => setShowComposer(false)} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  composerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  composerCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  composerInput: { minHeight: 110, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 14, textAlignVertical: "top" },
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  postCard: { padding: 14, gap: 4 },
  postHdr: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postFooter: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    gap: 16,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
});
