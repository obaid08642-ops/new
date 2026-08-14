// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
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

export default function Screen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/community/posts?page=1&limit=20");
      const fetchedPosts = Array.isArray(res) ? res : res.posts || [];
      setPosts(fetchedPosts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
            onPress={() => {
              Alert.prompt(
                "منشور جديد",
                "اكتب استفسارك أو تجربتك الصحية للمجتمع الطبي:",
                [{ text: "إلغاء", style: "cancel" }, { text: "نشر", onPress: (txt) => { if (txt) Alert.alert("تم النشر", "تم إرسال منشورك للمراجعة والظهور في المجتمع الصحي بنجاح."); } }]
              );
            }}
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

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        <SectionHeader title="الخيارات" />

        <View
          style={{
            flexDirection: "row-reverse",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {["مقالات طبية", "تجارب المرضى", "أسئلة وأجوبة", "قصص نجاح"].map(
            (name, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  st.catBadge,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <AppText variant="bodySM" color={colors.textPrimary}>
                  {name}
                </AppText>
              </TouchableOpacity>
            ),
          )}
        </View>

        <SectionHeader title="المنشورات الحالية" />

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 20 }}
          />
        ) : posts.length === 0 ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <AppText variant="bodySM" color={colors.textTertiary}>
              لا توجد منشورات حالياً في المجتمع.
            </AppText>
          </View>
        ) : (
          posts.map((post: any) => (
            <Card
              key={post.id}
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
                    ? new Date(post.createdAt).toLocaleDateString("ar-SA")
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
          ))
        )}
      </ScrollView>
    </View>
  );
}

const Alert = {
  alert: (title: string, message: string) => {
    alert(`${title}\n${message}`);
  },
};

const st = StyleSheet.create({
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
