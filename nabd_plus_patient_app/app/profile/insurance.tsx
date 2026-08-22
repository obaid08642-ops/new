// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { AppText, Button, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { Icon } from "../../src/components/Icon";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function InsuranceScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  const [insurance, setInsurance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Real add-policy form state (catalog-driven)
  const [showForm, setShowForm] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [networkCode, setNetworkCode] = useState<string | null>(null);
  const [policyNumber, setPolicyNumber] = useState("");
  const [memberId, setMemberId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInsurance = async () => {
    try {
      const data = await apiFetch("/users/me/insurance");
      setInsurance(data);
    } catch {
      setInsurance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsurance();
  }, []);

  const openForm = async () => {
    // Insurance requires a registered account (guests are blocked by policy)
    if (isGuest) {
      if (requireAuth("insurance")) return;
      return;
    }
    setShowForm(true);
    try {
      const list = await apiFetch("/insurance/companies");
      setCompanies(Array.isArray(list) ? list : []);
    } catch {
      setCompanies([]);
    }
  };

  const pickCompany = async (c: any) => {
    setCompanyId(c.id || c.code);
    setNetworkCode(null);
    setNetworks([]);
    try {
      const nets = await apiFetch(`/insurance/companies/${c.id || c.code}/networks`);
      setNetworks(Array.isArray(nets) ? nets : []);
    } catch {
      setNetworks([]);
    }
  };

  const savePolicy = async () => {
    if (!companyId || !policyNumber.trim()) {
      showLocalizedAlert("تنبيه", "اختر شركة التأمين وأدخل رقم الوثيقة");
      return;
    }
    setSaving(true);
    try {
      const company = companies.find((c) => (c.id || c.code) === companyId);
      const payload = {
        provider: company?.code || companyId,
        provider_name: company?.name_ar || company?.name_en || "",
        policy_number: policyNumber.trim(),
        member_id: memberId.trim(),
        network: networkCode || "",
        class: "A",
      };
      const saved = await apiFetch("/users/me/insurance", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInsurance(saved || payload);
      setShowForm(false);
      setPolicyNumber("");
      setMemberId("");
      showLocalizedAlert("تم", "تم حفظ بطاقة التأمين وستتم مراجعتها للتفعيل");
    } catch (e: any) {
      showLocalizedAlert("خطأ", "تعذر حفظ بطاقة التأمين. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        st.c,
        { backgroundColor: colors.background, paddingTop: insets.top + 16 },
      ]}
    >
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
            التأمين الطبي
          </AppText>
          <IconButton
            icon="back"
            onPress={() => router.back()}
            color={colors.textPrimary}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : insurance ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <View
            style={[
              st.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={st.row}>
              <AppText variant="h4" color={colors.textPrimary}>
                {insurance.provider_name || insurance.provider || "شركة التأمين"}
              </AppText>
              <Icon name="shield-check" size={28} color={colors.primary} />
            </View>
            <View style={{ marginTop: 16, gap: 12 }}>
              <View style={st.row}>
                <AppText variant="body" color={colors.textSecondary}>
                  وثيقة رقم: {insurance.policy_number || "---"}
                </AppText>
                <Icon name="document" size={18} color={colors.textTertiary} />
              </View>
              <View style={st.row}>
                <AppText variant="body" color={colors.textSecondary}>
                  الشبكة: {insurance.network || "---"}
                </AppText>
                <Icon name="hospital" size={18} color={colors.textTertiary} />
              </View>
              <View style={st.row}>
                <AppText variant="body" color={colors.textSecondary}>
                  الفئة: {insurance.class || "---"}
                </AppText>
                <Icon name="star" size={18} color={colors.textTertiary} />
              </View>
            </View>
          </View>
          <Button
            label="تحديث الوثيقة"
            variant="outline"
            style={{ marginTop: 20 }}
            onPress={openForm}
          />
        </ScrollView>
      ) : showForm ? (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <AppText variant="h4" color={colors.textPrimary} style={{ textAlign: "right" }}>
            إضافة بطاقة تأمين
          </AppText>

          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: "right" }}>
            شركة التأمين
          </AppText>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
            {companies.map((c) => {
              const cid = c.id || c.code;
              const sel = companyId === cid;
              return (
                <TouchableOpacity
                  key={cid}
                  onPress={() => pickCompany(c)}
                  style={[
                    st.chip,
                    {
                      backgroundColor: sel ? colors.primary : colors.card,
                      borderColor: sel ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <AppText
                    variant="bodySM"
                    color={sel ? "#fff" : colors.textPrimary}
                  >
                    {c.name_ar || c.name_en}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {networks.length > 0 && (
            <>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: "right" }}>
                الفئة / الشبكة
              </AppText>
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
                {networks.map((n) => {
                  const sel = networkCode === n.code;
                  return (
                    <TouchableOpacity
                      key={n.code}
                      onPress={() => setNetworkCode(n.code)}
                      style={[
                        st.chip,
                        {
                          backgroundColor: sel ? colors.primary : colors.card,
                          borderColor: sel ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <AppText variant="bodySM" color={sel ? "#fff" : colors.textPrimary}>
                        {n.name_ar || n.name_en}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TextInput
            placeholder="رقم الوثيقة"
            placeholderTextColor={colors.textTertiary}
            value={policyNumber}
            onChangeText={setPolicyNumber}
            keyboardType="number-pad"
            style={[st.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
          />
          <TextInput
            placeholder="رقم العضوية (اختياري)"
            placeholderTextColor={colors.textTertiary}
            value={memberId}
            onChangeText={setMemberId}
            style={[st.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
          />

          <Button
            label={saving ? "جارٍ الحفظ..." : "حفظ البطاقة"}
            variant="primary"
            onPress={savePolicy}
            disabled={saving}
          />
          <Button
            label="إلغاء"
            variant="outline"
            onPress={() => setShowForm(false)}
          />
        </ScrollView>
      ) : (
        <View style={st.center}>
          <Icon name="shield" size={64} color={colors.textTertiary} />
          <AppText variant="h5" style={{ marginTop: 16 }}>
            لا يوجد تأمين مضاف
          </AppText>
          <AppText
            variant="bodySM"
            color={colors.textSecondary}
            align="center"
            style={{ marginVertical: 12, paddingHorizontal: 40 }}
          >
            أضف بطاقة التأمين الطبي الخاصة بك لتتمكن من استخدامها في حجوزاتك
            وصرف الأدوية.
          </AppText>
          <Button
            label="إضافة بطاقة تأمين"
            variant="primary"
            icon="plus"
            onPress={openForm}
          />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "right",
    fontSize: 15,
  },
});
