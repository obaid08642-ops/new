// @ts-nocheck
// app/reviews/index.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

const ASPECTS = [
  "الدقة في المعلومات",
  "الوضوح في الشرح",
  "الاهتمام بالمريض",
  "سرعة الاستجابة",
];

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const params = useLocalSearchParams();
  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>(
    {},
  );
  const [review, setReview] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setAspect = (aspect: string, rating: number) =>
    setAspectRatings((p) => ({ ...p, [aspect]: rating }));

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => router.back(), 1500);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={StyleSheet.absoluteFillObject} />
        <Icon name="star" size={20} color={colors.primary} />
        <AppText variant="bodySM">شكراً على تقييمك!</AppText>
        <AppText variant="bodySM">تقييمك يساعد في تحسين الخدمة للجميع</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">تقييم الخدمة</AppText>
          <View style={{ width: 36 }} />
        </View>
        <AppText variant="bodySM">
          {params.doctorName || "د. أحمد محمد السيد"}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Rating */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">التقييم العام</AppText>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setOverallRating(star)}
              >
                <Icon name={star <= overallRating ? 'star' : 'star_border'} size={32} color={star <= overallRating ? '#F59E0B' : colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
          {overallRating > 0 && (
            <AppText variant="bodySM">
              {
                ["", "سيء", "مقبول", "جيد", "ممتاز", "رائع جداً!"][
                  overallRating
                ]
              }
            </AppText>
          )}
        </View>

        {/* Aspect Ratings */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">تفاصيل التقييم</AppText>
          {ASPECTS.map((aspect) => (
            <View
              key={aspect}
              style={[styles.aspectRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.miniStars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setAspect(aspect, s)}
                  >
                    <Icon name={s <= (aspectRatings[aspect] || 0) ? 'star' : 'star_border'} size={18} color={s <= (aspectRatings[aspect] || 0) ? '#F59E0B' : colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
              <AppText variant="bodySM">{aspect}</AppText>
            </View>
          ))}
        </View>

        {/* Written review */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">أضف تعليقاً</AppText>
          <TextInput
            style={[
              styles.reviewInput,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: isDark
                  ? colors.background
                  : colors.backgroundSecondary,
              },
            ]}
            value={review}
            onChangeText={setReview}
            placeholder="شارك تجربتك مع الآخرين..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            textAlign="right"
          />
          <TouchableOpacity
            onPress={() => setAnonymous(!anonymous)}
            style={styles.anonRow}
          >
            <View
              style={[
                styles.anonCheck,
                {
                  backgroundColor: anonymous ? colors.primary : "transparent",
                  borderColor: anonymous ? colors.primary : colors.border,
                },
              ]}
            >
              {anonymous && <Icon name="check" size={12} color="#fff" />}
            </View>
            <AppText variant="bodySM">نشر التقييم بشكل مجهول</AppText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={overallRating === 0}
          activeOpacity={0.85}
          style={{ opacity: overallRating === 0 ? 0.5 : 1 }}
        >
          <View style={styles.submitBtn}>
            <AppText variant="bodySM">إرسال التقييم</AppText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  successTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  successSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "400",
  },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 14,
  },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8 },
  starIcon: { fontSize: 42 },
  ratingLabel: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  aspectRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  aspectLabel: { fontSize: 13, fontWeight: "700" },
  miniStars: { flexDirection: "row", gap: 4 },
  reviewInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    minHeight: 90,
    fontSize: 13,
    fontWeight: "400",
  },
  anonRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  anonCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  anonText: { fontSize: 13, fontWeight: "400" },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
