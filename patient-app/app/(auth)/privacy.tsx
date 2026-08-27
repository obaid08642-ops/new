// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import { lightColors, darkColors } from "../../src/theme/colors";
import { BASE_URL } from "../../src/utils/api";
import { LocalizedText } from '../../src/components/LocalizedText';

// Fallback shown only when the legal service is unreachable (offline first-open).
const FALLBACK_AR = `تحترم منصة نبض خصوصية المستخدمين، وتلتزم بحماية بياناتهم وفق الأنظمة المعمول بها.

قد نقوم بجمع:
• بيانات التسجيل.
• بيانات الهوية.
• بيانات التواصل.
• البيانات الصحية اللازمة لتقديم الخدمة.
• بيانات الموقع عند الحاجة.
• بيانات التأمين الصحي.
• سجلات الطلبات.
• بيانات الأجهزة.

تستخدم هذه البيانات من أجل تقديم الخدمات وإدارة الحساب ومعالجة الطلبات وتحسين جودة الخدمة والامتثال للأنظمة والحماية من الاحتيال.

قد يتم مشاركة البيانات الضرورية فقط مع مزود الخدمة المختار لتنفيذ الخدمة المطلوبة.

لن يتم بيع البيانات الشخصية لأي طرف ثالث.

يحق للمستخدم طلب تحديث بياناته أو تصحيحها أو حذفها وفق ما تسمح به الأنظمة والالتزامات القانونية.`;

const FALLBACK_EN = `Nabd respects the privacy of its users and is committed to protecting their data in accordance with applicable regulations.

We may collect:
• Registration data.
• Identity data.
• Contact data.
• Health data necessary to provide the service.
• Location data when needed.
• Health insurance data.
• Order records.
• Device data.

This data is used to provide services, manage the account, process orders, improve service quality, comply with regulations, and protect against fraud.

Only the necessary data may be shared with the selected service provider to execute the requested service.

Personal data will never be sold to any third party.

Users have the right to request updating, correcting, or deleting their data as permitted by regulations and legal obligations.`;

export default function PrivacyScreen() {
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";
  const AR = lang === "ar";

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/legal/policy/privacy_policy?lang=${AR ? "ar" : "en"}`)
      .then((r) => r.json())
      .then((d) => { if (d?.content) setPolicy(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [AR]);

  const content = policy?.content || (AR ? FALLBACK_AR : FALLBACK_EN);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={{
          paddingTop: Math.max(insets.top, 20),
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.bd,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.s,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LocalizedText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: colors.n,
              fontSize: 20,
            }}
          >
            {isRTL ? "arrow_forward" : "arrow_back"}
          </LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={{ fontSize: 18, fontWeight: "800", color: colors.n }}>
          {AR ? "سياسة الخصوصية" : "Privacy Policy"}
        </LocalizedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {loading && (
          <ActivityIndicator color={colors.p} style={{ marginTop: 40 }} />
        )}
        {!loading && (
          <>
            <LocalizedText
              style={[
                styles.text,
                { color: colors.t2, textAlign: isRTL ? "right" : "left", lineHeight: 26 },
              ]}
            >
              {content}
            </LocalizedText>
            {policy?.version && (
              <LocalizedText
                style={{
                  marginTop: 24,
                  fontSize: 12,
                  color: colors.t3,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {AR
                  ? `الإصدار ${policy.version} · ساري من ${(policy.effective_date || "").slice(0, 10)}`
                  : `Version ${policy.version} · Effective ${(policy.effective_date || "").slice(0, 10)}`}
              </LocalizedText>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  text: { fontSize: 14, lineHeight: 24 },
});
