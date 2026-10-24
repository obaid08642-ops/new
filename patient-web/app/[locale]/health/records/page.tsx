import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionSummaries, isOrderablePrescriptionState, prescriptionStateKey } from "@/lib/api/prescriptions";
import { getPatientPrescriptions } from "@/lib/api/prescriptions-server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { getDirection, isLocale } from "@/lib/i18n";
import { REPORT_KINDS, TIMELINE_TYPES, extractProviderReports, extractReports, extractTimeline, type ReportKind } from "@/lib/health/records";
import { pickTab, TEAL } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { prescriptionStateTone } from "@/components-next/pharmacy/rx-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { HealthTabs, RowsCard, SectionHead } from "@/components-next/health/health-kit";
import { ShareButton } from "@/components-next/health/share-button";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[]; type?: string | string[]; kind?: string | string[] }> };
const TABS = ["reports", "prescriptions", "timeline"] as const;
const KIND_LOOK: Record<ReportKind, { icon: FillIconName; tone: ServiceTone }> = {
  lab: { icon: "test-tube", tone: "mint" },
  radiology: { icon: "scan", tone: "violet" },
  notes: { icon: "file-text", tone: TEAL },
};

/**
 * Records (merge map, section 1): three tabs on one screen, `?tab=reports|prescriptions|timeline`. Reports are the patient's
 * medical reports (GET /medical-reports/mine, each opens /reports/:id), prescriptions the patient's own (GET /prescriptions, each
 * opens /prescriptions/:id) and the timeline the health events (GET /medical-reports/timeline, filtered by `&type=`).
 */
