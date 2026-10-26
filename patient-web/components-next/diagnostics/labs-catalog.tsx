import { SUGGEST_SCOPES } from "@/lib/search/suggest";
import { getTranslations } from "next-intl/server";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import type { Locale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { CheckField, LAB, LabCard, SearchForm, money, type Tag } from "./diag-parts";
import { pickName } from "@/lib/i18n/localized";
import styles from "./diag.module.css";
import consult from "@/components-next/consult/consult.module.css";
import Link from "next/link";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";

/**
 * The laboratory catalogue (canvas/ServiceHub, the tests list): a search and a "home collection" filter in the URL, one card
 * per service from the live catalogue, each going to the booking of that service. `/labs` and `/diagnostics/labs` are the same
 * list, so both pages draw it. Nothing is drawn that the catalogue did not send (no price, no sample, no flag is invented).
 */
export async function LabsCatalog({ locale, search, homeOnly, backHref, basePath }: { locale: Locale; search: string; homeOnly: boolean; backHref: string; /** This list's own address (`/labs` or `/diagnostics/labs`), where a removed filter goes. */ basePath: string }) {
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const w = await getTranslations({ locale, namespace: "DiagWeb" });
  const response = await getPublicLabServices({ search, homeOnly });
  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref} resultsHref={`/${locale}/diagnostics/results`}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const services = extractLabServices(await response.json().catch(() => null));

  // the active filters, each removable by its own link (the page is a GET form, so removing one is a link without it)
  const base = basePath;
  const chips = [
    ...(search ? [{ key: "q", label: search, href: homeOnly ? `${base}?home=1` : base }] : []),
    ...(homeOnly ? [{ key: "home", label: t("homeOnly"), href: search ? `${base}?q=${encodeURIComponent(search)}` : base }] : []),
  ];

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref} resultsHref={`/${locale}/diagnostics/results`}>
      <p className={styles.flowNote}>{t("subtitle")}</p>
      <SearchForm
        suggest={{ locale, scope: SUGGEST_SCOPES.labs }}
        defaultValue={search}
        placeholder={t("searchPlaceholder")}
        label={t("searchLabel")}
        submitLabel={t("apply")}
        sticky
        below={<CheckField name="home" label={t("homeOnly")} defaultChecked={homeOnly} />}
      />
      {chips.length > 0 ? (
        <div className={styles.chipsRow} role="group" aria-label={t("activeFilters")}>
          {chips.map((chip) => (
            <Link key={chip.key} href={chip.href} className={styles.activeChip} aria-label={t("removeFilter", { filter: chip.label })}>
              <bdi>{chip.label}</bdi>
              <span aria-hidden="true" className={styles.activeChipX}>×</span>
            </Link>
          ))}
          <Link href={base} className={consult.activeFilterClear}>{t("clearAll")}</Link>
        </div>
      ) : null}
      {services.length === 0 ? (
        <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("emptyTitle")} body={search || homeOnly ? t("noMatch") : t("emptyBody")} />
      ) : (
        <ul className={styles.labGrid} aria-label={t("title")}>
          {services.map((service) => {
            const tags: Tag[] = [
              ...(service.homeVisitSupported ? [{ label: t("homeVisit"), tone: LAB.tone } as Tag] : []),
              ...(service.facilityVisitSupported ? [{ label: t("facilityVisit"), tone: DIAG_TONES.facility } as Tag] : []),
              ...(service.fastingRequired ? [{ label: w("tagFasting"), tone: DIAG_TONES.warn } as Tag] : []),
              ...(service.unavailable ? [{ label: t("unavailable"), tone: DIAG_TONES.quiet } as Tag] : []),
            ];
            return (
              <LabCard
                key={service.id}
                href={`/${locale}/labs/${encodeURIComponent(service.id)}?kind=lab`}
                title={pickName(locale, service.names) ?? ""}
                tags={tags}
                imageUrl={service.imageUrl}
                price={service.price !== undefined ? money(locale, service.price) : undefined}
              />
            );
          })}
        </ul>
      )}
    </ConsultPage>
  );
}
