"use client";

import { useMemo, useState } from "react";
import forms from "@/components-next/consult/consult.module.css";

export type PickerCompany = { id: string; name: string };

const MAX_SHOWN = 40;
const fold = (value: string) => value.normalize("NFKC").toLocaleLowerCase();

/** The insurers matching what was typed (anywhere in the name, case and width insensitive); all of them while the box is empty. */
export function filterCompanies<T extends PickerCompany>(companies: T[], query: string): T[] {
  const needle = fold(query.trim());
  return needle ? companies.filter((company) => fold(company.name).includes(needle)) : companies;
}

/** A searchable list of the insurers from the catalogue: type to narrow it, press one to choose it (press it again to clear). */
export function CompanyPicker({ companies, value, onChange, label, searchLabel, noneLabel }: {
  companies: PickerCompany[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  searchLabel: string;
  noneLabel: string;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const matches = filterCompanies(companies, query);
    // the chosen insurer stays in view even when the typed text no longer matches it
    const chosen = companies.find((company) => company.id === value);
    return chosen && !matches.includes(chosen) ? [chosen, ...matches] : matches;
  }, [companies, query, value]);
  return (
    <div className={forms.field} role="group" aria-label={label}>
      <span className={forms.label}>{label}</span>
      <input className={forms.control} type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={searchLabel} placeholder={searchLabel} autoComplete="off" enterKeyHint="search" />
      {shown.length === 0 ? <p className={`${forms.body} ${forms.muted}`} role="status">{noneLabel}</p> : (
        <div className={forms.choices}>
          {shown.slice(0, MAX_SHOWN).map((company) => (
            <button key={company.id} type="button" className={forms.choice} aria-pressed={value === company.id} onClick={() => onChange(value === company.id ? "" : company.id)}>{company.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
