import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractCartPrescription } from "@/lib/api/cart-prescription";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { formatNumber } from "@/lib/format-price";
import { isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { RxMedicineList } from "@/components-next/pharmacy/rx-medicines";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import rx from "@/components-next/pharmacy/rx.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RxUpload" });
  return { title: t("cartTitle") };
}

/**
 * The prescription of the cart (canvas/RxUpload family): the patient's latest active prescription from GET /cart/prescription,
 * with the way to order from it, or to upload one. Data-less parts are not drawn: no date, dose or quantity is made up.
 */
export default async function CartPrescriptionPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("RxUpload");
  const flow = await getTranslations("PharmacyFlow");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/cart/prescription", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/cart`;

  if (!response.ok) {
    return (
      <CoreShell locale={locale} title={t("cartTitle")} backHref={back} width="narrow">
        <div className={rx.state}><RetryErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={flow("retry")} /></div>
      </CoreShell>
    );
  }

  const prescription = extractCartPrescription(await response.json().catch(() => null));
  const issued = formatDate(locale, prescription?.date);
  const upload = `/${locale}/pharmacy/rx-order?via=photo`;

  return (
    <CoreShell locale={locale} title={t("cartTitle")} backHref={back} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("cartTitle")}</h1></div>
        {prescription && prescription.medications.length > 0 ? (
          <>
            <div>
              <h2 className={rx.h2}>{t("latest")}</h2>
              <p className={rx.note}>
                {[t("medicineCount", { count: prescription.medications.length }), issued ? t("issuedOn", { date: issued }) : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <RxMedicineList
              label={t("latest")}
              items={prescription.medications.map((item) => ({
                name: item.name,
                lines: [item.dose, item.quantity !== undefined ? t("quantityValue", { qty: formatNumber(locale, item.quantity) }) : undefined].filter((line): line is string => Boolean(line)),
              }))}
            />
            <div className={rx.actionsStack}>
              <ButtonLink href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(prescription.id)}`} label={t("orderFromRx")} fullWidth />
              <ButtonLink href={upload} label={t("uploadAnother")} variant="outline" fullWidth />
            </div>
          </>
        ) : (
          <div className={rx.state}>
            <LinkEmptyState icon="prescription" tone={PHARMACY_TONE} title={t("noActiveTitle")} body={t("noActiveBody")} actionLabel={t("title")} actionHref={upload} />
          </div>
        )}
      </div>
    </CoreShell>
  );
}
