// @ts-nocheck
// family/join.tsx — Accept/reject family invitation
import React, { useState } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
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
  Input,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function FamilyJoinScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [code, setCode] = useState((params.code as string) || "");
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<any>(null);
  const [joined, setJoined] = useState(false);

  const lookupCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/family/join", {
        method: "POST",
        body: JSON.stringify({
          invite_code: code.trim(),
          display_name: "عضو عائلة",
        }),
      });
      if (res.ok) {
        setFound({
          name: "المجموعة العائلية",
          relation: "عضو",
          permissions: [],
        });
        setJoined(true);
      }
    } catch (err: any) {
      alert(err.message || "فشل الانضمام. يرجى التحقق من الكود وصلاحيته.");
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    // Already joined on lookupCode, but keeping this for safety
    setJoined(true);
  };

  if (joined) {
    return (
      <View
        style={[
          st.c,
          {
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
          },
        ]}
      >
        <View style={[st.icon, { backgroundColor: colors.successSurface }]}>
          <Icon name="check_circle" size={48} color={colors.success} />
        </View>
        <AppText variant="h3" align="center">
          تم الانضمام للعائلة!
        </AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">
          أنت الآن مرتبط بعائلة {found?.name}
        </AppText>
        <Button
          label="الذهاب للعائلة"
          variant="gradient"
          icon="users"
          onPress={() => router.replace("/health/family-hub")}
          style={{ marginTop: 16, width: "80%" }}
        />
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
        <View style={{ width: 40 }} />
        <AppText variant="h4">الانضمام لعائلة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        {!found ? (
          <>
            <View style={{ alignItems: "center", gap: 12, marginTop: 40 }}>
              <View
                style={[st.icon, { backgroundColor: colors.primarySurface }]}
              >
                <Icon name="users" size={40} color={colors.primary} />
              </View>
              <AppText variant="h4" align="center">
                أدخل كود الدعوة
              </AppText>
              <AppText
                variant="bodySM"
                color={colors.textTertiary}
                align="center"
              >
                أدخل الكود الذي أرسله لك فرد عائلتك أو امسح QR Code
              </AppText>
            </View>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder="مثال: NABDAH-F7X2K9"
              icon="edit"
              autoCapitalize="characters"
            />
            <Button
              label="بحث"
              variant="gradient"
              icon="search"
              loading={loading}
              onPress={lookupCode}
            />
            <Button
              label="مسح QR Code بالكاميرا"
              variant="outline"
              icon="qr"
              onPress={() => {
                /* Requires backend API integration */
              }}
            />
          </>
        ) : (
          <>
            <Card style={{ alignItems: "center", gap: 12 }}>
              <View
                style={[st.icon, { backgroundColor: colors.primarySurface }]}
              >
                <Icon name="user" size={36} color={colors.primary} />
              </View>
              <AppText variant="h4">{found.name}</AppText>
              <Badge label={found.relation} color={colors.secondary} />
              <AppText variant="bodySM" color={colors.textTertiary}>
                يريد إضافتك كفرد من العائلة
              </AppText>
            </Card>

            <Card>
              <AppText variant="h6" style={{ marginBottom: 8 }}>
                الصلاحيات المطلوبة:
              </AppText>
              {found.permissions.map((p: string, i: number) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row-reverse",
                    gap: 8,
                    paddingVertical: 6,
                    alignItems: "center",
                  }}
                >
                  <Icon name="check_circle" size={16} color={colors.success} />
                  <AppText variant="bodySM" color={colors.textSecondary}>
                    {p}
                  </AppText>
                </View>
              ))}
            </Card>

            <View style={{ gap: 10, marginTop: 8 }}>
              <Button
                label="قبول الدعوة"
                variant="gradient"
                icon="check_circle"
                loading={loading}
                onPress={accept}
              />
              <Button
                label="رفض"
                variant="outline"
                icon="close"
                onPress={() => router.back()}
              />
            </View>
          </>
        )}
      </View>
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
  icon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
});
