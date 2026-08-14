// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
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
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// Contacts fetched from API

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/health/emergency-contacts');
        setContacts(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primarySurface }]}
        >
          <AppText variant="bodySM">+ إضافة</AppText>
        </TouchableOpacity>
        <AppText variant="bodySM">جهات الطوارئ </AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {contacts.map((c) => (
          <View
            key={c.id}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.surface : colors.white,
                borderRightWidth: c.isPrimary ? 4 : 0,
                borderRightColor: "#F0695C",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${c.phone}`)}
              style={[styles.callBtn, { backgroundColor: "#DCFCE7" }]}
            >
              <Icon name="call" size={18} color="#5BA84F" />
            </TouchableOpacity>
            <View style={styles.info}>
              <AppText variant="bodySM">{c.name}</AppText>
              <AppText variant="bodySM">
                {c.relation} • {c.phone}
              </AppText>
              {c.isPrimary && (
                <View style={styles.primaryBadge}>
                  <AppText variant="bodySM">رئيسي</AppText>
                </View>
              )}
            </View>
            <View style={[styles.avatar, { backgroundColor: "#FEE2E2" }]}>
              <Icon name="user" size={20} color={colors.primary} />
            </View>
          </View>
        ))}
      </ScrollView>
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
  addBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 13, fontWeight: "700" },
  card: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1, alignItems: "flex-end", gap: 3 },
  name: { fontSize: 14, fontWeight: "800" },
  relation: { fontSize: 12, fontWeight: "400" },
  primaryBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  primaryText: { color: "#F0695C", fontSize: 10, fontWeight: "700" },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
});
