// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
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
} from "../../../src/components/ui";
import { apiFetch } from "../../../src/utils/api";
import { pickLocalized } from '../../../src/utils/localize';
import { autoTranslate } from '../../../src/i18n';
import { dateLocaleFor } from '../../../src/utils/dates';
import { DoctorListCard } from '../consult/DoctorListCard';
import { DOCTOR_GENDERS, DOCTOR_SORTS, doctorRows, doctorsQuery, sortFromParam, type DoctorGender, type DoctorSort } from '../../../src/utils/doctorSearch';
import { GuaranteeLine, useLateGuarantee } from '../../../src/components/consult/Differentiators';
import { SUGGEST_SCOPES, suggestionRoute } from '../../../src/utils/searchSuggest';
import { useSearchSuggest } from '../../../src/hooks/useSearchSuggest';
import { SearchSuggestList } from '../../../src/components/search/SearchSuggestList';

// Removed STATIC_DOCS

export default function DoctorSearchView() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const tr = (s: string): string => autoTranslate(s, lang);
  const params = useLocalSearchParams();
  // the route's `specialty` is a filter the server understands, not text to type into the search box
  const specialty = typeof params.specialty === "string" ? params.specialty : "";
  const [query, setQuery] = useState(typeof params.q === "string" ? params.q : "");
  const suggest = useSearchSuggest(query, lang, SUGGEST_SCOPES.consultations);
  // a "book now" entry arrives with ?sort=available_today (owner decision 2026-10-24)
  const [sort, setSort] = useState<DoctorSort>(sortFromParam(params.sort) ?? "rating");
  const [gender, setGender] = useState<DoctorGender | 'any'>('any');
  const guarantee = useLateGuarantee();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async (search: string, sortBy: DoctorSort, genderBy: DoctorGender | 'any') => {
    try {
      setLoading(true);
      // GET /care/doctors reads q, specialty and sort (rating | price_asc | ...) and answers { items: [...] }
      const res = await apiFetch(`/care/doctors?${doctorsQuery({ q: search, specialty, sort: sortBy, gender: genderBy })}`);
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
    const timer = setTimeout(() => { void fetchDoctors(query, sort, gender); }, 350);
    return () => clearTimeout(timer);
  }, [query, sort, gender, fetchDoctors]);

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
        {suggest.open ? (
          <SearchSuggestList
            items={suggest.items}
            query={query}
            onPick={(item) => {
              const route = suggestionRoute(item);
              if (!route) return;
              suggest.close();
              router.push({ pathname: route.pathname, params: route.params } as any);
            }}
          />
        ) : null}
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
              label={tr(k === "rating" ? "search.doctors.sortRating" : k === "price_asc" ? "search.doctors.sortPrice" : "search.doctors.sortAvailable")}
              active={sort === k}
              onPress={() => setSort(k)}
            />
          ))}
          {(['any', ...DOCTOR_GENDERS] as const).map((g) => (
            <Chip
              key={g}
              label={tr(g === 'any' ? 'search.doctors.genderAny' : g === 'male' ? 'search.doctors.genderMale' : 'search.doctors.genderFemale')}
              active={gender === g}
              onPress={() => setGender(g)}
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
        <FlashList
          data={sorted}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
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
            <View style={{ gap: 6 }}>
            <DoctorListCard
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
            <GuaranteeLine guarantee={guarantee} />
            </View>
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
