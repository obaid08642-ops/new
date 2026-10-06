import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractNursingVisits } from "@/lib/api/nursing-visits";
import { getPatientNursingVisits } from "@/lib/api/nursing-visits-server";
import { getDirection, isLocale } from "@/lib/i18n";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { RowCard } from "@/components-next/consult/consult-parts";
import { Caret, MetaLine, NURSING, RowList, StatusLine, nursingStatus } from "@/components-next/nursing/nursing-parts";

type Props = { params: Promise<{ locale: string }> };

/** The patient's nursing visits (canvas/Orders): a row per visit with its service, nurse, time and state; a row opens the live tracking. */
export default async function NursingVisitsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");

  let visits: ReturnType<typeof extractNursingVisits> = [];
  try {
    const { cookies } = await import("next/headers");
    const { authCookieNames } = await import("@/lib/auth/cookies");
    const token = (await cookies()).get(authCookieNames.access)?.value;
    if (token) {
      const response = await getPatientNursingVisits(token);
      if (response.ok) {
        visits = extractNursingVisits(await response.json().catch(() => null));
      }
    }
  } catch {}
  const caret = <Caret rtl={getDirection(locale) === "rtl"} />;

  return (
    <ConsultPage locale={locale} title={t("visitsTitle")} backHref={`/${locale}/home-care`}>
      {visits.length === 0 ? (
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("visitsEmpty")} actionLabel={t("browseCatalog")} actionHref={`/${locale}/nursing/catalog`} />
      ) : (
        <RowList label={t("visitsTitle")}>
          {visits.map((visit) => {
            const status = visit.status ? nursingStatus(visit.status) : null;
            return (
              <li key={visit.id}>
                <RowCard
                  href={`/${locale}/nursing/visits/${encodeURIComponent(visit.id)}`}
                  icon={NURSING.icon}
                  tone={NURSING.tone}
                  title={visit.serviceName || t("visit")}
                  sub={visit.providerName}
                  extra={
                    <>
                      {visit.scheduledAt ? <MetaLine><LocalTimeLine iso={visit.scheduledAt} locale={locale} /></MetaLine> : null}
                      {status ? <StatusLine label={t(`status.${status.key}`)} tone={status.tone} /> : null}
                    </>
                  }
                  caret={caret}
                />
              </li>
            );
          })}
        </RowList>
      )}
    </ConsultPage>
  );
}
