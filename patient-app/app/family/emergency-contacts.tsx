// @ts-nocheck
// family/emergency-contacts.tsx — Family emergency contacts with SOS alerts (real backend data)
import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, StatusBar, Linking, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Button,
  IconButton,
  Avatar,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

interface EmergencyContact {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  relation: string | null;
}

export default function FamilyEmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const rows = await apiFetch<EmergencyContact[]>("/family/emergency-contacts");
      setContacts(Array.isArray(rows) ? rows : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const call = (phone?: string | null) => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
  };

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
        <IconButton icon="add" onPress={() => router.push("/family/invite")} />
        <AppText variant="h4">جهات الطوارئ</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
        >
          <Card style={{ backgroundColor: colors.errorSurface }}>
            <View
              style={{
                flexDirection: "row-reverse",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Icon name="emergency" size={22} color={colors.error} />
              <AppText
                variant="bodySM"
                color={colors.textSecondary}
                style={{ flex: 1 }}
              >
                عند ضغط زر SOS سيتم إشعار أفراد عائلتك فوراً مع موقعك الحالي
              </AppText>
            </View>
          </Card>

          {error && contacts.length === 0 ? (
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
              <Icon name="warning" size={40} color={colors.textTertiary} />
              <AppText variant="bodyMD" color={colors.textSecondary}>تعذر تحميل جهات الطوارئ</AppText>
              <Button label="إعادة المحاولة" variant="outline" onPress={() => load()} />
            </View>
          ) : contacts.length === 0 ? (
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
              <Icon name="users" size={40} color={colors.textTertiary} />
              <AppText variant="bodyMD" color={colors.textSecondary}>
                لا يوجد أفراد في مجموعتك العائلية بعد
              </AppText>
              <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: "center" }}>
                ادعُ أفراد عائلتك ليصبحوا جهات طوارئ يمكن إشعارها والاتصال بها
              </AppText>
            </View>
          ) : (
            <>
              <SectionHeader title={`جهات الطوارئ (${contacts.length})`} />
              {contacts.map((c) => (
                <Card
                  key={c.user_id}
                  style={{
                    flexDirection: "row-reverse",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <Avatar
                    size={48}
                    icon="user"
                    bg={colors.primarySurface}
                    iconColor={colors.primary}
                  />
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                    <AppText variant="h6">{c.display_name || "فرد العائلة"}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {c.phone || "لا يوجد رقم هاتف مسجّل"}
                    </AppText>
                  </View>
                  {!!c.phone && (
                    <IconButton
                      icon="call"
                      bg={colors.successSurface}
                      color={colors.success}
                      onPress={() => call(c.phone)}
                    />
                  )}
                </Card>
              ))}
            </>
          )}

          <Button
            label="دعوة فرد للعائلة"
            variant="outline"
            icon="add"
            onPress={() => router.push("/family/invite")}
          />

          <Card
            onPress={() => router.push("/emergency/sos")}
            style={{
              backgroundColor: colors.errorSurface,
              alignItems: "center",
              gap: 8,
              paddingVertical: 20,
            }}
          >
            <Icon name="emergency" size={36} color={colors.error} />
            <AppText variant="h5" color={colors.error}>
              طلب طوارئ SOS
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              سيتم إشعار أفراد عائلتك فوراً
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
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
});
