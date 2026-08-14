// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { AppText, Button, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { Icon } from "../../src/components/Icon";

export default function InsuranceScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [insurance, setInsurance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/users/me/insurance");
        setInsurance(data);
      } catch {
        setInsurance(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
            التأمين الطبي
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
      ) : insurance ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View
            style={[
              st.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View
              style={[
                st.row,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderLight,
                  paddingBottom: 16,
                  marginBottom: 16,
                },
              ]}
            >
              <View style={{ alignItems: "flex-end" }}>
                <AppText variant="h5" color={colors.textPrimary}>
                  {insurance.provider || "شركة التأمين"}
                </AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>
                  وثيقة رقم: {insurance.policy_number || "---"}
                </AppText>
              </View>
              <View
                style={[
                  st.iconBox,
                  { backgroundColor: "rgba(35, 181, 206, 0.1)" },
                ]}
              >
                <Icon name="shield" size={32} color={colors.primary} />
              </View>
            </View>
            <View style={st.row}>
              <View style={{ alignItems: "flex-end" }}>
                <AppText variant="caption" color={colors.textTertiary}>
                  الشبكة
                </AppText>
                <AppText variant="bodyMD" color={colors.textPrimary}>
                  {insurance.network || "---"}
                </AppText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <AppText variant="caption" color={colors.textTertiary}>
                  الفئة
                </AppText>
                <AppText variant="bodyMD" color={colors.textPrimary}>
                  {insurance.class || "---"}
                </AppText>
              </View>
            </View>
          </View>
          <Button
            label="تحديث الوثيقة"
            variant="outline"
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      ) : (
        <View style={st.center}>
          <Icon name="shield" size={64} color={colors.textTertiary} />
          <AppText variant="h5" style={{ marginTop: 16 }}>
            لا يوجد تأمين مضاف
          </AppText>
          <AppText
            variant="bodySM"
            color={colors.textSecondary}
            align="center"
            style={{ marginVertical: 12, paddingHorizontal: 40 }}
          >
            أضف بطاقة التأمين الطبي الخاصة بك لتتمكن من استخدامها في حجوزاتك
            وصرف الأدوية.
          </AppText>
          <Button
            label="إضافة بطاقة تأمين"
            variant="primary"
            icon="plus"
            onPress={async () => {
              try {
                const newIns = {
                  provider: "التعاونية للتأمين",
                  policy_number: "123456789",
                  network: "1",
                  class: "A",
                };
                await apiFetch("/users/me/insurance", { method: 'POST', body: JSON.stringify(newIns) });
                setInsurance(newIns);
              } catch (e) {
                console.error("Failed to add insurance");
              }
            }}
          />
        </View>
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
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
