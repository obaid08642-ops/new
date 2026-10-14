// @ts-nocheck
import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * `/search?view=pharmacy` (also the old pharmacy search and the prescription translator's "details" button): the
 * global search is the medicine search, so go there and keep the query the caller passed (q), with no `view`.
 */
export default function PharmacyProductSearchView() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const query = typeof q === "string" ? q : "";
  return <Redirect href={query ? { pathname: "/search", params: { q: query } } : "/search"} />;
}
