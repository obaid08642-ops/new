import { DiagArt } from "@/components-next/diagnostics/diag-art";
import { ItemPicture } from "@/components-next/diagnostics/item-picture";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { BulletList, Facts, Hero, Notice, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { LAB, RADIOLOGY, hoursText, minutesText } from "@/components-next/diagnostics/diag-parts";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";
import { ItemActions } from "@/components-next/ordering/add-to-basket";
import styles from "@/components-next/diagnostics/diag.module.css";
import { BasketBar } from "@/components-next/ordering/basket-bar";
import { NURSING } from "@/components-next/nursing/nursing-parts";
import { CoverageChip } from "@/components-next/ordering/quote-parts";
import { OffersSection } from "@/components-next/diagnostics/offers-section";
import { ConsultState } from "@/components-next/consult/consult-state";
import { moneyText } from "@/lib/ordering/format";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { preparationField } from "@/lib/ordering/item";
import { LocalizedField, LocalizedList } from "@/components-next/ui/localized-field";
import { extractLabServices, includedTestNames } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { pickName, perLocaleOf } from "@/lib/i18n/localized";
import { loadItem } from "@/lib/ordering/load-item";
import { contextQuery, payOf, placeOf } from "@/lib/ordering/context";
import { parseQuote, type Quote } from "@/lib/ordering/quote";
import { kindOf, optionalToken, patientPoint } from "@/lib/ordering/server";

type Props = { params: Promise<{ locale: string; testSlug: string }>; searchParams?: Promise<{ kind?: string; place?: string; pay?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "OrderingFlow" });
  return { title: t("itemTitle"), robots: { index: false, follow: false } };
}


