import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsCheckoutForm } from "@/components-next/diagnostics-checkout-form";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LAB } from "@/components-next/diagnostics/diag-parts";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ items?: string; labId?: string; location?: string }> };

/** The checkout of the tests order (canvas/CheckoutV2): the page frame and what is being ordered; the form and its payment flow are DiagnosticsCheckoutForm. */
export default async function DiagnosticsCheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("DiagWeb");
  const items = (sp.items || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const labId = (sp.labId || "").trim();
  const location = sp.location === "facility" ? "facility" : "home";
  const cart = `/${locale}/diagnostics/cart`;

  if (!items.length || !labId) {
    return (
      <ConsultPage locale={locale} title={t("checkoutTitle")} backHref={cart}>
        <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("checkoutEmptyTitle")} body={t("checkoutEmptyBody")} actionLabel={t("openCart")} actionHref={cart} />
      </ConsultPage>
    );
  }

  return (
    <ConsultPage locale={locale} title={t("checkoutTitle")} backHref={cart}>
      <p className={styles.flowNote}>{t("checkoutSummary", { count: items.length, place: location === "home" ? t("placeHomeLab") : t("placeLab") })}</p>
      <DiagnosticsCheckoutForm locale={locale} items={items} labId={labId} initialLocation={location} />
    </ConsultPage>
  );
}
