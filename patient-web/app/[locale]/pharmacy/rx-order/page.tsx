import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionDetail, extractPrescriptionSummaries, isOrderablePrescriptionState, prescriptionStateKey } from "@/lib/api/prescriptions";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { getDirection, isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { RxOrderScreen } from "@/components-next/pharmacy/rx-order-screen";
import { prescriptionStateTone } from "@/components-next/pharmacy/rx-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import rx from "@/components-next/pharmacy/rx.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ prescriptionId?: string | string[]; id?: string | string[] }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "RxUpload" });
  return { title: t("orderTitle") };
}

/** Order the medicines of a prescription (canvas/RxUpload family): pick an active one, or open the one in the link. */
export default async function PharmacyRxOrderPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const requested = (first(query.prescriptionId) || first(query.id)).trim();
  if (!isLocale(locale) || (requested && !idPattern.test(requested))) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("RxUpload");
  const rxT = await getTranslations("Prescriptions");
  const flow = await getTranslations("PharmacyFlow");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/prescriptions`;
  const unavailable = (
    <CoreShell locale={locale} title={t("orderTitle")} backHref={back} width="narrow">
      <div className={rx.state}><RetryErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={flow("retry")} /></div>
    </CoreShell>
  );

  if (requested) {
    const response = await callPatientApi(`/prescriptions/${encodeURIComponent(requested)}`, {}, token);
    if (response.status === 401) redirect(`/${locale}/login`);
    // a prescription of someone else answers 404, the same as a missing one
    if (response.status === 403 || response.status === 404) notFound();
    if (!response.ok) return unavailable;
    const detail = extractPrescriptionDetail(await response.json().catch(() => null));
    if (!detail) return unavailable;
    return (
      <RxOrderScreen
        locale={locale}
        prescription={{ id: detail.id, state: detail.state, issuedAt: detail.issuedAt, doctorName: detail.doctorName, items: detail.items.map((item) => ({ name: item.name, dose: item.dose })) }}
      />
    );
  }

  const response = await callPatientApi("/prescriptions/active", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return unavailable;
  const active = extractPrescriptionSummaries(await response.json().catch(() => null)).filter((item) => isOrderablePrescriptionState(item.state));
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";

  return (
    <CoreShell locale={locale} title={t("orderTitle")} backHref={back} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("chooseTitle")}</h1></div>
        {active.length === 0 ? (
          <div className={rx.state}>
            <LinkEmptyState icon="prescription" tone={PHARMACY_TONE} title={t("noActiveTitle")} body={t("noActiveBody")} actionLabel={t("title")} actionHref={`/${locale}/pharmacy/scan-prescription`} />
          </div>
        ) : (
          <>
            <p className={rx.lead}>{t("chooseBody")}</p>
            <section className={`${rx.card} ${rx.cardFlush}`} aria-label={t("chooseTitle")}>
              <ul className={rx.list}>
                {active.map((item) => {
                  const issued = formatDate(locale, item.createdAt);
                  return (
                    <li key={item.id}>
                      <Link className={`${rx.listRow} ${rx.rowLink}`} href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(item.id)}`}>
                        <FIcon icon="prescription" tone={PHARMACY_TONE} size={40} />
                        <span className={rx.rowBody}>
                          <span className={rx.rowTitle}>{t("rxNumber", { code: item.id.slice(-6).toUpperCase() })}</span>
                          <span className={rx.rowSub}>{[t("medicineCount", { count: item.itemCount }), issued].filter(Boolean).join(" · ")}</span>
                          <StatusChip label={rxT(prescriptionStateKey(item.state))} tone={prescriptionStateTone(item.state)} />
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
