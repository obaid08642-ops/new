// @ts-nocheck
// app/insurance/network-providers.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from "expo-router";
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

// Network Providers DB Connected

export default function NetworkProvidersScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = PROVIDERS.filter(
    (p) =>
      (filter === "all" || p.type === filter) &&
      (!query || p.name.includes(query)),
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
        <TouchableOpacity onPress={() => router.push("/map")}>
          <Icon name="map" size={22} color={colors.primary} />
        </TouchableOpacity>
        <AppText variant="bodySM">مزودو الشبكة</AppText>
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

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const iconName =
            item.type === "pharmacy"
              ? "pill"
              : item.type === "lab"
                ? "microscope"
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
                      {
                        backgroundColor:
                          item.class === "A" ? "#DCFCE7" : "#FEF3C7",
                      },
                    ]}
                  >
                    <AppText
                      variant="labelSM"
                      color={item.class === "A" ? "#16A34A" : "#D97706"}
                    >
                      فئة {item.class}
                    </AppText>
                  </View>
                  <View style={styles.providerActions}>
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: "#E6FAF7" }]}
                    >
                      <Icon name="call" size={15} color="#00977D" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.callBtn, { backgroundColor: "#EBF3FF" }]}
                    >
                      <Icon name="navigate" size={15} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.providerInfo}>
                  <AppText variant="h6" color={colors.textPrimary}>
                    {item.name}
                  </AppText>
                  <View style={styles.providerSpecRow}>
                    {(item.specialty || []).slice(0, 3).map((s, i) => (
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
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon name="location" size={16} color={colors.primary} />
                    <AppText variant="caption" color={colors.textTertiary}>
                      {item.distance} كم
                    </AppText>
                  </View>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: colors.primarySurface,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Icon
                    name={iconName as any}
                    size={20}
                    color={colors.primary}
                  />
                </View>
              </View>
              <View
                style={[
                  styles.insuranceRow,
                  { borderTopColor: colors.borderLight },
                ]}
              >
                <AppText variant="labelSM" color={colors.textTertiary}>
                  يقبل:{" "}
                </AppText>
                <View style={styles.acceptedTags}>
                  {item.accepted.map((ins, i) => (
                    <View
                      key={i}
                      style={[
                        styles.insTag,
                        { backgroundColor: colors.primarySurface },
                      ]}
                    >
                      <AppText variant="labelSM" color={colors.primary}>
                        {ins}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" } as any,
  searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "400" },
  filterRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  filterChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  filterIcon: { fontSize: 13 } as any,
  filter: { fontSize: 11, fontWeight: "700" } as any,
  providerCard: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  providerTop: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  providerEmoji: { fontSize: 28 } as any,
  providerInfo: { flex: 1, alignItems: "flex-end", gap: 6 },
  providerName: { fontSize: 14, fontWeight: "800" } as any,
  providerSpecRow: { flexDirection: "row-reverse", gap: 4 },
  specTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  spec: { fontSize: 10, fontWeight: "400" } as any,
  providerDist: { fontSize: 11, fontWeight: "400" } as any,
  providerMeta: { alignItems: "center", gap: 6 },
  providerActions: { gap: 6 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  classBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  class: { fontSize: 10, fontWeight: "800" } as any,
  insuranceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  acceptsLabel: { fontSize: 11, fontWeight: "400" } as any,
  acceptedTags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 4 },
  insTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  insTagAlt: { fontSize: 10, fontWeight: "700" } as any,
});
