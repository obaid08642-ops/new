// @ts-nocheck
// app/insurance/network-providers.tsx — مزودو شبكة تأمين المريض (بيانات حقيقية)
import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';

const PROVIDER_TYPES = [
  { id: "all", label: "الكل", icon: "apps" },
  { id: "doctor", label: "أطباء", icon: "doctor" },
  { id: "hospital", label: "مستشفيات", icon: "hospital" },
  { id: "pharmacy", label: "صيدليات", icon: "pill" },
  { id: "lab", label: "مختبرات", icon: "microscope" },
];

const TYPE_LABELS: any = {
  doctor: "طبيب",
  hospital: "مستشفى",
  clinic: "عيادة",
  pharmacy: "صيدلية",
  lab: "مختبر",
  radiology: "أشعة",
  home_care: "رعاية منزلية",
};

export default function NetworkProvidersScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const profile = await apiFetch("/users/me/profile").catch(() => null);
        const ins = profile?.insurance || null;
        setInsurance(ins);
        if (!ins?.provider) {
          setProviders([]);
          return;
        }
        const qs = new URLSearchParams();
        qs.set("insurance_company", ins.company_id || ins.provider);
        if (ins.network) qs.set("insurance_network", ins.network);
        if (ins.class) qs.set("insurance_class", ins.class);
        const res = await apiFetch(`/providers?${qs.toString()}`).catch(() => []);
        setProviders(Array.isArray(res) ? res : res?.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = providers.filter(
    (p) =>
      (filter === "all" || p.type === filter) &&
      (!query ||
        String(p.name_ar || p.name_en || "").includes(query) ||
        String(p.city || "").includes(query)),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <View style={{ width: 36 }} />
        <AppText variant="bodySM" style={{ fontWeight: "800" }}>مزودو الشبكة</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.searchRow,
          { backgroundColor: isDark ? colors.surface : colors.white },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark
                ? colors.background
                : colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Icon name="search" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن مزود..."
            placeholderTextColor={colors.textTertiary}
            textAlign="right"
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        {PROVIDER_TYPES.map((t) => {
          const active = filter === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setFilter(t.id)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: colors.primary }
                  : {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <Icon
                name={t.icon as any}
                size={13}
                color={active ? "#fff" : colors.textSecondary}
              />
              <AppText
                variant="labelSM"
                color={active ? "#fff" : colors.textSecondary}
              >
                {t.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 10 }}>
              <Icon name="info" size={40} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: "center" }}>
                {insurance?.provider
                  ? "لا يوجد مزودون متعاقدون مطابقون لشبكتك حاليًا"
                  : "أضف بوليصة تأمين أولاً لعرض مزودي شبكتك"}
              </AppText>
              {!insurance?.provider && (
                <TouchableOpacity onPress={() => router.push("/insurance/add-policy")}>
                  <AppText variant="bodySM" color={colors.primary}>إضافة بوليصة</AppText>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const iconName =
              item.type === "pharmacy"
                ? "pill"
                : item.type === "lab"
                  ? "microscope"
                  : item.type === "doctor"
                    ? "doctor"
                    : "hospital";
            return (
              <View
                style={[
                  styles.providerCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.providerTop}>
                  <View style={styles.providerMeta}>
                    <View
                      style={[
                        styles.classBadge,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <AppText variant="labelSM" color={colors.textSecondary}>
                        {TYPE_LABELS[item.type] || item.type}
                      </AppText>
                    </View>
                    {!!item.phone && (
                      <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: "#E6FAF7" }]}
                        onPress={() => Linking.openURL(`tel:${item.phone}`)}
                      >
                        <Icon name="call" size={15} color="#00977D" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.providerInfo}>
                    <AppText variant="h6" color={colors.textPrimary}>
                      {pickLocalized(item.name_ar, item.name_en)}
                    </AppText>
                    <View style={styles.providerSpecRow}>
                      {(item.specialties || item.specialty
                        ? Array.isArray(item.specialties)
                          ? item.specialties
                          : [item.specialty]
                        : []
                      ).slice(0, 3).map((s: string, i: number) => (
                        <View
                          key={i}
                          style={[
                            styles.specTag,
                            { backgroundColor: colors.surfaceSecondary },
                          ]}
                        >
                          <AppText variant="caption" color={colors.textSecondary}>
                            {s}
                          </AppText>
                        </View>
                      ))}
                    </View>
                    {!!item.city && (
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon name="location" size={14} color={colors.textTertiary} />
                        <AppText variant="caption" color={colors.textTertiary}>
                          {item.city}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.providerIcon,
                      { backgroundColor: colors.primarySurface },
                    ]}
                  >
                    <Icon name={iconName} size={22} color={colors.primary} />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  providerCard: { borderRadius: 16, padding: 14 },
  providerTop: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfo: { flex: 1, alignItems: "flex-end", gap: 6 },
  providerMeta: { alignItems: "center", gap: 8 },
  providerSpecRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
  },
  specTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  classBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  callBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
