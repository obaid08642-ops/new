// @ts-nocheck
// app/loyalty/leaderboard.tsx
import React from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
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

const LEADERS = [
  {
    rank: 1,
    name: "سارة العتيبي",
    pts: 18_420,
    tier: "diamond",
    emoji: "face_3",
    change: 0,
  },
  {
    rank: 2,
    name: "محمد القحطاني",
    pts: 16_800,
    tier: "diamond",
    emoji: "face",
    change: +1,
  },
  {
    rank: 3,
    name: "فاطمة السيد",
    pts: 15_200,
    tier: "diamond",
    emoji: "face_3",
    change: -1,
  },
  {
    rank: 4,
    name: "أحمد العتيبي (أنت)",
    pts: 4_850,
    tier: "workspace_premium",
    emoji: "face_6",
    change: +3,
    isMe: true,
  },
  {
    rank: 5,
    name: "خالد المطيري",
    pts: 4_200,
    tier: "workspace_premium",
    emoji: "face",
    change: 0,
  },
  {
    rank: 6,
    name: "نورة الغامدي",
    pts: 3_800,
    tier: "workspace_premium",
    emoji: "face_3",
    change: -2,
  },
  {
    rank: 7,
    name: "عبدالله الدوسري",
    pts: 3_100,
    tier: "military_tech",
    emoji: "face",
    change: +1,
  },
];

const TIER_COLORS = {
  diamond: "#23B5CE",
  emoji_events: "#F0A526",
  workspace_premium: "#8B9DB0",
  military_tech: "#CD7C3C",
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const top3 = LEADERS.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            لوحة المتصدرين
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
      </View>
      {/* Podium Area */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.surface : "#1E293B",
            borderRadius: 24,
            marginHorizontal: 16,
            marginTop: 12,
          },
        ]}
      >
        {/* Podium */}
        <View style={styles.podium}>
          {/* 2nd */}
          <View style={[styles.podiumItem, { marginTop: 20 }]}>
            <Icon name={top3[1].emoji as any} size={32} color="#fff" />
            <View
              style={[
                styles.podiumBase,
                { height: 70, backgroundColor: "#8B9DB0" },
              ]}
            >
              <AppText variant="bodySM">2</AppText>
            </View>
            <AppText variant="bodySM">{top3[1].name.split(" ")[0]}</AppText>
            <AppText variant="bodySM">
              {(top3[1].pts / 1000).toFixed(1)}k
            </AppText>
          </View>
          {/* 1st */}
          <View style={[styles.podiumItem, { marginTop: 0 }]}>
            <Icon name="workspace_premium" size={24} color="#F0A526" />
            <Icon name={top3[0].emoji as any} size={40} color="#fff" />
            <View
              style={[
                styles.podiumBase,
                { height: 100, backgroundColor: "#F0A526" },
              ]}
            >
              <AppText variant="bodySM">1</AppText>
            </View>
            <AppText variant="bodySM">{top3[0].name.split(" ")[0]}</AppText>
            <AppText variant="bodySM">
              {(top3[0].pts / 1000).toFixed(1)}k
            </AppText>
          </View>
          {/* 3rd */}
          <View style={[styles.podiumItem, { marginTop: 30 }]}>
            <Icon name={top3[2].emoji as any} size={32} color="#fff" />
            <View
              style={[
                styles.podiumBase,
                { height: 55, backgroundColor: "#CD7C3C" },
              ]}
            >
              <AppText variant="bodySM">3</AppText>
            </View>
            <AppText variant="bodySM">{top3[2].name.split(" ")[0]}</AppText>
            <AppText variant="bodySM">
              {(top3[2].pts / 1000).toFixed(1)}k
            </AppText>
          </View>
        </View>
      </View>

      <FlatList
        data={LEADERS.slice(3)}
        keyExtractor={(l) => l.rank.toString()}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.leaderRow,
              {
                backgroundColor: item.isMe
                  ? colors.primarySurface
                  : isDark
                    ? colors.surface
                    : colors.white,
                borderWidth: item.isMe ? 1.5 : 0,
                borderColor: colors.primary,
              },
            ]}
          >
            <AppText variant="bodySM">
              {item.change > 0
                ? `↑${item.change}`
                : item.change < 0
                  ? `↓${Math.abs(item.change)}`
                  : "—"}
            </AppText>
            <AppText variant="bodySM">{item.pts.toLocaleString()}</AppText>
            <View style={styles.leaderInfo}>
              <AppText variant="bodySM">
                {item.name} {item.isMe ? "← أنت" : ""}
              </AppText>
              <AppText variant="bodySM">{item.tier}</AppText>
            </View>
            <View
              style={[
                styles.rankBadge,
                { backgroundColor: isDark ? colors.background : "#F1F5F9" },
              ]}
            >
              <AppText variant="bodySM">#{item.rank}</AppText>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 8,
    paddingBottom: 8,
  },
  podiumItem: { alignItems: "center", gap: 4, width: 90 },
  crownEmoji: { fontSize: 22 },
  podiumEmoji: { fontSize: 30 },
  podiumBase: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  podiumRank: { color: "#fff", fontSize: 22, fontFamily: "Cairo-ExtraBold" },
  podiumName: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  podiumPts: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "400",
  },
  leaderRow: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNum: { fontSize: 13, fontWeight: "800" },
  leaderInfo: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  leaderName: { flex: 1, fontSize: 13, textAlign: "right" },
  leaderTier: { fontSize: 16 },
  leaderPts: {
    fontSize: 13,
    fontFamily: "Cairo-ExtraBold",
    width: 55,
    textAlign: "center",
  },
  changeIndicator: {
    fontSize: 10,
    fontWeight: "800",
    width: 24,
    textAlign: "center",
  },
});
