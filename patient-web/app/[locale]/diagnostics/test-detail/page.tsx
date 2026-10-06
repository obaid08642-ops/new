import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { LAB, money } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ testId?: string; id?: string }> };

/** A test from the live `/labs/services` list (canvas/ServiceHub): the tile, the name, the category and the price the catalogue has, then booking or adding it to the order. */
export default async function DiagnosticsTestDetailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const testId = (sp.testId || sp.id || "").trim();
  if (!isLocale(locale) || !testId) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/labs/services", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = await response.json().catch(() => null);
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const list = Array.isArray(payload) ? payload : [root.data, root.items, root.services, root.results].find(Array.isArray);
  const match = Array.isArray(list) ? list.find((item) => {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    return o._id === testId || o.id === testId;
  }) as Record<string, unknown> | undefined : undefined;
  if (!match) notFound();
  const rtl = locale === "ar" || locale === "ur";
  const name = rtl
    ? (typeof match.name_ar === "string" && match.name_ar) || (typeof match.name === "string" ? match.name : "")
    : (typeof match.name === "string" && match.name) || (typeof match.name_ar === "string" ? match.name_ar : "");
  const rawPrice = match.price ?? match.base_price;
  const price = typeof rawPrice === "number" && Number.isFinite(rawPrice) ? rawPrice : undefined;
  const category = typeof (rtl ? match.category_ar : match.category) === "string"
    ? (rtl ? match.category_ar : match.category) as string : undefined;
  const rows: FactRow[] = price !== undefined ? [{ label: t("factPrice"), value: <bdi>{money(locale, price)}</bdi>, icon: "tag", tone: LAB.tone }] : [];
  const addHref = `/${locale}/diagnostics/cart?add=${encodeURIComponent(testId)}&name=${encodeURIComponent(name)}${price !== undefined ? `&price=${price}` : ""}`;

  return (
    <ConsultPage locale={locale} title={name || t("testTitle")} backHref={`/${locale}/diagnostics/search`}>
      <Hero icon={LAB.icon} tone={LAB.tone} title={name} sub={category} />
      {rows.length > 0 ? <SectionCard id="test-facts" title={t("testFacts")}><Facts rows={rows} label={t("testFacts")} /></SectionCard> : null}
      <ActionLinks actions={[{ href: `/${locale}/diagnostics/labs/book?serviceId=${encodeURIComponent(testId)}`, label: t("bookTest") }, { href: addHref, label: t("addToOrderCta"), variant: "outline" }]} />
    </ConsultPage>
  );
}
