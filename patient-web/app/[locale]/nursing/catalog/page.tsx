import { notFound } from "next/navigation";
import { StaleWhileRevalidate } from "@/components-next/nav/stale-while-revalidate";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { getPublicNursingCatalog } from "@/lib/api/nursing-catalog-server";
import { getDirection, isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { RowCard } from "@/components-next/consult/consult-parts";
import { Caret, NURSING, RowList, ServiceChips, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { money, pickText } from "@/components-next/diagnostics/diag-parts";
import type { Metadata } from "next";

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

type Props = { params: Promise<{ locale: string }> };

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
 * when the booking call answered, so the service page (and, behind it, the nurse's page with its booking form) is the way in.
 */
export default async function NursingCatalogPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  let items: ReturnType<typeof extractNursingCatalog> = [];
  try {
    const response = await getPublicNursingCatalog();
    if (response && response.ok) {
      items = extractNursingCatalog(await response.json().catch(() => null));
    }
  } catch {}
  const caret = <Caret rtl={getDirection(locale) === "rtl"} />;

  return (
    <ConsultPage locale={locale} title={t("catalogTitle")} backHref={`/${locale}/home-care`}>
      <StaleWhileRevalidate />
      {items.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("catalogEmptyTitle")} body={t("catalogEmptyBody")} />
      ) : (
        <RowList label={t("catalogTitle")}>
          {items.map((item) => {
            const name = pickText(locale, item.nameAr, item.nameEn) ?? "";
            const description = pickText(locale, item.descriptionAr, item.descriptionEn);
            const duration = localDuration(locale, item.durationValue, item.duration);
            return (
              <li key={item.id}>
                <RowCard
                  href={`/${locale}/home-care/services/${encodeURIComponent(item.id)}`}
                  icon={serviceIcon(item.id, item.category, item.nameAr, item.nameEn)}
                  tone={NURSING.tone}
                  title={name}
                  sub={[description, item.price !== undefined ? money(locale, item.price) : ""].filter(Boolean).join(" · ") || undefined}
                  extra={<ServiceChips duration={duration || undefined} insurance={item.insuranceAvailable ? t("insurance") : undefined} />}
                  caret={caret}
                />
              </li>
            );
          })}
        </RowList>
      )}
    </ConsultPage>
  );
}
