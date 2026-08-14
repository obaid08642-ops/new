// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();

  const postId = (params.id as string) || "";
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    if (postId) {
      loadPostDetail();
    } else {
      setLoading(false);
    }
  }, [postId]);

  const loadPostDetail = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/community/posts/${postId}`);
      setPost(res.post);
      setComments(res.comments || []);
      setVoteCount(res.post?.upvotes || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!postId) return;
    const nextVote = voted === "up" ? "down" : "up";
    try {
      await apiFetch(`/community/posts/${postId}/vote`, {
        method: "PUT",
        body: JSON.stringify({ vote: nextVote }),
      });
      setVoted(nextVote === "up" ? "up" : null);
      setVoteCount((prev) => (nextVote === "up" ? prev + 1 : prev - 1));
    } catch (err: any) {
      Alert.alert("تنبيه", err.message || "فشل عملية التصويت");
    }
  };

  const sendComment = async () => {
    if (!comment.trim() || !postId) return;
    try {
      const res = await apiFetch(`/community/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ body: comment.trim(), is_anonymous: false }),
      });
      setComments((prev) => [...prev, res]);
      setComment("");
    } catch (err: any) {
      Alert.alert("خطأ", err.message || "فشل إضافة التعليق");
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayTitle =
    post?.title || (params.title as string) || "تفاصيل المنشور";
  const displayBody = post?.body || "لا يوجد محتوى للمنشور.";
  const authorName = post?.is_anonymous ? "عضو مجهول" : "طبيب معتمد";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="bodySM">المنشور</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Post Content */}
        <View
          style={[
            styles.postCard,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <View style={styles.authorRow}>
            <AppText variant="bodySM">
              {post?.createdAt
                ? new Date(post.createdAt).toLocaleDateString("ar-SA")
                : "الآن"}
            </AppText>
            <View style={styles.authorInfo}>
              <AppText variant="bodySM">{authorName}</AppText>
              <AppText variant="bodySM">{post?.category || "عام"}</AppText>
            </View>
            <View style={[styles.authorAvatar, { backgroundColor: "#EBF3FF" }]}>
              <Icon name="doctor" size={20} color={colors.primary} />
            </View>
          </View>

          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: colors.primarySurface },
            ]}
          >
            <AppText variant="bodySM">{post?.category || "نقاش"}</AppText>
          </View>

          <AppText variant="h5" style={{ marginVertical: 8 }}>
            {displayTitle}
          </AppText>
          <AppText variant="bodySM">{displayBody}</AppText>

          {/* Post Actions */}
          <View style={[styles.postActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="share" size={18} color={colors.textTertiary} />
              <AppText variant="bodySM">مشاركة</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="chat" size={18} color={colors.textTertiary} />
              <AppText variant="bodySM">{comments.length} تعليق</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleVote}>
              <Icon
                name="favorite"
                size={20}
                color={voted === "up" ? colors.error : colors.textTertiary}
              />
              <AppText variant="bodySM">{voteCount}</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View style={{ padding: 16, gap: 10 }}>
          <AppText variant="bodySM">التعليقات ({comments.length})</AppText>
          {comments.map((cmt) => (
            <View
              key={cmt.id}
              style={[
                styles.commentCard,
                { backgroundColor: isDark ? colors.surface : colors.white },
              ]}
            >
              <AppText variant="bodySM">{cmt.body}</AppText>
              <View style={styles.commentMeta}>
                <View
                  style={[
                    styles.commentLike,
                    {
                      backgroundColor: isDark
                        ? colors.background
                        : colors.backgroundSecondary,
                    },
                  ]}
                >
                  <Icon name="favorite" size={12} color={colors.textTertiary} />
                  <AppText variant="bodySM">{cmt.upvotes || 0}</AppText>
                </View>
                <AppText variant="bodySM">
                  {cmt.createdAt
                    ? new Date(cmt.createdAt).toLocaleDateString("ar-SA")
                    : "الآن"}
                </AppText>
                <AppText variant="bodySM">
                  {cmt.is_anonymous ? "مجهول" : "عضو"}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View
        style={[
          styles.commentInput,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={sendComment}
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name="send" size={16} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.commentTextInput,
            {
              color: colors.textPrimary,
              backgroundColor: isDark
                ? colors.background
                : colors.backgroundSecondary,
            },
          ]}
          value={comment}
          onChangeText={setComment}
          placeholder="أضف تعليقاً..."
          placeholderTextColor={colors.textTertiary}
          textAlign="right"
          onSubmitEditing={sendComment}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" },
  postCard: {
    margin: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  authorRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  authorInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  postActions: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    borderStyle: "solid",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 16,
  },
  actionBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  categoryBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  commentCard: { padding: 12, borderRadius: 16, marginBottom: 8 },
  commentMeta: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  commentLike: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  commentTextInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginLeft: 10,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
