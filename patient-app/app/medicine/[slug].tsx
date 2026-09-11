// @ts-nocheck
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LocalizedText } from "../../src/components/LocalizedText";

/**
 * Web alias parity: /medicine/{slug} resolves to the same product as /p/{slug}.
 * Redirects to the canonical medicine catcher — never a dead screen.
 */
export default function MedicineAliasCatcher() {
  const { slug } = useLocalSearchParams();
  useEffect(() => {
    router.replace({ pathname: "/p/[slug]", params: { slug: String(slug || "") } });
  }, [slug]);
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" }}>
      <ActivityIndicator size="large" color="#0D9488" />
      <LocalizedText style={{ marginTop: 12, color: "#64748B" }}>جاري فتح تفاصيل الدواء…</LocalizedText>
    </View>
  );
}
