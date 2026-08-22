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
const FALLBACK_AR = `مرحباً بك في منصة نبض.

باستخدامك للمنصة فإنك توافق على الشروط التالية:

• استخدام المنصة للأغراض المشروعة فقط.
• تقديم بيانات صحيحة.
• الحفاظ على سرية حسابك.
• عدم مشاركة الحساب مع الآخرين.
• عدم إساءة استخدام الخدمات.

تتيح المنصة للمستخدم الوصول إلى خدمات مقدمة من مزودي خدمات صحية مرخصين، وتشمل حجز المواعيد وطلب الأدوية والاستشارات الطبية والخدمات الصحية الأخرى.

يلتزم المستخدم بصحة جميع البيانات التي يقدمها.

يجوز للمنصة تعليق أو إيقاف الحساب عند إساءة الاستخدام أو مخالفة الأنظمة.

تحتفظ المنصة بحق تعديل هذه الشروط، ويتم إشعار المستخدم عند التعديلات الجوهرية.`;

const FALLBACK_EN = `Welcome to the Nabd platform.

By using the Platform, you agree to the following terms:

• Use the Platform for lawful purposes only.
• Provide accurate information.
• Maintain the confidentiality of your account.
• Not share your account with others.
• Not misuse the services.

The Platform provides users with access to services offered by licensed healthcare providers, including appointment booking, medication ordering, medical consultations, and other healthcare services.

The user is responsible for the accuracy of all information provided.

The Platform may suspend or deactivate the account in case of misuse or violation of regulations.

The Platform reserves the right to modify these terms, and users will be notified of material changes.`;

export default function TermsScreen() {
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";
  const AR = lang === "ar";

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/legal/policy/patient_terms?lang=${AR ? "ar" : "en"}`)
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
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LocalizedText style={{ fontSize: 20, color: colors.n }}>{isRTL ? "→" : "←"}</LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={{ fontSize: 18, fontWeight: "800", color: colors.n }}>
          {AR ? "الشروط والأحكام" : "Terms of Use"}
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
  title: { fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 8 },
  text: { fontSize: 14, lineHeight: 24 },
});
