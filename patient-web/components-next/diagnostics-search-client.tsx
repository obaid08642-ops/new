"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LAB, TestList, TestRow } from "@/components-next/diagnostics/diag-parts";
import consult from "@/components-next/consult/consult.module.css";
import { formatPrice } from "@/lib/format-price";

export type SearchRow = { id: string; name: string; category?: string; price?: number };

/** The live filter of the diagnostics search (canvas/Search): one field over the tests the server sent; each result goes to the test's page. */
export function DiagnosticsSearchClient({ services, initialQuery, locale }: { services: SearchRow[]; initialQuery: string; locale: string }) {
  const t = useTranslations("DiagWeb");
  const [q, setQ] = useState(initialQuery);
  const results = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase(locale);
    return needle ? services.filter((s) => `${s.name} ${s.category ?? ""}`.toLocaleLowerCase(locale).includes(needle)) : services;
  }, [services, q, locale]);
  return (
    <>
      <label className={consult.searchField}>
        <Icon name="search" size={20} tone="secondary" />
        <span className="sr-only">{t("searchTests")}</span>
        <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchTests")} className={consult.searchInput} />
      </label>
      {results.length === 0 ? (
        <ConsultState kind="empty" icon="magnifying-glass" tone={LAB.tone} title={t("noResultsTitle")} body={t("noResultsBody")} />
      ) : (
        <TestList label={t("searchResults")}>
          {results.map((s) => (
            <TestRow
              key={s.id}
              href={`/${locale}/diagnostics/test-detail?testId=${encodeURIComponent(s.id)}`}
              title={s.name}
              note={s.category}
              price={s.price !== undefined ? formatPrice(locale, s.price).text : undefined}
            />
          ))}
        </TestList>
      )}
    </>
  );
}
