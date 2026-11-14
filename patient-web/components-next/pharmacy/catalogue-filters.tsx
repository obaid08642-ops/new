import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/format-price";
import { Button } from "@/components-next/ui-generated/components/Button";
import type { CatalogueFilters } from "@/lib/api/public-products-server";
import consult from "@/components-next/consult/consult.module.css";
import styles from "./pharmacy.module.css";

/** The query string of the filters (form, brand, rx, price range), `&`-joined and without a leading separator. */
export function filtersQuery(filters: CatalogueFilters): string {
  return Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join("&");
}

/** How many filters are on (the form, the maker, the Rx choice, and the price range counts as one). */
export function activeFilterCount(filters: CatalogueFilters): number {
  return (filters.form ? 1 : 0) + (filters.brand ? 1 : 0) + (filters.rx ? 1 : 0) + (filters.price_min || filters.price_max ? 1 : 0);
}

/**
 * issue 1819: the app's filter sheet as a panel of the catalogue (dosage form, maker, prescription or not, price range).
 * A plain GET form, so the choice is in the URL and works before the page is interactive; the search words and the sort
 * order are carried as hidden fields. The choices come from GET /medicines/filters (what the public catalogue has).
 */
export async function CatalogueFilterPanel({
  locale,
  resetHref,
  filters,
  options,
  hidden,
}: {
  locale: string;
  resetHref: string;
  filters: CatalogueFilters;
  options: { forms: string[]; brands: string[] };
  hidden: Record<string, string>;
}) {
  const t = await getTranslations({ locale, namespace: "PharmacyBrowse" });
  const count = activeFilterCount(filters);
  return (
    <details className={styles.filterPanel} open={count > 0 ? true : undefined}>
      <summary className={styles.filterSummary}>
        <span>{t("filtersTitle")}</span>
        {count > 0 ? <span className={styles.filterCount}>{formatNumber(locale, count)}</span> : null}
      </summary>
      <form method="get" className={consult.stack} aria-label={t("filtersTitle")}>
        {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        {options.forms.length > 0 ? (
          <label className={consult.field}>
            <span className={consult.label}>{t("filterForm")}</span>
            <span className={consult.searchField}>
              <select name="form" defaultValue={filters.form ?? ""} className={styles.filterControl}>
                <option value="">{t("all")}</option>
                {options.forms.map((form) => <option key={form} value={form}>{form}</option>)}
              </select>
            </span>
          </label>
        ) : null}
        <label className={consult.field}>
          <span className={consult.label}>{t("filterBrand")}</span>
          <span className={consult.searchField}>
            <input name="brand" defaultValue={filters.brand ?? ""} list="catalogue-brands" maxLength={80} autoComplete="off" className={consult.searchInput} />
            <datalist id="catalogue-brands">{options.brands.slice(0, 300).map((brand) => <option key={brand} value={brand} />)}</datalist>
          </span>
        </label>
        <label className={consult.field}>
          <span className={consult.label}>{t("filterRx")}</span>
          <span className={consult.searchField}>
            <select name="rx" defaultValue={filters.rx ?? ""} className={styles.filterControl}>
              <option value="">{t("filterRxAny")}</option>
              <option value="true">{t("filterRxOnly")}</option>
              <option value="false">{t("filterRxNone")}</option>
            </select>
          </span>
        </label>
        <div className={styles.filterPrices}>
          <label className={consult.field}>
            <span className={consult.label}>{t("filterPriceMin")}</span>
            <span className={consult.searchField}>
              <input name="price_min" type="number" inputMode="decimal" min={0} step="any" defaultValue={filters.price_min ?? ""} className={consult.searchInput} />
            </span>
          </label>
          <label className={consult.field}>
            <span className={consult.label}>{t("filterPriceMax")}</span>
            <span className={consult.searchField}>
              <input name="price_max" type="number" inputMode="decimal" min={0} step="any" defaultValue={filters.price_max ?? ""} className={consult.searchInput} />
            </span>
          </label>
        </div>
        <div className={styles.filterActions}>
          <Button type="submit" label={t("apply")} size="lg" />
          <Link className={consult.activeFilterClear} href={resetHref}>{t("reset")}</Link>
        </div>
      </form>
    </details>
  );
}
