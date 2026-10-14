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
import { autoTranslate } from '../../../src/i18n';
import { dateLocaleFor } from '../../../src/utils/dates';
import { DOCTOR_SORTS, doctorRows, doctorsQuery, type DoctorSort } from '../../../src/utils/doctorSearch';

// Removed STATIC_DOCS

export default function DoctorSearchView() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const tr = (s: string): string => autoTranslate(s, lang);
  const params = useLocalSearchParams();
  // the route's `specialty` is a filter the server understands, not text to type into the search box
  const specialty = typeof params.specialty === "string" ? params.specialty : "";
  const [query, setQuery] = useState(typeof params.q === "string" ? params.q : "");
  const [sort, setSort] = useState<DoctorSort>("rating");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async (search: string, sortBy: DoctorSort) => {
    try {
      setLoading(true);
      // GET /care/doctors reads q, specialty and sort (rating | price_asc | ...) and answers { items: [...] }
      const res = await apiFetch(`/care/doctors?${doctorsQuery({ q: search, specialty, sort: sortBy })}`);
      setDoctors(
        doctorRows(
          res,
          (ar, en) => pickLocalized(ar, en) ?? null,
          (iso) => {
            const d = new Date(iso);
            return Number.isNaN(d.getTime()) ? null : d.toLocaleString(dateLocaleFor(lang), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
          },
        ),
      );
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [specialty, lang]);

  // search as the user types (the server does the matching), and again when the sort changes
  useEffect(() => {
    const timer = setTimeout(() => { void fetchDoctors(query, sort); }, 350);
    return () => clearTimeout(timer);
  }, [query, sort, fetchDoctors]);

  const sorted = doctors;

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
        <AppText variant="h4">{tr("search.doctors.title")}</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={tr("search.doctors.placeholder")}
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
          {DOCTOR_SORTS.map((k) => (
            <Chip
              key={k}
              label={tr(k === "rating" ? "search.doctors.sortRating" : "search.doctors.sortPrice")}
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
            {tr("search.doctors.loading")}
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
                {tr("search.doctors.emptyTitle")}
              </AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>
                {tr("search.doctors.emptyBody")}
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
