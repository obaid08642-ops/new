import { SUGGEST_SCOPES } from "@/lib/search/suggest";
import { notFound } from "next/navigation";
import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { getPublicNursingCatalog, getPublicNursingServices } from "@/lib/api/nursing-catalog-server";
import { getDirection, isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { Caret, NURSING, RowList, ServiceChips, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { nursingOfferLine } from "@/components-next/nursing/nursing-offers";
import { SearchForm } from "@/components-next/diagnostics/diag-parts";
import { pickName, pickTexts, textsInclude } from "@/lib/i18n/localized";
import type { Metadata } from "next";
import { AddToBasketIcon } from "@/components-next/ordering/add-to-basket";
import { BasketBar } from "@/components-next/ordering/basket-bar";
import styles from "@/components-next/ordering/ordering.module.css";

/**
 * The service length in the page's language (needs-review issue 1071): the server sends a value and an English unit
 * ("1 hour", or 45 + "minutes"); only minute/hour/day are formatted, anything else is not printed raw.
 */
function localDuration(locale: string, value: number | undefined, raw: string | undefined): string | undefined {
  const m = /^\s*(\d+(?:\.\d+)?)?\s*(minute|hour|day)s?\s*$/i.exec(raw ?? "");
  const amount = value ?? (m?.[1] ? Number(m[1]) : undefined);
  const unit = m?.[2]?.toLowerCase() as "minute" | "hour" | "day" | undefined;
  if (!unit || amount === undefined || !Number.isFinite(amount)) return undefined;
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" }).format(amount);
}

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NursingCatalog" });
  const canonical = localizedUrl(locale, "/nursing/catalog");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/nursing/catalog")])), "x-default": localizedUrl("ar", "/nursing/catalog") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("subtitle"), siteName: "Nabd Plus", images: [{ url: `${process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus"}/images/nursing/home-nurse.jpg`, alt: t("title") }] },
    twitter: { card: "summary_large_image", title: t("title"), description: t("subtitle") },
    robots: { index: true, follow: true },
  };
}

/**
 * The public nursing catalogue (canvas/ServiceHub list): a row per service the server lists, each going to the service page.
 * It used to open a booking window that confirmed with a made-up reference and a made-up price; a booking is only a booking
 * when the booking call answered, so the service page and its booking page (/home-care/services/:id/book) are the way in.
 */
export default async function NursingCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q = "" } = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const w = await getTranslations("DiagWeb");
  let items: ReturnType<typeof extractNursingCatalog> = [];
  try {
    // the same list as the home care hub (GET /home-care/services): every catalogue service with what nurses offer for it
    const response = await getPublicNursingServices().then((r) => (r && r.ok ? r : getPublicNursingCatalog()));
    if (response && response.ok) {
      items = extractNursingCatalog(await response.json().catch(() => null));
    }
  } catch {}
  const caret = <Caret rtl={getDirection(locale) === "rtl"} />;
  // journeys#63: the one services list (the home care hub's "browse services" lands here too), with its search.
  const query = q.trim().toLocaleLowerCase(locale);
  const shown = query
    ? items.filter((item) => textsInclude(item.names, query, locale) || textsInclude(item.descriptions, query, locale))
    : items;

  return (
    <ConsultPage locale={locale} title={t("catalogTitle")} backHref={`/${locale}/home-care`}>
      <StaleWhileRevalidate />
      {items.length > 0 ? <SearchForm suggest={{ locale, scope: SUGGEST_SCOPES.nursing }} defaultValue={q} placeholder={t("searchPlaceholder")} label={t("searchLabel")} submitLabel={t("searchSubmit")} /> : null}
      {items.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("catalogEmptyTitle")} body={t("catalogEmptyBody")} />
      ) : shown.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("servicesEmpty")} body={t("noMatch")} />
      ) : (
        <RowList label={t("catalogTitle")}>
          {shown.map((item) => {
            const name = pickName(locale, item.names) ?? "";
            const description = pickTexts(locale, item.descriptions);
            const duration = localDuration(locale, item.durationValue, item.duration);
            const offer = nursingOfferLine({ locale, tr: (key, values) => w(key, values), offer: item.offer, price: item.price });
            return (
              <li key={item.id} className={styles.rowWithAdd}>
                <RowCard
                  href={`/${locale}/home-care/services/${encodeURIComponent(item.id)}`}
                  icon={serviceIcon(item.id, item.category, item.nameAr, item.nameEn)}
                  tone={NURSING.tone}
                  title={name}
                  sub={[description, offer.line].filter(Boolean).join(" · ") || undefined}
                  extra={<ServiceChips duration={duration || undefined} insurance={item.insuranceAvailable ? t("insurance") : undefined} extras={offer.chips} />}
                  caret={caret}
                />
                <AddToBasketIcon kind="nursing" line={{ id: item.id, nameAr: item.nameAr, nameEn: item.nameEn }} name={name} />
              </li>
            );
          })}
        </RowList>
      )}
      <BasketBar locale={locale} kind="nursing" place="home" pay="cash" />
    </ConsultPage>
  );
}
