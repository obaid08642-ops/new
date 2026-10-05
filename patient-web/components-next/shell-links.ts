import type { Locale } from "@/lib/i18n";

/**
 * The four section links of the web top bar and the phone tab bar, one source for HomeShell and CoreShell so a section
 * opens the same page from every screen. Pharmacy and Nursing/Labs go to the pages the Home board's tiles open.
 */
export type ShellSection = "pharmacy" | "consult" | "labs" | "nursing";

export function shellSectionHrefs(locale: Locale): Record<ShellSection, string> {
  const base = `/${locale}`;
  return {
    pharmacy: `${base}/c`,
    consult: `${base}/consultations/doctors`,
    labs: `${base}/diagnostics`,
    nursing: `${base}/nursing/catalog`,
  };
}
