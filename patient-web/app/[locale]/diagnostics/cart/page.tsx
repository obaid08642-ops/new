import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsCartClient } from "@/components-next/diagnostics-cart-client";
import { ConsultPage } from "@/components-next/consult/consult-page";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = { params: Promise<{ locale: string }> };

/** The tests cart (canvas/Cart): the page frame; the cart itself lives in this browser (see DiagnosticsCartClient). */
export default async function DiagnosticsCartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("DiagWeb");

  return (
    <ConsultPage locale={locale} title={t("cartTitle")} backHref={`/${locale}/diagnostics`}>
      <p className={styles.flowNote}>{t("cartSub")}</p>
      <Suspense fallback={<p className={styles.flowNote} role="status">{t("loading")}</p>}>
        <DiagnosticsCartClient locale={locale} />
      </Suspense>
    </ConsultPage>
  );
}
