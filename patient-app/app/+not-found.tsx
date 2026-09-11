// @ts-nocheck
import React from "react";
import { View } from "react-native";
import { Link, Stack } from "expo-router";
import { LocalizedText } from "../src/components/LocalizedText";

/**
 * Global not-found route: deep links to deleted/unknown entities land here —
 * never a white screen. Offers search + home as exact-destination fallbacks.
 */
export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 24, gap: 12 }}>
      <Stack.Screen options={{ title: "غير موجود" }} />
      <LocalizedText style={{ fontSize: 18, fontWeight: "bold", color: "#0F172A" }}>
        عذراً — هذه الصفحة غير موجودة أو أُزيلت
      </LocalizedText>
      <LocalizedText style={{ color: "#64748B", textAlign: "center" }}>
        جرّب البحث أو عُد إلى الرئيسية
      </LocalizedText>
      <Link href="/search" style={{ color: "#0D9488", fontWeight: "bold" }}>
        <LocalizedText>البحث</LocalizedText>
      </Link>
      <Link href="/" style={{ color: "#0D9488", fontWeight: "bold" }}>
        <LocalizedText>الرئيسية</LocalizedText>
      </Link>
    </View>
  );
}
