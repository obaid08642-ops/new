import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import type { InsuranceTab } from "@/lib/insurance/view";

type Query = Record<string, string | string[] | undefined>;

/** The query of the old URL, kept on the new one (a repeated key is kept as it came). */
function carry(query: Query, skip: string[] = []): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (skip.includes(key)) continue;
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) out.append(key, item);
  }
  return out;
}

/** An old insurance page that is now a tab of the hub (merge map 2, section 6): `/insurance?tab=<tab>` with the old query. */
export async function redirectToInsuranceTab(params: Promise<{ locale: string }>, searchParams: Promise<Query>, tab: InsuranceTab): Promise<never> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const qs = carry(await searchParams, ["tab"]);
  redirect(`/${locale}/insurance?${new URLSearchParams([["tab", tab], ...qs]).toString()}`);
}

/** An old insurance page that is now the page of one request: `/insurance/requests/<id>`; the old amount in the URL is not carried (the server's amount is shown). */
export function insuranceRequestHref(locale: string, requestId: string): string {
  return `/${locale}/insurance/requests/${requestId}`;
}
