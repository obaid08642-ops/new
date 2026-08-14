// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import { lightColors, darkColors, resolveColor } from "../../src/theme/colors";

export default function PrivacyScreen() {
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

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
          <Text
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: colors.n,
              fontSize: 20,
            }}
          >
            {isRTL ? "arrow_forward" : "arrow_back"}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.n }}>
          سياسة الخصوصية
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <Text
          style={[
            styles.title,
            { color: colors.n, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          1. جمع البيانات
        </Text>
        <Text
          style={[
            styles.text,
            { color: colors.t2, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          نحن نجمع البيانات الضرورية فقط لتقديم خدمة طبية متكاملة، مثل الاسم،
          العمر، السجل الطبي (إن وجد)، وطرق التواصل المتاحة.
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.n, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          2. حماية البيانات
        </Text>
        <Text
          style={[
            styles.text,
            { color: colors.t2, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          نحن نتخذ كافة التدابير الأمنية المتقدمة لضمان حماية بياناتك الشخصية من
          الوصول غير المصرح به، ونلتزم بقوانين حماية البيانات السارية.
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.n, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          3. مشاركة البيانات
        </Text>
        <Text
          style={[
            styles.text,
            { color: colors.t2, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          لا نشارك بياناتك مع أي طرف ثالث دون موافقتك الصريحة، باستثناء مقدمي
          الخدمة الطبية (الأطباء والمستشفيات) لضمان تقديم الرعاية المطلوبة.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 16, fontWeight: "800", marginTop: 24, marginBottom: 8 },
  text: { fontSize: 14, lineHeight: 24 },
});
