"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { ProviderRow } from "@/lib/insurance/view";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { InsuranceRow, RowsList } from "./insurance-kit";
import forms from "@/components-next/consult/consult.module.css";
import styles from "./insurance.module.css";

/** The app's type chips (patient-app InsuranceHubTabs TYPE_FILTERS): the five groups of the network tab. */
export const NETWORK_FILTERS = ["all", "doctor", "hospital", "pharmacy", "lab"] as const;
export type NetworkFilter = (typeof NETWORK_FILTERS)[number];
/** GET /providers sends a type code (ProviderType); only these have a translated name, anything else shows as "Provider". */
const KNOWN_TYPES = ["doctor", "pharmacy", "hospital", "clinic", "lab", "radiology", "home_care", "nursing"] as const;
const typeKey = (type?: string) => ((KNOWN_TYPES as readonly string[]).includes(type ?? "") ? (type as (typeof KNOWN_TYPES)[number]) : null);

/** Which providers a search text and a type chip leave: the same rule as the app (name or city contains the text). */
export function filterProviders(providers: ProviderRow[], filter: NetworkFilter, query: string): ProviderRow[] {
  const needle = query.trim().toLowerCase();
  return providers.filter((provider) => (filter === "all" || provider.type === filter) && (!needle || provider.name.toLowerCase().includes(needle) || (provider.city ?? "").toLowerCase().includes(needle)));
}

/**
 * The providers of the patient's network with the app's type chips and a search that filters as you type (no reload),
 * each row with its type, up to three specialties, the city and a call button when the provider has a phone.
 */
export function NetworkList({ providers, locale }: { providers: ProviderRow[]; locale: Locale }) {
  const t = useTranslations("InsuranceWeb");
  const [filter, setFilter] = useState<NetworkFilter>("all");
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterProviders(providers, filter, query), [providers, filter, query]);
  return (
    <>
      <label className={forms.field}>
        <span className={forms.label}>{t("networkSearch")}</span>
        <input className={forms.control} type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} autoComplete="off" />
      </label>
      <div className={styles.chips} role="group" aria-label={t("tabNetwork")}>
        {NETWORK_FILTERS.map((key) => (
          <button key={key} type="button" className={styles.chip} aria-pressed={filter === key} onClick={() => setFilter(key)}>{t(`networkType.${key}`)}</button>
        ))}
      </div>
      {shown.length === 0 ? <p className={styles.note} role="status">{t("networkEmpty")}</p> : (
        <RowsList label={t("tabNetwork")}>
          {shown.map((provider) => {
            const kind = typeKey(provider.type);
            const sub = [kind ? t(`providerType.${kind}`) : t("providerType.other"), provider.specialties.join(" · "), provider.city].filter(Boolean).join(" · ");
            return (
              <InsuranceRow
                key={provider.id}
                locale={locale}
                title={provider.name}
                sub={sub}
                badge={provider.phone ? <ButtonLink href={`tel:${provider.phone}`} label={t("networkCall")} variant="outline" size="md" /> : undefined}
              />
            );
          })}
        </RowsList>
      )}
    </>
  );
}
