// @ts-nocheck
// app/insurance/submit-claim.tsx — Connected to insurance module
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function Screen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [submitting, setSubmitting] = useState(false);

  const submitClaim = async (type: string) => {
    setSubmitting(true);
    try {
      await apiFetch("/insurance/claims/submit", {
        method: "POST",
        body: JSON.stringify({
          claim_type: type,
          status: "pending",
          submitted_at: new Date().toISOString(),
        }),
      });
      Alert.alert("تم تقديم المطالبة", "سيتم مراجعتها خلال 2-5 أيام عمل");
    } catch {
      Alert.alert("خطأ", "تعذر تقديم المطالبة");
    } finally {
      setSubmitting(false);
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
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            تقديم مطالبة تأمين
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        <SectionHeader title="الخيارات" />
        <Card
          onPress={() => submitClaim("consultation")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="doctor" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">استشارة طبية</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مطالبة بتكلفة استشارة
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
        <Card
          onPress={() => submitClaim("pharmacy")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="medication" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">أدوية</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مطالبة بتكلفة أدوية
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
        <Card
          onPress={() => submitClaim("labs")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="science" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">تحاليل وأشعة</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مطالبة بتكلفة فحوصات
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
        <Card
          onPress={() => submitClaim("hospital")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="hospital" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">تنويم / عملية</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مطالبة بتكلفة إقامة
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
      </ScrollView>
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
    marginBottom: 16,
  },
  balanceCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 16,
  },
  fIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