export default async function RecordsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const rxt = await getTranslations("Prescriptions");
  const token = await requirePatientAccess(locale);
  const tab = pickTab(query.tab, TABS, "reports");
  const type = pickTab(query.type, TIMELINE_TYPES, "all");
  const kind = pickTab(query.kind, REPORT_KINDS, "all");
  const base = `/${locale}/health/records`;
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("recordsTitle")} backHref={`/${locale}/health`}>
      <HealthTabs label={t("recordsTitle")} base={base} active={tab} options={[
        { value: "reports", label: t("tabReports") },
        { value: "prescriptions", label: t("tabPrescriptions") },
        { value: "timeline", label: t("tabTimeline") },
      ]} />
      {body}
    </ConsultPage>
  );

  let response: Response;
  try {
    response = await (tab === "reports" ? callPatientApi("/medical-reports/mine", {}, token) : tab === "prescriptions" ? getPatientPrescriptions(token) : callPatientApi("/medical-reports/timeline", {}, token));
  } catch {
    response = new Response(null, { status: 503 });
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  const payload = await response.json().catch(() => null);

  if (tab === "reports") {
    const all = extractReports(payload, locale);
    // the reports other providers filed (GET /health/reports): a second section, said nothing of when it cannot load
    const providerResponse = await callPatientApi("/health/reports", {}, token).catch(() => null);
    const provider = providerResponse?.ok ? extractProviderReports(await providerResponse.json().catch(() => null)) : [];
    if (all.length === 0 && provider.length === 0) return frame(<ConsultState kind="empty" icon="file-text" title={t("tabReports")} body={t("reportsEmpty")} />);
    const reports = kind === "all" ? all : all.filter((report) => report.kind === kind);
    const kinds = (
      <LinkSegmented
        label={t("reportsFilter")}
        value={kind}
        options={REPORT_KINDS.map((value) => ({ value, label: t(`reportKind.${value}`), href: `${base}?tab=reports${value === "all" ? "" : `&kind=${value}`}` }))}
      />
    );
    return frame(
      <>
        {kinds}
        {reports.length ? (
          <RowsCard label={t("tabReports")}>
            {reports.map((report) => {
              const issued = formatDate(locale, report.issuedAt);
              const look = KIND_LOOK[report.kind];
              return (
                <li key={report.id}>
                  <Link className={`${styles.row} ${rx.rowLink}`} href={`/${locale}/reports/${encodeURIComponent(report.id)}`}>
                    <FIcon icon={look.icon} tone={look.tone} size={40} />
                    <span className={styles.rowBody}>
                      <span className={styles.rowTitle}>{report.title}</span>
                      {[report.type, issued].filter(Boolean).length ? <span className={styles.rowSub}>{[report.type, issued].filter(Boolean).join(" · ")}</span> : null}
                      {report.critical || report.unread ? (
                        <span className={styles.pills}>
                          {report.critical ? <StatusChip label={t("reportImportant")} tone="peach" /> : null}
                          {report.unread ? <StatusChip label={t("reportNew")} tone="blue" /> : null}
                        </span>
                      ) : null}
                    </span>
                    <span className={rx.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
                  </Link>
                </li>
              );
            })}
          </RowsCard>
        ) : all.length ? <p className={rx.note}>{t("reportsNoneOfKind")}</p> : null}
        {provider.length ? (
          <>
            <SectionHead id="provider-reports" title={t("reportsFromProviders")} />
            <RowsCard label={t("reportsFromProviders")}>
              {provider.map((report) => {
                const when = formatDate(locale, report.date);
                const sub = [report.type, report.doctor, report.facility, when].filter(Boolean).join(" · ");
                return (
                  <li key={report.id}>
                    <div className={styles.row}>
                      <FIcon icon="file-text" tone={TEAL} size={40} />
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>{report.title}</span>
                        {sub ? <span className={styles.rowSub}>{sub}</span> : null}
                        {report.hasAttachments ? <span className={styles.rowSub}>{t("reportAttachments")}</span> : null}
                        {report.critical ? <span className={styles.pills}><StatusChip label={t("reportAlert")} tone="amber" /></span> : null}
                      </span>
                    </div>
                  </li>
                );
              })}
            </RowsCard>
          </>
        ) : null}
      </>,
    );
  }

  if (tab === "prescriptions") {
    const prescriptions = extractPrescriptionSummaries(payload);
    const upload = `/${locale}/pharmacy/rx-order?via=photo`;
    if (prescriptions.length === 0) return frame(<ConsultState kind="empty" icon="prescription" title={rxt("emptyTitle")} body={rxt("empty")} actionLabel={rxt("uploadCta")} actionHref={upload} />);
    const list = new Intl.ListFormat(locale, { type: "conjunction", style: "narrow" });
    return frame(
      <>
        <ButtonLink href={upload} label={rxt("uploadCta")} variant="outline" size="md" />
        <RowsCard label={rxt("listLabel")}>
          {prescriptions.map((item) => {
            const issued = formatDate(locale, item.createdAt);
            return (
              <li key={item.id}>
                <Link className={`${styles.row} ${rx.rowLink}`} href={`/${locale}/prescriptions/${encodeURIComponent(item.id)}`}>
                  <FIcon icon="prescription" tone={PHARMACY_TONE} size={40} />
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{item.doctorName ? rxt("fromDoctor", { doctor: item.doctorName }) : rxt(prescriptionStateKey(item.state))}</span>
                    {item.medicationNames.length ? <span className={`${styles.rowSub} ${rx.clamp2}`}>{list.format(item.medicationNames)}</span> : null}
                    <span className={styles.rowSub}>{[rxt("medicineCount", { count: item.itemCount }), issued].filter(Boolean).join(" · ")}</span>
                    {item.doctorName ? <StatusChip label={rxt(prescriptionStateKey(item.state))} tone={prescriptionStateTone(item.state)} /> : null}
                  </span>
                  <span className={rx.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
                </Link>
                <div className={styles.rowActions}>
                  {isOrderablePrescriptionState(item.state) && item.itemCount > 0 ? <ButtonLink href={`/${locale}/cart/checkout?prescriptionId=${encodeURIComponent(item.id)}`} label={t("rxOrder")} size="sm" /> : null}
                  <ShareButton label={t("rxShare")} copiedLabel={t("shareCopied")} text={[t("rxShareTitle", { doctor: item.doctorName ?? "" }), issued, "", `${t("rxMedicines")}:`, ...(item.medicationNames.length ? item.medicationNames.map((name) => `- ${name}`) : ["—"])].filter((line) => line !== null).join("\n")} />
                </div>
              </li>
            );
          })}
        </RowsCard>
      </>,
    );
  }

  const all = extractTimeline(payload);
  const events = type === "all" ? all : all.filter((event) => event.type === type);
  const filter = (
    <LinkSegmented
      label={t("timelineFilter")}
      value={type}
      options={TIMELINE_TYPES.map((value) => ({ value, label: t(`timelineType.${value}`), href: `${base}?tab=timeline${value === "all" ? "" : `&type=${value}`}` }))}
    />
  );
  if (events.length === 0) return frame(<>{filter}<ConsultState kind="empty" icon="clock-counter-clockwise" title={t("tabTimeline")} body={t("timelineEmpty")} /></>);
  return frame(
    <>
      {filter}
      <RowsCard label={t("tabTimeline")}>
        {events.map((event) => {
          const when = formatDate(locale, event.date);
          const known = (TIMELINE_TYPES as readonly string[]).includes(event.type ?? "") && event.type !== "all";
          const kind = event.type ? (known ? t(`timelineType.${event.type as "lab"}`) : event.type) : undefined;
          return (
            <li key={event.id}>
              <div className={styles.row}>
                <FIcon icon="clock-counter-clockwise" tone="blue" size={40} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{event.title ?? kind ?? "—"}</span>
                  {[kind, event.status, when].filter(Boolean).length ? <span className={styles.rowSub}>{[kind, event.status, when].filter(Boolean).join(" · ")}</span> : null}
                </span>
              </div>
            </li>
          );
        })}
      </RowsCard>
    </>,
  );
}
