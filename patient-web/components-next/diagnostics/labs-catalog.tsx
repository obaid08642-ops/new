import { SUGGEST_SCOPES } from "@/lib/search/suggest";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import { parseDiagArt, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { CheckField, SearchForm } from "./diag-parts";
import { catalogueList } from "./catalogue-list";
import styles from "./diag.module.css";
import consult from "@/components-next/consult/consult.module.css";
import Link from "next/link";

/**
 * The laboratory catalogue (canvas/ServiceHub, the tests list): a search and a "home collection" filter in the URL. `/labs` and
 * `/diagnostics/labs` are the same list, so both pages draw it, and it is the SAME list as the hub's labs tab (CatalogueList: the
 * catalogue is the only source, every test is listed with its centres, from-price, where and insurance, and a test no lab offers yet
 * stays in the list). Nothing is drawn that the catalogue did not send.
 */
export async function LabsCatalog({ locale, search, homeOnly, backHref, basePath, cat: rawCat, more }: { locale: Locale; search: string; homeOnly: boolean; backHref: string; /** This list's own address (`/labs` or `/diagnostics/labs`), where a removed filter goes. */ basePath: string; cat?: string; more?: number }) {
  const t = await getTranslations({ locale, namespace: "LabsServices" });
  const cat = parseDiagArt(rawCat, "lab");
  const pages = Math.max(1, Math.min(more ?? 1, 10));
  // the active filters, each removable by its own link (the page is a GET form, so removing one is a link without it)
  const base = basePath;
  const href = (over: { cat?: DiagArtKey | "all"; more?: number }) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (homeOnly) params.set("home", "1");
    const nextCat = over.cat ?? cat;
    if (nextCat !== "all") params.set("cat", nextCat);
    if (over.more && over.more > 1) params.set("more", String(over.more));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const chips = [
    ...(search ? [{ key: "q", label: search, href: homeOnly ? `${base}?home=1` : base }] : []),
    ...(homeOnly ? [{ key: "home", label: t("homeOnly"), href: search ? `${base}?q=${encodeURIComponent(search)}` : base }] : []),
  ];

  const list = await catalogueList({ kind: "lab", locale, search, cat, pages, filters: { homeVisit: homeOnly }, chipHref: (next) => href({ cat: next }), moreHref: href({ more: pages + 1 }) });

  return (
    <ConsultPage locale={locale} title={t("title")} backHref={backHref} resultsHref={`/${locale}/diagnostics/bookings`}>
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
      {list}
    </ConsultPage>
  );
}
