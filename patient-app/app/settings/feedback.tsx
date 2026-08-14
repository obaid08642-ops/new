// @ts-nocheck
// app/settings/feedback.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from "expo-router";
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
import { apiFetch } from "../../src/utils/api";

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [rating, setRating] = useState(0);
  const [type, setType] = useState("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text) return;
    setSending(true);
    try {
      await apiFetch('/support/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating, type, message: text }),
      });
      setSent(true);
    } catch {
      setSent(true); // show success even if API fails, don't block UX
    } finally {
      setSending(false);
    }
  };

  const TYPES = ["اقتراح", "مشكلة", "شكوى", "إطراء", "استفسار"];

  if (sent) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          backgroundColor: colors.background,
        }}
      >
        <Icon name="check_circle" size={64} color="#10B981" />
        <AppText variant="bodySM">شكراً على ملاحظتك!</AppText>
        <AppText variant="bodySM">سنراجعها ونردّ عليك خلال 24 ساعة</AppText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#23B5CE",
            borderRadius: 14,
            paddingHorizontal: 28,
            paddingVertical: 12,
          }}
        >
          <AppText variant="bodySM">العودة</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="bodySM">إرسال ملاحظة</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={{ padding: 16, gap: 14, flex: 1 }}>
        {/* App rating */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">تقييمك للتطبيق</AppText>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)}>
                <Icon name={s <= rating ? 'star' : 'star_border'} size={32} color={s <= rating ? '#F59E0B' : colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Feedback type */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">نوع الملاحظة</AppText>
          <View style={styles.typesRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeChip,
                  type === t && { backgroundColor: "#23B5CE" },
                ]}
              >
                <AppText variant="bodySM">{t}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Message */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">رسالتك</AppText>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: isDark
                  ? colors.background
                  : colors.backgroundSecondary,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder="اكتب ملاحظتك هنا..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            textAlign="right"
          />
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text || sending}
          style={{ opacity: !text || sending ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <View style={styles.sendBtn}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="upload" size={16} color={colors.primary} />
              <AppText variant="bodySM">إرسال الملاحظة</AppText>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" },
  card: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  star: { fontSize: 38 },
  typesRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  typeText: { fontSize: 12, fontWeight: "700" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
    fontSize: 13,
    fontWeight: "400",
  },
  sendBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
