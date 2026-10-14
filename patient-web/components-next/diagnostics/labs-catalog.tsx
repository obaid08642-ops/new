import { getTranslations } from "next-intl/server";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import type { Locale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { CheckField, LAB, LabCard, SearchForm, money, pickText, type Tag } from "./diag-parts";
import styles from "./diag.module.css";
import { DIAG_TONES } from "@/components-next/diagnostics/tones";

/**
 * The laboratory catalogue (canvas/ServiceHub, the tests list): a search and a "home collection" filter in the URL, one card
 * per service from the live catalogue, each going to the booking of that service. `/labs` and `/diagnostics/labs` are the same
 * list, so both pages draw it. Nothing is drawn that the catalogue did not send (no price, no sample, no flag is invented).
 */
export async function LabsCatalog({ locale, search, homeOnly, backHref }: { locale: Locale; search: string; homeOnly: boolean; backHref: string }) {
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const w = await getTranslations({ locale, namespace: "DiagWeb" });
  const response = await getPublicLabServices({ search, homeOnly });
  if (!response || !response.ok) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const services = extractLabServices(await response.json().catch(() => null));

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref}>
      <p className={styles.flowNote}>{t("subtitle")}</p>
      <SearchForm
        defaultValue={search}
        placeholder={t("searchPlaceholder")}
        label={t("searchLabel")}
        submitLabel={t("apply")}
        below={<CheckField name="home" label={t("homeOnly")} defaultChecked={homeOnly} />}
      />
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
                href={`/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(service.id)}`}
                title={pickText(locale, service.nameAr, service.nameEn) ?? ""}
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
