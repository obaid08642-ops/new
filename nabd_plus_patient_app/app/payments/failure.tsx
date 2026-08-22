// @ts-nocheck
import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, Button } from "../../src/components/ui";

export default function PaymentFailureScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View
      style={[
        st.c,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={st.body}>
        <View style={[st.iconWrap, { backgroundColor: colors.errorSurface }]}>
          <Icon name="close" size={48} color={colors.error} />
        </View>
        <AppText variant="h3" align="center" color={colors.error}>
          فشل الدفع
        </AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">
          لم تتم عملية الدفع. تحقق من بيانات البطاقة أو رصيد الحساب وحاول مرة
          أخرى
        </AppText>

        <Card style={{ width: "100%", gap: 8 }}>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Icon name="warning" size={18} color={colors.warning} />
            <AppText variant="bodySM" color={colors.textSecondary}>
              أسباب شائعة للفشل:
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textTertiary}>
            • رصيد غير كافي
          </AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            • بيانات البطاقة غير صحيحة أو منتهية
          </AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            • تم رفض العملية من البنك
          </AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            • مشكلة في الاتصال بالإنترنت
          </AppText>
        </Card>

        <View style={{ gap: 10, width: "100%" }}>
          <Button
            label="إعادة المحاولة"
            variant="gradient"
            icon="refresh"
            onPress={() => router.back()}
          />
          <Button
            label="تغيير طريقة الدفع"
            variant="outline"
            icon="card"
            onPress={() => router.back()}
          />
          <Button
            label="العودة للرئيسية"
            variant="ghost"
            icon="home"
            onPress={() => router.replace("/(tabs)")}
          />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
