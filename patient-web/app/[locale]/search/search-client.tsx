"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Chip, SectionHeader, ServiceTile } from "@/components-next/ui-generated/components/Surfaces";
import { EmptyState, ErrorState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Search } from "@/components-next/ui-generated/components/Inputs";
import { SERVICE_ICONS, type FillIconName, type ServiceName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { CoreShell } from "@/components-next/core/core-shell";
import { extractSearchResults, intentRedirect, truncateQuery, type SearchResult } from "@/lib/api/search";
import { specialtyLabel, type SpecialtySlug } from "@/lib/specialties";
import { isLocale, type Locale } from "@/lib/i18n";
import styles from "./search.module.css";

type Tab = "all" | "medicines" | "doctors" | "labs" | "radiology" | "other";

/**
 * What a result is, from the API's stable English type (`typeEn`): its group on the page, the glyph
 * and tone of the board's icon set, and the detail page that exists for it (none for kinds without
 * one: those rows are not links).
 */
const toneOf = (service: ServiceName): ServiceTone => SERVICE_ICONS[service].tone;
const KINDS: Record<string, { group: Exclude<Tab, "all">; icon: FillIconName; tone: ServiceTone; href?: (id: string, locale: string) => string }> = {
  Medicine: { group: "medicines", icon: "pill", tone: toneOf("pharmacy"), href: (id, l) => `/${l}/medicines/${encodeURIComponent(id)}` },
  Doctor: { group: "doctors", icon: "stethoscope", tone: toneOf("consult"), href: (id, l) => `/${l}/consultations/doctors/${encodeURIComponent(id)}` },
  Lab: { group: "labs", icon: "test-tube", tone: toneOf("lab") },
  Radiology: { group: "radiology", icon: "scan", tone: toneOf("radiology"), href: (id, l) => `/${l}/diagnostics/radiology/${encodeURIComponent(id)}` },
  Package: { group: "other", icon: "gift", tone: toneOf("points") },
  Article: { group: "other", icon: "file-text", tone: toneOf("nutrition"), href: (id, l) => `/${l}/articles/${encodeURIComponent(id)}` },
  Disease: { group: "other", icon: "heartbeat", tone: toneOf("health"), href: (id, l) => `/${l}/articles/${encodeURIComponent(id)}` },
  Insurance: { group: "other", icon: "shield-check", tone: toneOf("insurance") },
  Family: { group: "other", icon: "users", tone: toneOf("maternity") },
};
const FALLBACK = { group: "other" as const, icon: "magnifying-glass" as FillIconName, tone: toneOf("consult") };

const BROWSE: Array<{ name: ServiceName; label: "catPharmacy" | "catConsult" | "catLab" | "catRadiology" | "catNursing" | "catMind" | "catNutrition" | "catFamily"; path: string }> = [
  { name: "pharmacy", label: "catPharmacy", path: "/pharmacy" }, // i18n-ok: label is a Search message key
  { name: "consult", label: "catConsult", path: "/consultations/doctors" }, // i18n-ok: label is a Search message key
  { name: "lab", label: "catLab", path: "/diagnostics/labs" }, // i18n-ok: label is a Search message key
  { name: "radiology", label: "catRadiology", path: "/diagnostics/radiology" }, // i18n-ok: label is a Search message key
  { name: "nursing", label: "catNursing", path: "/home-care" }, // i18n-ok: label is a Search message key
  { name: "mind", label: "catMind", path: "/mental-health" }, // i18n-ok: label is a Search message key
  { name: "nutrition", label: "catNutrition", path: "/nutrition" }, // i18n-ok: label is a Search message key
  { name: "family", label: "catFamily", path: "/family" }, // i18n-ok: label is a Search message key
];

const kindOf = (r: SearchResult) => KINDS[r.typeEn || ""] || FALLBACK;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The query inside the name, marked (the board's highlight), when it really occurs there. */
function Highlighted({ text, query }: { text: string; query: string }) {
  if (query.length < 2) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "i"));
  if (parts.length === 1) return <>{text}</>;
  return <>{parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className={styles.mark}>{part}</mark> : <Fragment key={i}>{part}</Fragment>))}</>;
}

export function ResultItem({ result, locale, query }: { result: SearchResult; locale: string; query: string }) {
  const t = useTranslations("Search");
  const kind = kindOf(result);
  const route = KINDS[result.typeEn || ""]?.href;
  const href = route ? route(result.id, locale) : undefined;
  // A doctor's sub line is the specialty SLUG: shown by its translated name (hidden when unknown). Other kinds' codes
  // ("whole_body", "chest") are identifiers, not words to show.
  const specialties = useTranslations("SpecialtyNames");
  const isCode = !!result.sub && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(result.sub);
  const sub = result.typeEn === "Doctor" && isCode
    ? specialtyLabel(specialties as unknown as (key: SpecialtySlug) => string, result.sub) ?? undefined
    : result.sub && !isCode ? result.sub : undefined;
  const price = result.price && Number(result.price) > 0 ? result.price : undefined;
  const rate = result.rate && Number(result.rate) > 0 ? result.rate : undefined;
  const body = <>
    <span className={styles.media}><FIcon icon={kind.icon} tone={kind.tone} chip="none" size={40} /></span>
    <span className={styles.main}>
      <span className={styles.name}><Highlighted text={result.name} query={query} /></span>
      {sub ? <span className={styles.sub}>{sub}</span> : null}
      <span className={styles.meta}>
        {price ? <span className={styles.price}>{t("price", { value: price })}</span> : null}
        {rate ? <span className={styles.rate}>{t("rating", { value: rate })}</span> : null}
        <StatusChip label={result.type} tone={kind.tone} />
      </span>
    </span>
  </>;
  return href
    ? <Link href={href} className={styles.item}>{body}</Link>
    : <div className={styles.item}>{body}</div>;
}

