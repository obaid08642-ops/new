"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Segmented } from "@/components-next/ui-generated/components/Controls";
import { Chip } from "@/components-next/ui-generated/components/Surfaces";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

export type FilterOptions = { categories: string[] };
type Sort = "smart_ranking" | "trending";

/**
 * The filters of the medicines list. Only what `GET /medicines` can apply is offered (its category and its two
 * orderings): a control the list would ignore is not drawn. The medicines page reads `category` and `sort` back.
 */
export function PharmacyFiltersClient({ options, initial, locale }: {
  options: FilterOptions;
  initial: { category: string; sort: Sort };
  locale: string;
}) {
  const t = useTranslations("PharmacyBrowse");
  const router = useRouter();
  const [category, setCategory] = useState(initial.category);
  const [sort, setSort] = useState<Sort>(initial.sort);

  function apply() {
    const q = new URLSearchParams();
    if (category !== "all") q.set("category", category);
    if (sort !== "smart_ranking") q.set("sort", sort);
    const qs = q.toString();
    router.push(`/${locale}/medicines${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className={styles.filters}>
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>{t("sortBy")}</legend>
        <Segmented
          label={t("sortBy")}
          value={sort}
          onChange={(value) => setSort(value === "trending" ? "trending" : "smart_ranking")}
          options={[
            { value: "smart_ranking", label: t("sortRelevant") },
            { value: "trending", label: t("sortTrending") },
          ]}
        />
      </fieldset>
      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>{t("categoryLabel")}</legend>
        {options.categories.length > 0 ? (
          <div className={styles.options}>
            {["all", ...options.categories].map((c) => (
              <Chip key={c} label={c === "all" ? t("all") : c} selected={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
        ) : (
          <p className={styles.note}>{t("filtersEmpty")}</p>
        )}
      </fieldset>
      <div className={styles.actions}>
        <Button label={t("apply")} size="lg" fullWidth onClick={apply} />
        <Button label={t("reset")} variant="outline" size="lg" fullWidth onClick={() => { setCategory("all"); setSort("smart_ranking"); }} />
      </div>
    </div>
  );
}
