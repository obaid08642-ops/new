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
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
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

export default function FamilyHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isGuest) return;
    loadFamilyData();
  }, [isGuest]);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const grp = await apiFetch("/family/my-group");
      setGroup(grp);
      const mems = await apiFetch("/family/members");
      setMembers(mems);
    } catch (err: any) {
      if (
        err.message &&
        err.message.toLowerCase().includes("no family group found")
      ) {
        setGroup(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setCreating(true);
      await apiFetch("/family/create", {
        method: "POST",
        body: JSON.stringify({ name: "عائلتي" }),
      });
      await loadFamilyData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  // Family is one of the ONLY two guest-restricted areas (with insurance).
  if (isGuest) {
    requireAuth('family');
    return null;
  }

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
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            عائلتي
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !group ? (
        <View
          style={{
            flex: 1,
            padding: 24,
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          <View
            style={[
              st.qIcon,
              {
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary + "18",
                alignSelf: "center",
              },
            ]}
          >
            <Icon name="users" size={36} color={colors.primary} />
          </View>
          <AppText variant="h3" align="center">
            لا توجد عائلة حالياً
          </AppText>
          <AppText variant="bodySM" color={colors.textTertiary} align="center">
            يمكنك إنشاء مجموعة عائلية جديدة لتتمكن من مشاركة التقارير الطبية
            والمؤشرات الصحية وحجز المواعيد لأفراد عائلتك.
          </AppText>
          <Button
            label="إنشاء مجموعة عائلية"
            variant="gradient"
            loading={creating}
            onPress={handleCreateGroup}
            style={{ width: "100%", marginTop: 16 }}
          />
          <Button
            label="انضم لعائلة حالية"
            variant="outline"
            onPress={() => router.push("/family/join")}
            style={{ width: "100%" }}
          />
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
                    params: { id: m.user_id, name, relation: m.relation || "" },
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
                          params: { id: m.user_id, name, relation: m.relation || "" },
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
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
