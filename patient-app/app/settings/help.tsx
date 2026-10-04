// @ts-nocheck
// app/settings/help.tsx
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";

const FAQ_CATEGORIES = [
  { icon: "calendar", label: "الحجوزات", color: "#23B5CE" },
  { icon: "medication", label: "الصيدلية", color: "#5BA84F" },
  { icon: "card", label: "الدفع", color: "#7A6BEA" },
  { icon: "shield", label: "التأمين", color: "#F0695C" },
  { icon: "refresh", label: "الإرجاع", color: "#F0A526" },
  { icon: "user", label: "الحساب", color: "#EC4899" },
];

import { apiFetch } from "../../src/utils/api";

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [supportPhone, setSupportPhone] = useState<string | null>(null);

  React.useEffect(() => {
    apiFetch<any[]>('/support/faqs')
      .then(res => setFaqs(Array.isArray(res) ? res : []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
    apiFetch<any>('/config')
      .then(cfg => setSupportPhone(cfg?.contact?.support_phone || null))
      .catch(() => {});
  }, []);

  const filteredFaqs = selectedCat ? faqs.filter(f => f.category === selectedCat) : faqs;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">مركز المساعدة </AppText>
          <View style={{ width: 36 }} />
        </View>
        <AppText variant="bodySM">كيف يمكننا مساعدتك اليوم؟</AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Options */}
        <View style={styles.contactRow}>
          {[
            {
              label: "محادثة فورية",
              icon: "chat",
              color: "#5BA84F",
              route: "/settings/support-chat",
            },
            {
              label: "إرسال بريد",
              icon: "mail",
              color: "#23B5CE",
              route: "/settings/feedback",
            },
            {
              label: "اتصال مباشر",
              icon: "call",
              color: "#7A6BEA",
              route: null,
            },
          ].map((opt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                if (opt.route) router.push(opt.route as any);
                else if (supportPhone) Linking.openURL(`tel:${supportPhone}`).catch(() => {});
              }}
              style={[
                styles.contactCard,
                { backgroundColor: isDark ? colors.surface : colors.white },
              ]}
            >
              <AppText variant="bodySM">{opt.icon}</AppText>
              <AppText variant="bodySM">{opt.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Categories */}
        <AppText variant="bodySM">تصفح حسب الموضوع</AppText>
        <View style={styles.catsGrid}>
          {FAQ_CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => { setSelectedCat(selectedCat === cat.label ? null : cat.label); setExpandedFaq(null); }}
              style={[
                styles.catCard,
                { backgroundColor: isDark ? colors.surface : colors.white },
                selectedCat === cat.label && { borderWidth: 2, borderColor: cat.color },
              ]}
            >
              <View
                style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}
              >
                <AppText variant="bodySM">{cat.icon}</AppText>
              </View>
              <AppText variant="bodySM">{cat.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <AppText variant="bodySM">الأسئلة الشائعة</AppText>
        {loading ? (
          <AppText variant="bodySM" style={{ textAlign: "center", marginTop: 20 }}>جاري تحميل الأسئلة الشائعة...</AppText>
        ) : filteredFaqs.length === 0 ? (
          <AppText variant="bodySM" style={{ textAlign: "center", marginTop: 20 }}>لا توجد أسئلة في هذا الموضوع بعد</AppText>
        ) : (
          <View style={styles.faqList}>
            {filteredFaqs.map((faq, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
                style={[
                  styles.faqCard,
                  { backgroundColor: isDark ? colors.surface : colors.white },
                ]}
              >
                <View style={styles.faqHeader}>
                  <Icon name="info" size={20} color={colors.primary} />
                  <AppText variant="bodySM">{faq.q || faq.question}</AppText>
                  <AppText variant="bodySM">؟</AppText>
                </View>
                {expandedFaq === i && <AppText variant="bodySM">{faq.a || faq.answer}</AppText>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Still need help? */}
        <TouchableOpacity
          onPress={() => router.push("/settings/support-chat")}
          style={[
            styles.stillNeedHelp,
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              marginHorizontal: 16,
            },
          ]}
        >
          <View style={styles.stillNeedHelpInner}>
            <View>
              <AppText variant="bodySM">لم تجد ما تبحث عنه؟</AppText>
              <AppText variant="bodySM">فريق الدعم متاح 24/7</AppText>
            </View>
            <Icon name="chat" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  contactRow: { flexDirection: "row-reverse", padding: 16, gap: 10 },
  contactCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contactIcon: { fontSize: 26 },
  contactLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 8,
  },
  catsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  catCard: {
    width: "30%",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  catLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  faqList: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  faqCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  faqHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  faqQ: { flex: 1, fontSize: 13, fontWeight: "700", textAlign: "right" },
  faqA: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 22,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  stillNeedHelp: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  stillNeedHelpInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  stillTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  stillSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "400",
    marginTop: 3,
  },
});
