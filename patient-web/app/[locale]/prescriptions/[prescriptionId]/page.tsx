import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionDetail, isOrderablePrescriptionState, prescriptionStateKey } from "@/lib/api/prescriptions";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { RxMedicineList } from "@/components-next/pharmacy/rx-medicines";
import { prescriptionStateTone } from "@/components-next/pharmacy/rx-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import rx from "@/components-next/pharmacy/rx.module.css";

type Props = { params: Promise<{ locale: string; prescriptionId: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Prescriptions" });
  return { title: t("detailTitle") };
}

/**
 * One prescription of the patient (canvas/HealthHub family). It reads GET /prescriptions/:id, the patient's own bounded view:
 * status, issue date, doctor, and each medicine's name, dose, frequency and duration. The diagnosis, the notes and the photo
 * are not part of that view and are not shown. A prescription that is not the patient's answers 404, like a missing one.
 */
export default async function PrescriptionDetailPage({ params }: Props) {
  const { locale, prescriptionId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(prescriptionId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  const flow = await getTranslations("PharmacyFlow");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/prescriptions/${encodeURIComponent(prescriptionId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/prescriptions`;
  const detail = response.ok ? extractPrescriptionDetail(await response.json().catch(() => null)) : null;

  if (!detail) {
    return (
      <CoreShell locale={locale} title={t("detailTitle")} backHref={back} width="narrow">
        <div className={rx.state}><RetryErrorState title={t("detailUnavailableTitle")} body={t("unavailable")} retryLabel={flow("retry")} /></div>
      </CoreShell>
    );
  }

  const issued = formatDate(locale, detail.issuedAt);
  const orderable = isOrderablePrescriptionState(detail.state);
  const doctor = [detail.doctorName, detail.doctorSpecialty].filter(Boolean).join(" · ");

  return (
    <CoreShell locale={locale} title={t("detailTitle")} backHref={back} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("detailTitle")}</h1></div>

        <section className={rx.card} aria-label={t("detailTitle")}>
          <div className={rx.cardRow}>
            <FIcon icon="prescription" tone={PHARMACY_TONE} size={40} />
            <div className={rx.cardBody}>
              <span className={rx.cardValue}>{t(prescriptionStateKey(detail.state))}</span>
              {issued ? <span className={rx.cardLabel}>{t("issuedOn", { date: issued })}</span> : null}
            </div>
            <StatusChip label={t("medicineCount", { count: detail.items.length })} tone={prescriptionStateTone(detail.state)} />
          </div>
          {doctor ? (
            <div className={rx.cardBody}>
              <span className={rx.cardLabel}>{t("doctorLabel")}</span>
              <span className={rx.cardValue}>{doctor}</span>
            </div>
          ) : null}
        </section>

        <h2 className={rx.h2}>{t("medications")}</h2>
        {detail.items.length > 0 ? (
          <RxMedicineList
            label={t("medications")}
            items={detail.items.map((item) => ({
              name: item.name,
              lines: [
                item.dose ? t("dose", { dose: item.dose }) : undefined,
                item.everyHours !== undefined ? t("everyHours", { hours: item.everyHours }) : item.timesPerDay !== undefined ? t("timesPerDay", { count: item.timesPerDay }) : undefined,
                item.durationDays !== undefined ? t("durationDays", { days: item.durationDays }) : undefined,
              ].filter((line): line is string => Boolean(line)),
            }))}
          />
        ) : (
          <p className={rx.note}>{t("noMedicines")}</p>
        )}

        {orderable && detail.items.length > 0 ? (
          <ButtonLink href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(detail.id)}`} label={t("orderCta")} fullWidth />
        ) : null}
        {!orderable ? <p className={rx.note} role="status">{t("notOrderable")}</p> : null}
        <ButtonLink href={back} label={t("back")} variant="ghost" size="md" />
      </div>
    </CoreShell>
  );
}
