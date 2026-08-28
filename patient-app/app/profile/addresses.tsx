// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { AppText, Button, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { Icon } from "../../src/components/Icon";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch from the backend we just built!
        const data = await apiFetch("/users/me/addresses");
        setAddresses(data || []);
      } catch {
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSetDefault = async (id: string) => {
    // E2: optimistic update with revert + alert on failure (was silent catch{} — UI lied about the default)
    const snapshot = addresses;
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === id })),
    );
    try {
      await apiFetch(`/users/me/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_default: true }),
      });
    } catch (e: any) {
      setAddresses(snapshot);
      showLocalizedAlert('تعذر تعيين العنوان الافتراضي', e?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
    }
  };

  return (
    <View
      style={[
        st.c,
        { backgroundColor: colors.background, paddingTop: insets.top + 16 },
      ]}
    >
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
            عناويني
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
        <View style={st.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[
                st.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: addr.is_default
                    ? colors.primary
                    : colors.borderLight,
                },
              ]}
              onPress={() => handleSetDefault(addr.id)}
            >
              <View style={st.row}>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AppText variant="h5" color={colors.textPrimary}>
                      {addr.label}
                    </AppText>
                    {addr.is_default && (
                      <View
                        style={[
                          st.badge,
                          { backgroundColor: "rgba(35, 181, 206, 0.1)" },
                        ]}
                      >
                        <AppText variant="caption" color={colors.primary}>
                          الافتراضي
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText
                    variant="bodySM"
                    color={colors.textSecondary}
                    style={{ marginTop: 4 }}
                  >
                    {addr.street}، {addr.city}
                  </AppText>
                </View>
                <Icon
                  name="location"
                  size={24}
                  color={addr.is_default ? colors.primary : colors.textTertiary}
                />
              </View>
            </TouchableOpacity>
          ))}
          <Button
            label="إضافة عنوان جديد"
            variant="primary"
            icon="plus"
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { padding: 16, borderRadius: 16, borderWidth: 1.5 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
});
