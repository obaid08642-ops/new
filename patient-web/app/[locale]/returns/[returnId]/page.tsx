import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string; returnId: string }> };

export default async function ReturnDetailPage({ params }: Props) {
  const { locale, returnId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9_-]{1,128}$/.test(returnId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Returns");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/pharmacy/returns/${encodeURIComponent(returnId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main"><p role="alert">{t("error")}</p></main>;
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const item = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown> | null;
  if (!item || typeof item !== "object") notFound();
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);

  return (
    <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
      <Link href={`/${locale}/returns`}>{locale === "ar" ? "الإرجاع" : "Returns"}</Link>
      <h1>{str(item.reason) || String(item.id || returnId)}</h1>
      <dl>
        {str(item.status) ? <div><dt>{locale === "ar" ? "الحالة" : "Status"}</dt><dd>{str(item.status)}</dd></div> : null}
        {num(item.amount) !== undefined ? <div><dt>{locale === "ar" ? "المبلغ" : "Amount"}</dt><dd>{num(item.amount)?.toFixed(2)} {t("sar")}</dd></div> : null}
        {str(item.createdAt) || str(item.created_at) ? (
          <div><dt>{locale === "ar" ? "التاريخ" : "Date"}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(String(item.createdAt || item.created_at)))}</dd></div>
        ) : null}
        {str(item.details) || str(item.notes) ? <div><dt>{locale === "ar" ? "التفاصيل" : "Details"}</dt><dd>{str(item.details) || str(item.notes)}</dd></div> : null}
      </dl>
    </main>
  );
}
