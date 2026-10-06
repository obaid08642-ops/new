import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractLabService } from "@/lib/api/labs";
import { getPublicLabPackage } from "@/lib/api/labs-server";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, BulletList, Facts, Hero, Notice, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { LAB, TagRow, hoursText, money, pickText, type Tag } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string; packageId: string }> };

export async function generateMetadata({ params }: { params: Promise<{ packageId: string; locale: string }> }): Promise<Metadata> {
  const { locale, packageId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const canonical = localizedUrl(locale, `/diagnostics/packages/${encodeURIComponent(packageId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, ""))])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

/** A lab package (canvas/ServiceHub, the package card opened): the tile, the name, the price and the facts the catalogue sent, the tests it includes, the preparation, then booking or adding it to the order. */
export default async function LabPackageDetailPage({ params }: Props) {
  const { locale, packageId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("LabsPackages");
  const w = await getTranslations("DiagWeb");

  let pkg = null;
  let response;
  try {
    response = await getPublicLabPackage(packageId);
    if (response && response.status === 404) notFound();
    if (response && response.ok) {
      pkg = extractLabService(await response.json().catch(() => null));
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") throw err;
  }
  if (response?.status === 404) notFound();
  if (!pkg) notFound();

  const name = pickText(locale, pkg.nameAr, pkg.nameEn);
  const description = pickText(locale, pkg.descriptionAr, pkg.descriptionEn);
  const preparation = (locale === "ar" || locale === "ur" ? pkg.preparationAr ?? pkg.preparationEn : pkg.preparationEn ?? pkg.preparationAr) ?? [];
  const tags: Tag[] = [
    ...(pkg.homeVisitSupported ? [{ label: w("tagHome"), tone: LAB.tone } as Tag] : []),
    ...(pkg.fastingRequired ? [{ label: w("tagFasting"), tone: "amber" } as Tag] : []),
  ];
  const rows: FactRow[] = [
    ...(pkg.price !== undefined ? [{ label: t("priceLabel"), value: <bdi>{money(locale, pkg.price)}</bdi>, icon: "tag", tone: LAB.tone } as FactRow] : []),
    ...(pkg.oldPrice !== undefined && pkg.oldPrice > (pkg.price ?? 0) ? [{ label: t("previousPrice"), value: <bdi>{money(locale, pkg.oldPrice)}</bdi>, icon: "tag", tone: "amber" } as FactRow] : []),
    ...(pkg.includedServices?.length ? [{ label: t("testsLabel"), value: t("tests", { count: pkg.includedServices.length }), icon: "test-tube", tone: LAB.tone } as FactRow] : []),
    ...(pkg.turnaroundHours !== undefined ? [{ label: t("turnaround"), value: hoursText(locale, pkg.turnaroundHours), icon: "file-text", tone: "blue" } as FactRow] : []),
    ...(pkg.fastingRequired ? [{ label: t("preparation"), value: pkg.fastingHours ? t("fastingHours", { value: pkg.fastingHours }) : t("fasting"), icon: "clock-counter-clockwise", tone: "amber" } as FactRow] : []),
  ];
  const addHref = `/${locale}/diagnostics/cart?add=${encodeURIComponent(packageId)}&name=${encodeURIComponent(name ?? "")}${pkg.price !== undefined ? `&price=${pkg.price}` : ""}`;

  return (
    <ConsultPage locale={locale} title={name ?? t("title")} backHref={`/${locale}/diagnostics/packages`}>
      <JsonLd data={[medicalWebPage({ title: name ?? t("title"), description: description ?? null, locale, path: `/diagnostics/packages/${packageId}` }), breadcrumbList([{ name: t("title"), locale, path: "/diagnostics/packages" }, { name: name ?? t("title"), locale, path: `/diagnostics/packages/${packageId}` }])]} />
      <Hero icon={LAB.icon} tone={LAB.tone} title={name ?? t("title")} sub={description}>
        <TagRow tags={tags} />
      </Hero>
      {rows.length > 0 ? <SectionCard id="pkg-facts" title={t("facts")}><Facts rows={rows} label={t("facts")} /></SectionCard> : null}
      {pkg.includedServices?.length ? <SectionCard id="pkg-included" title={t("includedTitle")}><BulletList items={pkg.includedServices} /></SectionCard> : null}
      {preparation.length > 0 ? <SectionCard id="pkg-prep" title={t("preparationTitle")}><BulletList items={preparation} /></SectionCard> : null}
      <Notice>{pkg.homeVisitSupported ? t("homeAvailable") : t("homeUnavailable")}</Notice>
      <ActionLinks actions={[{ href: `/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(packageId)}`, label: w("bookPackage") }, { href: addHref, label: w("addToOrderCta"), variant: "outline" }]} />
    </ConsultPage>
  );
}
