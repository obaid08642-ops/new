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
import { Colors } from "../../src/theme";
const theme = { colors: Colors.light };
import Icon from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';

export default function DiagnosticsPackages() {
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
      const cats = (catRes?.data || catRes || []).map((c: any) => pickLocalized(c.name_ar, c.name_en) || c.slug || c);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon
            name="arrow-forward"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <AppText variant="h2" style={styles.headerTitle}>
          باقات التحاليل
        </AppText>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن باقة..."
            placeholderTextColor={theme.colors.textSecondary}
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
              style={[styles.catChip, activeCat === c && styles.catChipActive]}
              onPress={() => setActiveCat(c)}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: activeCat === c ? "#fff" : theme.colors.textPrimary,
                }}
              >
                {c}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={styles.pkgCard}
            onPress={() =>
              router.push(`/diagnostics/package-detail?id=${pkg.id}`)
            }
          >
            <View style={styles.pkgHeader}>
              <View style={styles.pkgIcon}>
                <Icon name="biotech" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.pkgInfo}>
                <AppText style={{ fontWeight: "bold", fontSize: 16 }}>
                  {pickLocalized(pkg.name_ar, pkg.name)}
                </AppText>
                <AppText
                  style={{
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                    marginTop: 4,
                  }}
                >
                  {pickLocalized(pkg.description_ar, pkg.desc) || "باقة تحاليل شاملة"}
                </AppText>
              </View>
              <View style={styles.pkgPrice}>
                <AppText
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: theme.colors.primary,
                  }}
                >
                  {pkg.price}
                </AppText>
                <AppText
                  style={{ fontSize: 10, color: theme.colors.textSecondary }}
                >
                  ر.س
                </AppText>
              </View>
            </View>
            <View style={styles.pkgFooter}>
              <AppText
                style={{ fontSize: 11, color: theme.colors.textSecondary }}
              >
                متاحة في: {pkg.labs ? pkg.labs.join(" • ") : "كل المختبرات المعتمدة"}
              </AppText>
              <Icon
                name="arrow-back-ios"
                size={14}
                color={theme.colors.textSecondary}
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
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "transparent",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, textAlign: "center", marginRight: 40 },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 16,
    padding: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: "Tajawal-Medium",
    fontSize: 14,
    color: "transparent",
    textAlign: "right",
  },
  catScroll: { paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  catChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  catChipActive: { backgroundColor: "transparent", borderColor: "transparent" },
  scrollContent: { padding: 24, paddingTop: 8 },
  pkgCard: {
    backgroundColor: "transparent",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pkgHeader: { flexDirection: "row", gap: 12, marginBottom: 16 },
  pkgIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${"transparent"}15`,
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
    borderTopColor: "transparent",
  },
});