/** Ord03 (canvas/Ord03-ItemPage): preparation, result time and sample from the catalogue; the price, provider count and coverage from a quote for this one item. */
export default async function OrderingItemPage({ params, searchParams }: Props) {
  const { locale, testSlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const kind = kindOf(query.kind);
  const place = placeOf(query.place);
  const pay = payOf(query.pay);
  const t = await getTranslations("OrderingFlow");
  const w = await getTranslations("DiagWeb");

  const { item, failed } = await loadItem(kind, testSlug);
  if (!item && !failed) notFound();
  const hub = `/${locale}/diagnostics${kind === "radiology" ? "?kind=radiology" : ""}`;
  if (!item) {
    return (
      <ConsultPage locale={locale} title={t("itemTitle")} backHref={hub}>
        <ConsultState kind="error" title={t("itemErr")} body={t("itemErrSub")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }

  // A service no provider offers yet is shown (and can be asked for with "Notify me"), but it has no price to quote and cannot be ordered.
  const unoffered = item.offer?.providersCount === 0;
  // The quote needs a session and a saved point; without them the page still shows the catalogue facts.
  const token = await optionalToken(locale);
  let quote: Quote | null = null;
  let quoteNote: "signin" | "address" | "failed" | null = token ? null : "signin";
  if (token && !unoffered) {
    const point = await patientPoint(token);
    if (!point) quoteNote = "address";
    else {
      const res = await callPatientApi("/ordering/quote", { method: "POST", body: JSON.stringify({ service_kind: kind, items: [item.id], context: { mode: place, lat: point.lat, lng: point.lng, payer: pay } }) }, token).catch(() => null);
      quote = res?.ok ? parseQuote(await res.json().catch(() => null)) : null;
      if (!quote) quoteNote = "failed";
    }
  }

  const name = pickName(locale, item.names ?? { ar: item.nameAr, en: item.nameEn }) ?? t("itemTitle");
  // a package stores its tests as Arabic names or codes: shown in the page's language where the lab list knows them
  const catalogue = item.isPackage && item.included.length > 0 ? await Promise.resolve().then(() => getPublicLabServices()).catch(() => null) : null;
  const included = item.isPackage ? includedTestNames(locale, item.included, catalogue && catalogue.ok ? extractLabServices(await catalogue.json().catch(() => null)) : []) : [];
  const prep = preparationField(locale, item);
  const nameTexts = item.names ?? { ar: item.nameAr, en: item.nameEn };
  const descTexts = item.descriptions ?? { ar: item.descriptionAr, en: item.descriptionEn };
  const tone = kind === "radiology" ? RADIOLOGY : kind === "nursing" ? NURSING : LAB;
  const group = quote?.groups[0] ?? null;
  const best = group?.bestMatch ?? null;
  const line = best?.lines.find((l) => l.catalogId === item.id);
  // Catalogue sample codes (lab_services.sample_type) -> translated label; an unknown code is hidden, never shown raw.
  const SAMPLE_CODES = ["blood", "semen", "stool", "swab", "urine"] as const;
  const sampleCode = item.sampleType?.trim().toLowerCase();
  const sampleLabel = sampleCode && (SAMPLE_CODES as readonly string[]).includes(sampleCode) ? t(`sample_${sampleCode}` as `sample_blood`) : null;
  const facts: FactRow[] = [
    ...(item.turnaroundHours !== undefined ? [{ label: t("secTurn"), value: t("turnaround", { time: hoursText(locale, item.turnaroundHours) }), icon: "file-text", tone: DIAG_TONES.info } as FactRow] : []),
    ...(sampleLabel ? [{ label: t("secSample"), value: sampleLabel, icon: "test-tube", tone: LAB.tone } as FactRow] : []),
    ...(item.durationValue !== undefined && item.duration && /minute/i.test(item.duration) ? [{ label: t("duration"), value: minutesText(locale, item.durationValue), icon: "clock-counter-clockwise", tone: DIAG_TONES.info } as FactRow] : []),
  ];

  return (
    <ConsultPage locale={locale} title={name} backHref={hub}>
      <Hero icon={tone.icon} tone={tone.tone} title={<LocalizedField locale={locale} ar={nameTexts.ar} en={nameTexts.en} />} sub={<LocalizedField locale={locale} ar={descTexts.ar} en={descTexts.en} perLocale={perLocaleOf(item.descriptions)} />} picture={item.imageUrl ? <ItemPicture imageUrl={item.imageUrl} fallback={item.art ? <DiagArt art={item.art} size={56} /> : <FIcon icon={tone.icon} tone={tone.tone} size={52} />} /> : item.art ? <DiagArt art={item.art} size={56} /> : undefined} />
      <SectionCard id="item-prep" title={t("secPrep")}>
        {item.fastingHours !== undefined || prep.items.length > 0 ? (
          <>
            {item.fastingHours !== undefined ? <p>{item.fastingHours > 0 ? t("fastHours", { n: item.fastingHours }) : t("fastRequired")}</p> : null}
            <LocalizedList locale={locale} field={prep}>{(items) => <BulletList items={items} />}</LocalizedList>
          </>
        ) : (
          <p>{t("prepNone")}</p>
        )}
      </SectionCard>
      {facts.length > 0 ? <SectionCard id="item-facts" title={t("secFacts")}><Facts rows={facts} label={t("secFacts")} /></SectionCard> : null}
      {item.isPackage && item.included.length > 0 ? (
        <SectionCard id="item-included" title={t("pkgCount", { n: item.included.length })}><BulletList items={included} /></SectionCard>
      ) : null}

      <OffersSection locale={locale} t={w} kind={kind} serviceId={item.id} offer={item.offer} offers={item.offers} />

      {unoffered ? null : <SectionCard id="item-price" title={t("secPrice")}>
        {group?.fromPrice ? (
          <>
            <p><strong><bdi>{moneyText(locale, group.fromPrice.total)}</bdi></strong> · {t("providers", { m: group.fromPrice.providersCount })}</p>
            <p>{t("fromWhere")}{place === "home" ? ` · ${t("homeFeeNote")}` : ""}</p>
          </>
        ) : group?.empty ? (
          <p>{place === "home" ? t("altTitle") : t("altTitleCentre")}</p>
        ) : quoteNote === "signin" ? (
          <p>{t("noteSignIn")}</p>
        ) : quoteNote === "address" ? (
          <p>{t("needAddressBody")}</p>
        ) : (
          <p>{t("errGeneric")}</p>
        )}
        {pay === "insurance" && line?.coverage ? (
          <>
            <p><CoverageChip coverage={line.coverage} /></p>
            {line.coverage === "not_covered" ? <p>{t("covCash", { p: moneyText(locale, line.price) })}</p> : <p>{t("covShare", { p: moneyText(locale, best?.patientShare ?? line.price) })}</p>}
            <Notice>{t("covNote")}</Notice>
          </>
        ) : null}
        {item.isPackage ? <Notice>{t("pkgCashNote")}</Notice> : null}
      </SectionCard>}

      {unoffered ? null : (
        <div className={styles.itemActions}>
          <ItemActions kind={kind} line={{ id: item.id, nameAr: item.nameAr, nameEn: item.nameEn }} orderHref={`/${locale}/labs/basket${contextQuery({ kind, place, pay })}`} />
        </div>
      )}
      <BasketBar locale={locale} kind={kind} place={place} pay={pay} />
    </ConsultPage>
  );
}
