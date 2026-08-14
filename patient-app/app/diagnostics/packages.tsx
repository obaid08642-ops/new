// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { AppText } from "../../src/components/ui";
import { useApp } from "../../src/context/AppContext";
import Icon from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { apiFetch } from "../../src/utils/api";

export default function DiagnosticsPackages() {
  const { colors } = useApp();
  const router = useRouter();
  const [activeCat, setActiveCat] = useState("الكل");
  const [loading, setLoading] = useState(true);
  const [allPackages, setAllPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(["الكل"]);

  useEffect(() => {
    Promise.all([
      apiFetch('/labs/packages'),
      apiFetch('/labs/categories')
    ]).then(([pkgRes, catRes]: any) => {
      setAllPackages(pkgRes?.data || pkgRes || []);
      const cats = (catRes?.data || catRes || []).map((c: any) => c.name_ar || c.slug || c);
      setCategories(["الكل", ...cats]);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filtered =
    activeCat === "الكل"
      ? allPackages
      : allPackages.filter((p) => p.category === activeCat);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.s }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon
            name="arrow-forward"
            size={24}
            color={colors.n}
          />
        </TouchableOpacity>
        <AppText variant="h2" style={styles.headerTitle}>
          باقات التحاليل
        </AppText>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.s, borderBottomColor: colors.bd }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.bg }]}>
          <Icon name="search" size={20} color={colors.t2} />
          <TextInput
            style={[styles.searchInput, { color: colors.n }]}
            placeholder="ابحث عن باقة..."
            placeholderTextColor={colors.t2}
          />
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {categories.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.catChip, { backgroundColor: colors.s, borderColor: colors.bd }, activeCat === c && [styles.catChipActive, { backgroundColor: colors.p, borderColor: colors.p }]]}
              onPress={() => setActiveCat(c)}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: activeCat === c ? '#FFFFFF' : colors.n,
                }}
              >
                {c}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.p} style={{ marginTop: 40 }} />
      ) : (

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[styles.pkgCard, { backgroundColor: colors.s, borderColor: colors.bd }]}
            onPress={() =>
              router.push(`/diagnostics/package-detail?id=${pkg.id}`)
            }
          >
            <View style={styles.pkgHeader}>
              <View style={styles.pkgIcon}>
                <Icon name="biotech" size={24} color={colors.p} />
              </View>
              <View style={styles.pkgInfo}>
                <AppText style={{ fontWeight: "bold", fontSize: 16 }}>
                  {pkg.name_ar || pkg.name}
                </AppText>
                <AppText
                  style={{
                    fontSize: 12,
                      color: colors.t2,
                    marginTop: 4,
                  }}
                >
                  {pkg.description_ar || pkg.desc || "باقة تحاليل شاملة"}
                </AppText>
              </View>
              <View style={styles.pkgPrice}>
                <AppText
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: colors.p,
                  }}
                >
                  {pkg.price}
                </AppText>
                <AppText
                  style={{ fontSize: 10, color: colors.t2 }}
                >
                  ر.س
                </AppText>
              </View>
            </View>
            <View style={[styles.pkgFooter, { borderTopColor: colors.bd }]}>
              <AppText
                style={{ fontSize: 11, color: colors.t2 }}
              >
                متاحة في: {pkg.labs ? pkg.labs.join(" • ") : "كل المختبرات المعتمدة"}
              </AppText>
              <Icon
                name="arrow-back-ios"
                size={14}
                color={colors.t2}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, textAlign: "center", marginRight: 40 },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: "Tajawal-Medium",
    fontSize: 14,
    textAlign: "right",
  },
  catScroll: { paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  catChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipActive: {},
  scrollContent: { padding: 24, paddingTop: 8 },
  pkgCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  pkgHeader: { flexDirection: "row", gap: 12, marginBottom: 16 },
  pkgIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pkgInfo: { flex: 1, justifyContent: "center" },
  pkgPrice: { alignItems: "flex-end", justifyContent: "center" },
  pkgFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
