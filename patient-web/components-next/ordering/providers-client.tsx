"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { chosenGroup, SELECTION_KEY } from "@/lib/ordering/basket";
import { contextQuery, type Point } from "@/lib/ordering/context";
import { filterCompare, type OrderMode, type Payer, type ProviderRow, type QuoteGroup, type ServiceKind, type SortKey, type StaffGender } from "@/lib/ordering/quote";
import { hoursUnit, moneyText, pickName, whenText } from "@/lib/ordering/format";
import { CoverageChip, QuoteError, QuoteLoading } from "./quote-parts";
import { useBasket } from "./use-basket";
import { useQuote } from "./use-quote";
import styles from "./ordering.module.css";

type Props = { locale: string; kind: ServiceKind; place: OrderMode; pay: Payer; point: Point | null };
const SORTS: Array<{ key: SortKey; labelKey: "sCheap" | "sNear" | "sFast" | "sRating" }> = [
  { key: "cheapest", labelKey: "sCheap" }, { key: "nearest", labelKey: "sNear" }, { key: "fastest", labelKey: "sFast" }, { key: "rating", labelKey: "sRating" },
];

/** Ord05: best match per group, the compare list (sort and filters) and, when no single provider covers a group, the suggested split. */
export function ProvidersClient({ locale, kind, place, pay, point }: Props) {
  const t = useTranslations("OrderingFlow");
  const router = useRouter();
  const { basket } = useBasket();
  const lines = basket[kind];
  const [sort, setSort] = useState<SortKey>("cheapest");
  const [gender, setGender] = useState<StaffGender | undefined>(undefined);
  const [inNetworkOnly, setInNetworkOnly] = useState(false);
  const [chosen, setChosen] = useState<{ home?: string; facility?: string }>({});

  const request = useMemo(
    () => (point && lines.length ? { service_kind: kind, items: lines.map((l) => l.id), sort, context: { mode: place, lat: point.lat, lng: point.lng, payer: pay, ...(gender ? { staff_gender: gender } : {}) } } : null),
    [point, lines, kind, place, pay, sort, gender],
  );
  const { state, reload } = useQuote(request);
  const basketHref = `/${locale}/labs/basket${contextQuery({ kind, place, pay })}`;

  if (lines.length === 0) return <EmptyState icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} title={t("basketEmptyTitle")} body={t("basketEmptySub")} actionLabel={t("basket")} onAction={() => router.push(basketHref)} />;
  if (!point) return <div className={styles.card}><p className={styles.title}>{t("needAddressTitle")}</p><p className={styles.sub}>{t("needAddressBody")}</p><Link href={`/${locale}/profile/addresses`} className={styles.linkBtn}>{t("addAddress")}</Link></div>;

  const nameOfRow = (r: ProviderRow) => pickName(locale, r.nameAr, r.nameEn);
  const choose = (mode: OrderMode, providerId: string) => setChosen((c) => ({ ...c, [mode]: providerId }));

  const renderRow = ({ r, mode, best }: { r: ProviderRow; mode: OrderMode; best?: boolean }) => (
    <article key={r.providerId} className={`${styles.card} ${best ? styles.cardBest : ""}`} aria-label={nameOfRow(r)}>
      <div className={styles.cardHead}>
        <div>
          {best ? <p className={styles.sub}>{t("best")}</p> : null}
          <h3 className={styles.title}>{nameOfRow(r) ?? t("unnamedProvider")}</h3>
        </div>
        <span className={styles.priceBig}><bdi>{moneyText(locale, r.total)}</bdi></span>
      </div>
      <div className={styles.chips}>
        {pay === "insurance" ? <StatusChip label={r.inNetwork ? t("inNet") : t("outNet")} tone={r.inNetwork ? DIAG_TONES.good : DIAG_TONES.quiet} /> : null}
        <StatusChip label={mode === "home" ? t("homeVisit") : t("atCentre")} tone={DIAG_TONES.facility} />
        {!r.coversAll ? <StatusChip label={t("covers", { a: lines.length - r.missing.length, b: lines.length })} tone={DIAG_TONES.warn} /> : null}
      </div>
      <ul className={styles.meta}>
        {r.rating !== null ? <li>{t("rating", { r: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(r.rating) })}</li> : null}
        {r.distanceKm !== null ? <li>{t("dist", { d: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(r.distanceKm) })}</li> : null}
        {whenText(locale, r.earliestAt) ? <li>{t("earliest", { w: whenText(locale, r.earliestAt) ?? "" })}</li> : null}
        {r.turnaroundHours !== null ? <li>{t("turnaround", { time: hoursUnit(locale, r.turnaroundHours) })}</li> : null}
      </ul>
      {r.coversAll ? (
        <button type="button" className={`${styles.linkBtn} ${chosen[mode] === r.providerId ? "" : styles.cta}`} aria-pressed={chosen[mode] === r.providerId} onClick={() => choose(mode, r.providerId)}>
          {chosen[mode] === r.providerId ? t("chosen") : t("choose")}
        </button>
      ) : null}
    </article>
  );

  const body = () => {
    if (state.status === "error") return <QuoteError errorKey={state.errorKey} onRetry={reload} />;
    if (state.status !== "ready") return <QuoteLoading label={t("matchLoading")} />;
    const { quote } = state;
    const multi = quote.groups.length > 1;
    const section = (g: QuoteGroup) => {
      const rows = filterCompare(g.compare, { inNetworkOnly });
      const rest = rows.filter((r) => r.providerId !== g.bestMatch?.providerId);
      const nameById = (id: string) => nameOfRow(g.compare.find((r) => r.providerId === id) ?? ({ nameAr: null, nameEn: null } as ProviderRow));
      return (
        <section key={g.mode} className={styles.stack} aria-label={g.mode === "home" ? t("gHome", { n: g.items.length }) : t("gCentre", { n: g.items.length })}>
          {multi ? <h2 className={styles.title}>{g.mode === "home" ? t("gHome", { n: g.items.length }) : t("gCentre", { n: g.items.length })}</h2> : null}
          {g.bestMatch ? (
            <>
              {renderRow({ r: g.bestMatch, mode: g.mode, best: true })}
              {g.bestMatch.lines.some((l) => l.coverage) ? (
                <ul className={styles.items} aria-label={t("secCov")}>
                  {g.bestMatch.lines.map((l) => (
                    <li key={l.catalogId}>
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>{pickName(locale, lines.find((x) => x.id === l.catalogId)?.nameAr, lines.find((x) => x.id === l.catalogId)?.nameEn) ?? t("unnamedItem")}</span>
                        {l.coverage ? <span className={styles.chips}><CoverageChip coverage={l.coverage} /></span> : null}
                      </span>
                      <span className={styles.price}><bdi>{moneyText(locale, l.price)}</bdi></span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {pay === "insurance" ? <p className={styles.sub}>{t("covShare", { p: moneyText(locale, g.bestMatch.patientShare) })} · {t("covNote")}</p> : null}
            </>
          ) : null}
          {g.split ? (
            <div className={styles.card}>
              <h3 className={styles.title}>{t("splitTitle")}</h3>
              <p className={styles.sub}>{t("splitSub")}</p>
              <ul className={styles.items}>
                {g.split.assignments.map((a) => (
                  <li key={a.providerId}>
                    <span className={styles.itemName}>{nameById(a.providerId) ?? t("unnamedProvider")}</span>
                    <span className={styles.sub}>{t("splitItems", { n: a.catalogIds.length })}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.lineTotal}><span>{t("total")}</span><bdi>{moneyText(locale, g.split.total)}</bdi></div>
            </div>
          ) : null}
          {g.empty ? <p className={styles.note} role="status">{g.mode === "home" ? t("altTitle") : t("altTitleCentre")} <Link href={basketHref}>{t("backToBasket")}</Link></p> : null}
          {rest.length > 0 ? (
            <>
              <h3 className={styles.title}>{t("compare")} <span className={styles.sub}>{t("count", { n: rows.length })}</span></h3>
              {rest.map((r) => renderRow({ r, mode: g.mode }))}
            </>
          ) : null}
          {rows.length === 0 && g.compare.length > 0 ? (
            <EmptyState icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} title={t("filterEmptyTitle")} body={t("filterEmptyBody")} />
          ) : null}
        </section>
      );
    };
    const allChosen = quote.groups.length > 0 && quote.groups.every((g) => g.compare.some((r) => r.coversAll && r.providerId === chosen[g.mode]));
    const goNext = () => {
      try {
        window.sessionStorage.setItem(SELECTION_KEY, JSON.stringify({ quoteId: quote.quoteId, home: chosen.home, facility: chosen.facility, groups: Object.fromEntries(quote.groups.flatMap((g) => { const c = chosen[g.mode] ? chosenGroup(g, chosen[g.mode] as string) : undefined; return c ? [[g.mode, c]] : []; })) }));
      } catch { /* the next step also reads the choice from the address when storage is blocked */ }
      router.push(`/${locale}/labs/when${contextQuery({ kind, place, pay })}`);
    };
    return (
      <>
        <div className={styles.stack}>{quote.groups.map(section)}</div>
        <button type="button" className={`${styles.linkBtn} ${styles.cta}`} disabled={!allChosen} onClick={goNext}>{t("continue")}</button>
      </>
    );
  };

  return (
    <div className={styles.stack}>
      <p className={styles.sub}>{t("matchBasket", { n: lines.length })}</p>
      <div className={styles.chips} role="group" aria-label={t("sort")}>
        {SORTS.map((s) => <button key={s.key} type="button" className={styles.chip} aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>{t(s.labelKey)}</button>)}
      </div>
      <div className={styles.chips} role="group" aria-label={t("filters")}>
        {pay === "insurance" ? <button type="button" className={styles.chip} aria-pressed={inNetworkOnly} onClick={() => setInNetworkOnly((v) => !v)}>{t("fNet")}</button> : null}
        <button type="button" className={styles.chip} aria-pressed={gender === "female"} onClick={() => setGender((g) => (g === "female" ? undefined : "female"))}>{t("fGender")}</button>
      </div>
      {body()}
    </div>
  );
}
