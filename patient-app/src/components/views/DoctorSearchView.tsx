// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { FlatList,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../../src/context/AppContext";
import { Icon, IconName } from "../../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Chip,
  Input,
  IconButton,
  DoctorCard,
} from "../../../src/components/ui";
import { apiFetch } from "../../../src/utils/api";
import { pickLocalized } from '../../../src/utils/localize';

// Removed STATIC_DOCS

export default function DoctorSearchView() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [query, setQuery] = useState((params.specialty as string) || "");
  const [sort, setSort] = useState<"rating" | "price" | "wait">("rating");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async (search: string, sortBy: string) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (sortBy) qs.set("sort", sortBy);
      const res = await apiFetch(`/care/doctors?${qs.toString()}`);
      // E2: always set (empty search must clear old results) and never invent stats —
      // rating/price/wait/exp/hospital stay null when the backend doesn't provide them
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setDoctors(
        rows.map((d: any) => ({
          id: d._id || d.id,
          name: pickLocalized(d.name_ar, d.name) || d.display_name,
          deg: d.degree || d.title || null,
          spec: pickLocalized(d.specialty_ar, d.specialty) || null,
          rating: d.rating ?? null,
          reviews: d.review_count ?? d.reviews_count ?? null,
          price: d.consultation_fee ?? d.price ?? null,
          wait: d.average_wait ? `${d.average_wait} دق` : null,
          exp: d.years_experience ?? d.experience_years ?? null,
          online: d.offers_online ?? false,
          clinic: d.offers_clinic ?? false,
          home: d.offers_home ?? false,
          ins: d.accepts_insurance ?? false,
          hospital: d.facility_name || d.clinic_name || null,
          slot: d.next_available_slot || null,
        })),
      );
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors(query, sort);
  }, [sort]);

  const handleSearch = () => fetchDoctors(query, sort);

  const filtered = query
    ? doctors.filter((d) => (d.name || '').includes(query) || (d.spec || '').includes(query))
    : doctors;
  // Null-safe sort: unknown values sink to the end instead of producing NaN ordering
  const sorted = [...filtered].sort((a, b) =>
    sort === "price"
      ? (a.price ?? Infinity) - (b.price ?? Infinity)
      : sort === "wait"
        ? (a.wait || '٩٩٩').localeCompare(b.wait || '٩٩٩')
        : (b.rating ?? -1) - (a.rating ?? -1),
  );

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <AppText variant="h4">البحث عن طبيب</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث بالاسم أو التخصص..."
          icon="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row-reverse",
            gap: 8,
            marginTop: 12,
          }}
        >
          {(
            [
              ["rating", "الأعلى تقييماً"],
              ["price", "الأقل سعراً"],
              ["wait", "الأقل انتظاراً"],
            ] as const
          ).map(([k, l]) => (
            <Chip
              key={k}
              label={l}
              active={sort === k}
              onPress={() => setSort(k)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText
            variant="bodySM"
            color={colors.textSecondary}
            style={{ marginTop: 12 }}
          >
            جاري تحميل الأطباء...
          </AppText>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Icon name="search" size={48} color={colors.textTertiary} />
              <AppText variant="h5" style={{ marginTop: 12 }}>
                لا توجد نتائج
              </AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>
                جرب البحث بتخصص مختلف
              </AppText>
            </View>
          }
          renderItem={({ item: d }) => (
            <DoctorCard
              doctor={d}
              onPress={() =>
                router.push({
                  pathname: "/consultations/doctor/[id]",
                  params: { id: d.id },
                })
              }
              onBook={() =>
                router.push({
                  pathname: "/consultations/book/[id]",
                  params: { id: d.id },
                })
              }
            />
          )}
        />
      )}
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
  docRow: { flexDirection: "row-reverse", gap: 12 },
  ava: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginTop: 12,
  },
  metaI: { alignItems: "center", gap: 2, flex: 1 },
  modeChip: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  foot: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  bookBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 14,
  },
});
