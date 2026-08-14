// @ts-nocheck
// family/emergency-contacts.tsx — Family emergency contacts with SOS alerts
import React from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Avatar,
  SectionHeader,
} from "../../src/components/ui";

const CONTACTS = [
  {
    id: "1",
    name: "أحمد محمد (الأب)",
    phone: "+966501234567",
    emergency: true,
    sosAlert: true,
  },
  {
    id: "2",
    name: "نورة أحمد (الأم)",
    phone: "+966509876543",
    emergency: true,
    sosAlert: true,
  },
  {
    id: "3",
    name: "خالد أحمد (الأخ)",
    phone: "+966507654321",
    emergency: false,
    sosAlert: false,
  },
];

export default function FamilyEmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

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
        <IconButton
          icon="add"
          onPress={() => {
            /* Requires backend API integration */
          }}
        />
        <AppText variant="h4">جهات الطوارئ</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
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
              عند ضغط زر SOS سيتم إرسال إشعار فوري لكل جهات الطوارئ المفعّلة مع
              موقعك الحالي
            </AppText>
          </View>
        </Card>

        <SectionHeader title={`جهات الطوارئ (${CONTACTS.length})`} />
        {CONTACTS.map((c) => (
          <Card
            key={c.id}
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
              <AppText variant="h6">{c.name}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {c.phone}
              </AppText>
              <View style={{ flexDirection: "row-reverse", gap: 6 }}>
                {c.emergency && (
                  <Badge label="طوارئ" color={colors.error} icon="emergency" />
                )}
                {c.sosAlert && (
                  <Badge label="SOS مفعّل" color={colors.success} icon="bell" />
                )}
              </View>
            </View>
            <IconButton
              icon="call"
              bg={colors.successSurface}
              color={colors.success}
              onPress={() => {
                /* Requires backend API integration */
              }}
            />
          </Card>
        ))}

        <Button
          label="إضافة جهة اتصال طوارئ"
          variant="outline"
          icon="add"
          onPress={() => {
            /* Requires backend API integration */
          }}
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
            سيتم إشعار كل جهات الطوارئ فوراً
          </AppText>
        </Card>
      </ScrollView>
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
