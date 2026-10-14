import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks } from "@/components-next/consult/consult-parts";
import { LAB, LabCard } from "@/components-next/diagnostics/diag-parts";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ testIds?: string }> };

/** The labs that can run all the chosen tests (canvas/ServiceHub "قارن المختبرات"): one card per compatible lab from `/labs/compatible-providers`, each going to the lab. */
export default async function LabComparisonPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  const token = await requirePatientAccess(locale);
  const testIds = (sp.testIds || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  let labs: Array<{ id: string; name: string }> = [];
  let failed = false;
  if (testIds.length) {
    const upstream = await callPatientApi(`/labs/compatible-providers?testIds=${testIds.map(encodeURIComponent).join(",")}`, {}, token);
    failed = !upstream.ok;
    const data = upstream.ok ? await upstream.json().catch(() => null) : null;
    const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
    labs = (Array.isArray(list) ? list : []).map((l: unknown) => {
      const r = l as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? "");
      if (!id) return null;
      return { id, name: String(r.name_ar ?? r.name_en ?? r.name ?? id) };
    }).filter((l): l is { id: string; name: string } => l !== null);
  }
  const cart = `/${locale}/diagnostics/cart`;

  return (
    <ConsultPage locale={locale} title={t("compareTitle")} backHref={`/${locale}/diagnostics`}>
      <p className={styles.flowNote}>{t("compareSub")}</p>
      {!testIds.length ? (
        <ConsultState kind="empty" icon="arrows-left-right" tone={LAB.tone} title={t("compareNoTestsTitle")} body={t("compareNoTestsBody")} actionLabel={t("openCart")} actionHref={cart} />
      ) : failed ? (
        <ConsultState kind="error" title={t("compareErrorTitle")} body={t("compareErrorBody")} retryLabel={t("retry")} />
      ) : labs.length === 0 ? (
        <ConsultState kind="empty" icon="arrows-left-right" tone={LAB.tone} title={t("compareNoLabsTitle")} body={t("compareNoLabsBody")} actionLabel={t("openCart")} actionHref={cart} />
      ) : (
        <ul className={styles.labGrid} aria-label={t("compareTitle")}>
          {labs.map((l) => <LabCard key={l.id} href={`/${locale}/diagnostics/labs/${encodeURIComponent(l.id)}`} title={l.name} />)}
        </ul>
      )}
      <ActionLinks actions={[{ href: cart, label: t("backToCart"), variant: "outline" }]} />
    </ConsultPage>
  );
}
