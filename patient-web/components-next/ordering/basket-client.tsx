"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { contextQuery, type Point } from "@/lib/ordering/context";
import { summarize, type OrderMode, type Payer, type QuoteGroup, type ServiceKind } from "@/lib/ordering/quote";
import { moneyText, pickLineName } from "@/lib/ordering/format";
import { QuoteError, QuoteLoading } from "./quote-parts";
import { useOrderLines } from "./use-order-lines";
import { useQuote } from "./use-quote";
import styles from "./ordering.module.css";

type Props = { locale: string; kind: ServiceKind; place: OrderMode; pay: Payer; item?: string; point: Point | null; hubHref: string };

/** Ord04: the basket with the automatic split. The lines are local; prices, split, facility-only labels and alternatives are the quote's. */
export function BasketClient({ locale, kind, place, pay, item, point, hubHref }: Props) {
  const t = useTranslations("OrderingFlow");
  const { lines, isSingle, remove } = useOrderLines(kind, item);
  const request = useMemo(
    () => (point && lines.length ? { service_kind: kind, items: lines.map((l) => l.id), context: { mode: place, lat: point.lat, lng: point.lng, payer: pay } } : null),
    [point, lines, kind, place, pay],
  );
  const { state, reload } = useQuote(request);
  const nameOf = (id: string) => {
    const l = lines.find((x) => x.id === id);
    return l ? pickLineName(locale, l) : undefined;
  };

  if (lines.length === 0) {
    return <EmptyState icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} title={t("basketEmptyTitle")} body={t("basketEmptySub")} />;
  }
  if (!point) {
    return (
      <div className={styles.card}>
        <p className={styles.title}>{t("needAddressTitle")}</p>
        <p className={styles.sub}>{t("needAddressBody")}</p>
        <Link href={`/${locale}/profile/addresses`} className={styles.linkBtn}>{t("addAddress")}</Link>
      </div>
    );
  }
  if (state.status === "error") return <QuoteError errorKey={state.errorKey} onRetry={reload} />;
  if (state.status !== "ready") return <QuoteLoading label={t("basketUpdating")} />;

  const { quote } = state;
  const sum = summarize(quote.groups);
  const providersHref = `/${locale}/labs/providers${contextQuery({ kind, place, pay, item })}`;
  const centreHref = `/${locale}/labs/basket${contextQuery({ kind, place: "facility", pay, item })}`;
  const canContinue = quote.groups.length > 0 && quote.groups.every((g) => g.bestMatch || g.split);
  const multi = quote.groups.length > 1;

  const groupTitle = (g: QuoteGroup) => (g.mode === "home" ? t("gHome", { n: g.items.length }) : t("gCentre", { n: g.items.length }));
  const groupSub = (g: QuoteGroup) => (g.mode === "home" ? t("gHomeSub") : t("gCentreSub"));

  return (
    <div className={styles.stack}>
      {isSingle ? <p className={styles.note}>{t("singleNote")}</p> : null}
      {multi ? <p className={styles.note}>{t("splitNote")}</p> : null}
      {quote.groups.map((g) => (
        <section key={g.mode} className={styles.card} aria-label={groupTitle(g)}>
          <div>
            <h2 className={styles.title}>{groupTitle(g)}</h2>
            <p className={styles.sub}>{groupSub(g)}</p>
          </div>
          <ul className={styles.items}>
            {g.items.map((it) => {
              const line = g.bestMatch?.lines.find((l) => l.catalogId === it.catalogId);
              const name = nameOf(it.catalogId);
              return (
                <li key={it.catalogId}>
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{name ?? t("unnamedItem")}</span>
                    {it.facilityOnly ? (
                      <>
                        <span className={styles.chips}><StatusChip label={t("tagCentreOnly")} tone={DIAG_TONES.facility} /></span>
                        <span className={styles.sub}>{t("centreWhy")}</span>
                      </>
                    ) : null}
                  </span>
                  {line ? <span className={styles.price}><bdi>{moneyText(locale, line.price)}</bdi></span> : null}
                  {isSingle ? null : <button type="button" className={`${styles.linkBtn} ${styles.removeBtn}`} aria-label={`${t("removeAria")}: ${name ?? ""}`} onClick={() => remove(kind, it.catalogId)}>{t("remove")}</button>}
                </li>
              );
            })}
          </ul>
          {g.fromPrice ? <p className={styles.sub}>{t("fromLine", { p: moneyText(locale, g.fromPrice.total), m: g.fromPrice.providersCount })}</p> : null}
          {g.empty ? (
            <div className={styles.note} role="status">
              <strong>{g.mode === "home" ? t("altTitle") : t("altTitleCentre")}</strong>
              {g.empty.alternatives.map((a) =>
                a.type === "facility_nearby" ? (
                  <p key={a.type} className={styles.sub}>
                    {t("altCentre", { n: a.providersCount, km: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(a.nearestKm) })}{" "}
                    <Link href={centreHref}>{t("altCentreBtn")}</Link>
                  </p>
                ) : null,
              )}
            </div>
          ) : null}
        </section>
      ))}

      <section className={styles.card} aria-label={t("summaryTitle")}>
        <div className={styles.line}><span>{t("sumItems", { n: lines.length })}</span><bdi>{moneyText(locale, sum.itemsTotal)}</bdi></div>
        {quote.groups.some((g) => g.mode === "home") ? (
          <div className={styles.line}><span>{t("sumFee")}</span>{sum.homeFee > 0 ? <bdi>{moneyText(locale, sum.homeFee)}</bdi> : <span>{t("feeLater")}</span>}</div>
        ) : null}
        {pay === "insurance" ? <div className={styles.line}><span>{t("sumIns")}</span><bdi>{moneyText(locale, sum.insuranceShare)}</bdi></div> : null}
        <div className={styles.lineTotal}><span>{t("sumTotal")}</span><bdi>{moneyText(locale, sum.total)}</bdi></div>
        {!sum.complete ? <p className={styles.sub}>{t("sumPartial")}</p> : null}
        {pay === "insurance" ? <p className={styles.sub}>{t("covNote")}</p> : null}
        {pay === "insurance" ? <p className={styles.sub}>{t("cashNote")}</p> : null}
        {canContinue ? <Link href={providersHref} className={`${styles.linkBtn} ${styles.cta}`}>{t("basketCta")}</Link> : <p className={styles.sub}>{t("noProviderYet")}</p>}
        {isSingle ? null : <Link href={hubHref} className={styles.linkBtn}>{t("addMore")}</Link>}
      </section>
    </div>
  );
}
