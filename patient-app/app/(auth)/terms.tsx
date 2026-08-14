// @ts-nocheck
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp } from "../../src/context/AppContext";
import { lightColors, darkColors, resolveColor } from "../../src/theme/colors";

export default function TermsScreen() {
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
          الشروط والأحكام
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
          1. مقدمة
        </Text>
        <Text
          style={[
            styles.text,
            { color: colors.t2, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          مرحباً بك في تطبيقنا. استخدامك لهذا التطبيق يعني موافقتك الكاملة على
          هذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى
          عدم استخدام التطبيق.
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.n, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          2. الخدمات الطبية
        </Text>
        <Text
          style={[
            styles.text,
            { color: colors.t2, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          التطبيق يوفر منصة لحجز المواعيد والاستشارات الطبية. لا يُعد التطبيق
          بديلاً عن الطوارئ الطبية. في حالة الطوارئ، يرجى الاتصال بالإسعاف
          فوراً.
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.n, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          3. الدفع والإلغاء
        </Text>
        <Text
          style={[
            styles.text,
            { color: colors.t2, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          جميع المدفوعات تتم عبر قنوات آمنة. يمكنك إلغاء موعدك قبل 24 ساعة من
          موعده المحدد لاسترداد المبلغ كاملاً. في حال الإلغاء بعد ذلك، قد يتم
          خصم رسوم إدارية.
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
