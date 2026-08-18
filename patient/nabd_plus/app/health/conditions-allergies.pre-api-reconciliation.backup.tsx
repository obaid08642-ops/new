// @ts-nocheck
// conditions-allergies.tsx — Add diseases/allergies from dropdown suggestions
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { apiFetch } from "../../src/utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Input,
  SectionHeader,
} from "../../src/components/ui";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const CONDITIONS_DB = [
  "السكري النوع الأول",
  "السكري النوع الثاني",
  "ضغط الدم المرتفع",
  "ارتفاع الكوليسترول",
  "الربو",
  "حساسية الصدر",
  "قصور الغدة الدرقية",
  "فرط نشاط الغدة الدرقية",
  "أمراض القلب",
  "القصور الكلوي",
  "التهاب المفاصل الروماتويدي",
  "هشاشة العظام",
  "الصرع",
  "الاكتئاب",
  "القلق المزمن",
  "فقر الدم",
  "النقرس",
  "الأكزيما",
];

const ALLERGIES_DB = [
  "بنسلين",
  "أسبرين",
  "سلفا",
  "إيبوبروفين",
  "لاتكس",
  "فول سوداني",
  "بيض",
  "حليب",
  "قمح",
  "جلوتين",
  "سمك",
  "مكسرات",
  "صويا",
  "غبار",
  "حبوب اللقاح",
  "وبر الحيوانات",
  "العفن",
];

export default function ConditionsAllergiesScreen() {
  const insets = useSafeAreaInsets();
  // Guests CAN view conditions & allergies — device-bound guest account.
  const { colors, isDark } = useApp();
  const [condQ, setCondQ] = useState("");
  const [allergyQ, setAllergyQ] = useState("");
  // EPIC4/S21: was hardcoded (["السكري النوع الثاني", "ضغط الدم المرتفع"] +
  // setTimeout save). Now loads from and persists to /users/me/profile.
  const [myConditions, setMyConditions] = useState<string[]>([]);
  const [myAllergies, setMyAllergies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await apiFetch("/users/me/profile");
        const prof = p?.data || p || {};
        setMyConditions(Array.isArray(prof.chronic_conditions) ? prof.chronic_conditions : []);
        setMyAllergies(Array.isArray(prof.allergies) ? prof.allergies : []);
      } catch (e) {
        console.error(e);
        setLoadError(true);
      }
    })();
  }, []);

  const filteredCond = condQ
    ? CONDITIONS_DB.filter(
        (c) => c.includes(condQ) && !myConditions.includes(c),
      )
    : [];
  const filteredAllergy = allergyQ
    ? ALLERGIES_DB.filter(
        (a) => a.includes(allergyQ) && !myAllergies.includes(a),
      )
    : [];

  const addCondition = (c: string) => {
    setMyConditions((p) => [...p, c]);
    setCondQ("");
  };
  const removeCondition = (c: string) =>
    setMyConditions((p) => p.filter((x) => x !== c));
  const addAllergy = (a: string) => {
    setMyAllergies((p) => [...p, a]);
    setAllergyQ("");
  };
  const removeAllergy = (a: string) =>
    setMyAllergies((p) => p.filter((x) => x !== a));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          chronic_conditions: myConditions,
          allergies: myAllergies,
        }),
      });
      router.back();
    } catch (e) {
      console.error(e);
      showLocalizedAlert("خطأ", "تعذر حفظ التغييرات — حاول لاحقاً");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
            الأمراض والحساسية
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
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}
      >
        {/* Conditions */}
        <Card>
          <SectionHeader title="الأمراض المزمنة" />
          <Input
            value={condQ}
            onChangeText={setCondQ}
            placeholder="ابحث عن مرض..."
            icon="search"
          />

          {/* Suggestions dropdown */}
          {filteredCond.length > 0 && (
            <View
              style={[
                st.dropdown,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {filteredCond.slice(0, 5).map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => addCondition(c)}
                  style={[
                    st.dropItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <Icon name="add" size={16} color={colors.primary} />
                  <AppText variant="bodySM" style={{ flex: 1 }}>
                    {c}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Current conditions */}
          <View
            style={{
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            {myConditions.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => removeCondition(c)}
                style={[st.tag, { backgroundColor: colors.errorSurface }]}
              >
                <Icon name="close" size={14} color={colors.error} />
                <AppText variant="labelSM" color={colors.error}>
                  {c}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Allergies */}
        <Card>
          <SectionHeader title="الحساسية" />
          <Input
            value={allergyQ}
            onChangeText={setAllergyQ}
            placeholder="ابحث عن حساسية..."
            icon="search"
          />

          {filteredAllergy.length > 0 && (
            <View
              style={[
                st.dropdown,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {filteredAllergy.slice(0, 5).map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => addAllergy(a)}
                  style={[
                    st.dropItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <Icon name="add" size={16} color={colors.warning} />
                  <AppText variant="bodySM" style={{ flex: 1 }}>
                    {a}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View
            style={{
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 10,
            }}
          >
            {myAllergies.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => removeAllergy(a)}
                style={[st.tag, { backgroundColor: colors.warningSurface }]}
              >
                <Icon name="close" size={14} color={colors.warning} />
                <AppText variant="labelSM" color={colors.warning}>
                  {a}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Info */}
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Icon name="shield" size={20} color={colors.info} />
            <AppText
              variant="bodySM"
              color={colors.textSecondary}
              style={{ flex: 1 }}
            >
              هذه المعلومات تساعد أطباءك وصيدليتك في تقديم رعاية أفضل وتجنب
              التداخلات الدوائية الخطيرة
            </AppText>
          </View>
        </Card>
      </ScrollView>

      <View
        style={[
          st.bottom,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <Button
          label="حفظ"
          variant="gradient"
          size="lg"
          icon="check_circle"
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 8,
    overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  tag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
