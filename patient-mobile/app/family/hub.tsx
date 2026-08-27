// @ts-nocheck
// app/family/hub.tsx
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Avatar,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

const QUICK: { icon: IconName; label: string; route: string; color: string }[] =
  [
    {
      icon: "userAdd",
      label: "دعوة فرد",
      route: "/family/invite",
      color: "#16A34A",
    },
    {
      icon: "qr-code-scanner",
      label: "الانضمام بكود",
      route: "/family/join",
      color: "#23B5CE",
    },
    {
      icon: "calendar",
      label: "تقويم مشترك",
      route: "/family/calendar",
      color: "#7A6BEA",
    },
    {
      icon: "chat",
      label: "محادثة عائلية",
      route: "/family/chat",
      color: "#F0A526",
    },
    {
      icon: "emergency",
      label: "جهات الطوارئ",
      route: "/family/emergency-contacts",
      color: "#F0695C",
    },
  ];

// Members fetched dynamically

export default function FamilyHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const mems = await apiFetch("/family/members");
      setMembers(mems && mems.length > 0 ? mems : []);
    } catch (err: any) {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View style={st.hdrRow}>
          <IconButton
            icon="add"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.push("/family/invite")}
          />
          <View style={{ alignItems: "center" }}>
            <AppText variant="h4" color="#fff">
              عائلتي
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              {loading ? "..." : `${members.length} أفراد`}
            </AppText>
          </View>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.push("/(tabs)/index" as any)}
          />
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        >
          {/* Quick actions */}
          <View style={st.grid}>
            {QUICK.map((q, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={() => router.push(q.route as any)}
                style={{ width: "30%", alignItems: "center", gap: 6 }}
              >
                <View style={[st.qIcon, { backgroundColor: q.color + "18" }]}>
                  <Icon name={q.icon} size={22} color={q.color} />
                </View>
                <AppText variant="labelSM" align="center" numberOfLines={1}>
                  {q.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Family members */}
          <SectionHeader title="أفراد العائلة" />
          {members.map((m) => {
            const isOwner = m.role === "owner";
            const color = isOwner ? "#7A6BEA" : "#23B5CE";
            const name =
              m.display_name || (isOwner ? "أنت (مالك المجموعة)" : "عضو عائلة");
            return (
              <Card
                key={m.user_id}
                onPress={() =>
                  router.push({
                    pathname: "/family/member-health",
                    params: { id: m.user_id, name: m.display_name || '', relation: m.relation || '' },
                  })
                }
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Avatar
                  size={52}
                  icon="user"
                  bg={color + "18"}
                  iconColor={color}
                />
                <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                  <AppText variant="h5">{name}</AppText>
                  <View style={{ flexDirection: "row-reverse", gap: 6 }}>
                    <Badge label={isOwner ? "مسؤول" : "عضو"} color={color} />
                    {m.joined_at && (
                      <Badge label="نشط" color={colors.success} />
                    )}
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  {!isOwner && (
                    <IconButton
                      icon="settings"
                      size={18}
                      onPress={() =>
                        router.push({
                          pathname: "/family/permissions",
                          params: { id: m.user_id, name: m.display_name || '', relation: m.relation || '' },
                        })
                      }
                    />
                  )}
                  <IconButton
                    icon="chat"
                    size={18}
                    onPress={() => router.push("/family/chat")}
                  />
                </View>
              </Card>
            );
          })}

          {/* Invite CTA */}
          <Card
            onPress={() => router.push("/family/invite")}
            style={{
              alignItems: "center",
              gap: 8,
              borderStyle: "dashed",
              borderWidth: 2,
              borderColor: colors.primary,
              backgroundColor: colors.primarySurface,
            }}
          >
            <Icon name="userAdd" size={28} color={colors.primary} />
            <AppText variant="h6" color={colors.primary}>
              إضافة فرد جديد
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              عبر لينك أو QR code أو كود رقمي
            </AppText>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

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
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  qIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
