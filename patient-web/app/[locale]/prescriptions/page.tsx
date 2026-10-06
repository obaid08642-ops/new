import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionSummaries, prescriptionStateKey } from "@/lib/api/prescriptions";
import { getPatientPrescriptions } from "@/lib/api/prescriptions-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { getDirection, isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { prescriptionStateTone } from "@/components-next/pharmacy/rx-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import rx from "@/components-next/pharmacy/rx.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Prescriptions" });
  return { title: t("title") };
}

/** The patient's prescriptions (canvas/HealthHub: a white card of rows). Each row opens its detail. */
export default async function PrescriptionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  const flow = await getTranslations("PharmacyFlow");
  const token = await requirePatientAccess(locale);
  const response = await getPatientPrescriptions(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const back = `/${locale}/health`;
  const upload = `/${locale}/pharmacy/scan-prescription`;

  if (!response.ok) {
    return (
      <CoreShell locale={locale} title={t("title")} backHref={back} width="narrow">
        <div className={rx.state}><RetryErrorState title={t("unavailableTitle")} body={t("unavailable")} retryLabel={flow("retry")} /></div>
      </CoreShell>
    );
  }

  const prescriptions = extractPrescriptionSummaries(await response.json().catch(() => null));
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  const list = new Intl.ListFormat(locale, { type: "conjunction", style: "narrow" });

  return (
    <CoreShell locale={locale} title={t("title")} backHref={back} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {prescriptions.length === 0 ? (
          <div className={rx.state}>
            <LinkEmptyState icon="prescription" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("empty")} actionLabel={t("uploadCta")} actionHref={upload} />
          </div>
        ) : (
          <>
            <ButtonLink href={upload} label={t("uploadCta")} variant="outline" size="md" />
            <section className={`${rx.card} ${rx.cardFlush}`} aria-label={t("listLabel")}>
              <ul className={rx.list}>
                {prescriptions.map((item) => {
                  const issued = formatDate(locale, item.createdAt);
                  return (
                    <li key={item.id}>
                      <Link className={`${rx.listRow} ${rx.rowLink}`} href={`/${locale}/prescriptions/${encodeURIComponent(item.id)}`}>
                        <FIcon icon="prescription" tone={PHARMACY_TONE} size={40} />
                        <span className={rx.rowBody}>
                          <span className={rx.rowTitle}>{item.doctorName ? t("fromDoctor", { doctor: item.doctorName }) : t(prescriptionStateKey(item.state))}</span>
                          {item.medicationNames.length ? <span className={`${rx.rowSub} ${rx.clamp2}`}>{list.format(item.medicationNames)}</span> : null}
                          <span className={rx.rowSub}>{[t("medicineCount", { count: item.itemCount }), issued].filter(Boolean).join(" · ")}</span>
                          {item.doctorName ? <StatusChip label={t(prescriptionStateKey(item.state))} tone={prescriptionStateTone(item.state)} /> : null}
                        </span>
                        <span className={rx.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </CoreShell>
  );
}
