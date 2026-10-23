import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLabCategory } from "@/lib/lab-categories";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { isLocale } from "@/lib/i18n";
import { hubMetadata } from "@/lib/seo";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import consult from "@/components-next/consult/consult.module.css";
import { LAB, PackageCard, SearchForm, money } from "@/components-next/diagnostics/diag-parts";
import styles from "@/components-next/diagnostics/diag.module.css";
import { pickTexts } from "@/lib/i18n/localized";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; category?: string }> };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HubSeo" });
  return hubMetadata(locale, "/diagnostics/packages", t("diagnostics/packages.title"), t("diagnostics/packages.description"));
}

/** The lab packages (canvas/ServiceHub, "باقات الفحوصات"): a search and a category in the URL, one package card per live package. */
export default async function LabsPackagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("LabsPackages");
  const w = await getTranslations("DiagWeb");
  const search = (query.q ?? "").trim();
  const category = (query.category ?? "").trim();
  const response = await getPublicLabServices({ search, category });
  const backHref = `/${locale}/diagnostics`;
  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const packages = extractLabServices(await response.json().catch(() => null)).filter((item) => item.isPackage !== false);
  // The codes are shown by their label in the page's language (issue 1550 walkthrough: the list showed "cardiac", "package").
  const categories = [...new Set(packages.map((item) => item.category?.trim().toLowerCase()).filter(isLabCategory))];

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
      <p className={styles.flowNote}>{t("subtitle")}</p>
      <SearchForm
        defaultValue={search}
        placeholder={t("searchPlaceholder")}
        label={t("searchLabel")}
        submitLabel={t("apply")}
        below={
          categories.length > 0 ? (
            <select className={consult.control} name="category" defaultValue={category} aria-label={t("category")}>
              <option value="">{t("allCategories")}</option>
              {categories.map((item) => <option key={item} value={item}>{t(`categoryName.${item}`)}</option>)}
            </select>
          ) : undefined
        }
      />
      {packages.length === 0 ? (
        <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("emptyTitle")} body={search || category ? t("noMatch") : t("emptyBody")} />
      ) : (
        <ul className={styles.labGrid} aria-label={t("title")}>
          {packages.map((item) => (
            <li key={item.id}>
              <PackageCard
                fluid
                href={`/${locale}/diagnostics/packages/${encodeURIComponent(item.id)}`}
                title={pickTexts(locale, item.names) ?? ""}
                sub={pickTexts(locale, item.descriptions)}
                count={item.includedServices?.length ? t("tests", { count: item.includedServices.length }) : undefined}
                price={item.price !== undefined ? money(locale, item.price) : undefined}
                was={item.oldPrice !== undefined && item.price !== undefined && item.oldPrice > item.price ? money(locale, item.oldPrice) : undefined}
                cta={w("details")}
              />
            </li>
          ))}
        </ul>
      )}
    </ConsultPage>
  );
}