export function SearchClient({ locale, initialQuery = "" }: { locale: string; initialQuery?: string }) {
  const t = useTranslations("Search");
  const routeState = useTranslations("RouteState");
  const shellLocale: Locale = isLocale(locale) ? locale : "ar";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">(initialQuery.trim().length >= 2 ? "loading" : "idle");
  const [tab, setTab] = useState<Tab>("all");
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const q = query.trim();
  const searching = q.length >= 2;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); setState("idle"); return; }
    timer.current = setTimeout(async () => {
      setState("loading");
      try {
        const response = await fetch(`/api/patient/home/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("search_unavailable");
        const found = extractSearchResults(await response.json().catch(() => []), locale);
        // F71: one request per query. Only a query that found NOTHING asks the intent parser, and a confident intent
        // (a specialty, a lab, a medicine catalogue) takes the person to that page instead of an empty list.
        if (found.length === 0) {
          try {
            const intentResponse = await fetch("/api/search/intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q, locale }), cache: "no-store" });
            const target = intentResponse.ok ? intentRedirect(await intentResponse.json().catch(() => null), locale) : null;
            if (target) { window.location.assign(target); return; }
          } catch { /* the empty state is the answer */ }
        }
        setResults(found);
        setTab("all");
        setState("idle");
      } catch {
        setState("error");
      }
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, locale, attempt]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: results.length, medicines: 0, doctors: 0, labs: 0, radiology: 0, other: 0 };
    for (const r of results) c[kindOf(r).group] += 1;
    return c;
  }, [results]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: t("tabAll") },
    { id: "medicines", label: t("tabMedicines") },
    { id: "doctors", label: t("tabDoctors") },
    { id: "labs", label: t("tabLabs") },
    { id: "radiology", label: t("tabRadiology") },
    { id: "other", label: t("tabOther") },
  ];
  const sections: Array<{ id: string; title: string; groups: Array<Exclude<Tab, "all">> }> = [
    { id: "medicines", title: t("sectionMedicines"), groups: ["medicines"] },
    { id: "doctors", title: t("sectionDoctors"), groups: ["doctors"] },
    { id: "tests", title: t("sectionTests"), groups: ["labs", "radiology"] },
    { id: "other", title: t("sectionOther"), groups: ["other"] },
  ];

  const shown = (groups: Array<Exclude<Tab, "all">>) => results.filter((r) => {
    const g = kindOf(r).group;
    return groups.includes(g) && (tab === "all" || tab === g);
  });

  let content: React.ReactNode;
  if (!searching) {
    content = <section className={styles.browse} aria-label={t("browseTitle")}>
      <SectionHeader title={t("browseTitle")} />
      <ul className={styles.tiles}>
        {BROWSE.map((b) => (
          <li key={b.name}><Link href={`/${locale}${b.path}`} className={styles.tileLink}><ServiceTile name={b.name} label={t(b.label)} /></Link></li>
        ))}
      </ul>
    </section>;
  } else if (state === "loading") {
    content = <p role="status" className={styles.status}>{t("searching")}</p>;
  } else if (state === "error") {
    content = <ErrorState title={t("error")} retryLabel={routeState("retry")} onRetry={() => setAttempt((n) => n + 1)} />;
  } else if (results.length === 0) {
    content = <EmptyState icon="magnifying-glass" tone={toneOf("consult")} title={t("empty")} body={t("emptyHint")} />;
  } else {
    content = <>
      <div className={styles.summary}>
        <h1 className={styles.heading}>{t("resultsFor", { query: q })}</h1>
        <p className={styles.count}>{t("resultsCount", { count: results.length })}</p>
      </div>
      <div className={styles.chips} role="group" aria-label={t("title")}>
        {tabs.filter((x) => x.id === "all" || counts[x.id] > 0).map((x) => (
          <Chip key={x.id} label={x.label} count={counts[x.id]} selected={tab === x.id} onClick={() => setTab(x.id)} />
        ))}
      </div>
      {sections.map((section) => {
        const items = shown(section.groups);
        if (items.length === 0) return null;
        return <section key={section.id} className={styles.group} data-single={tab === "all" ? undefined : "true"} aria-label={section.title}>
          <div className={styles.groupHead}><SectionHeader title={section.title} /></div>
          <div className={styles.items}>
            {items.map((r) => <ResultItem key={`${r.typeEn}-${r.id}`} result={r} locale={locale} query={q} />)}
          </div>
        </section>;
      })}
      <div className={styles.rx}>
        <span className={styles.rxText}>{t("rxHelp")}</span>
        <Link href={`/${locale}/pharmacy/rx-order?via=photo`} className={styles.rxAction}>{t("rxAction")}</Link>
      </div>
    </>;
  }

  return (
    <CoreShell
      locale={shellLocale}
      cancelHref={`/${locale}`}
      search={<Search variant="page" value={query} onChange={(value) => setQuery(truncateQuery(value))} placeholder={t("placeholder")} label={t("title")} onClear={() => setQuery("")} clearLabel={t("clear")} />}
    >
      {searching && state === "idle" && results.length > 0 ? null : <h1 className={styles.srOnly}>{t("title")}</h1>}
      {content}
    </CoreShell>
  );
}
