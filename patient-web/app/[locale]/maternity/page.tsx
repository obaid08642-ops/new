import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { formatDate } from "@/lib/format-date";
import { getDirection, isLocale } from "@/lib/i18n";
import { pickTab } from "@/lib/health/view";
import { cycleWindow, parseMaternity, trimesterOf, type MaternityView } from "@/lib/maternity/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { CareHero, RecordRow } from "@/components-next/care/care-kit";
import { HealthTabs, RowsCard, SectionHead } from "@/components-next/health/health-kit";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[] }> };
const TABS = ["pregnancy", "baby", "ovulation"] as const;
const MATERNITY = SERVICE_ICONS.maternity;

/**
 * Maternity (canvas/CareHub; merge map 2 section 8): one screen with three tabs, `?tab=pregnancy|baby|ovulation`, absorbing the
 * old tracker, baby-growth and ovulation pages. All three read the one GET /maternity/profile. Pregnancy shows the week ring, the
 * trimester, the due date and the logged kicks and contractions; Baby growth the growth entries; Ovulation the estimate computed
 * from the last period and the cycle length (always labelled an estimate). The weekly articles and the fetal-week image of the
 * board are not drawn: GET /maternity/content returns no content yet and the images belong on the CDN (Needs review).
 */
export default async function MaternityPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MaternityWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const base = `/${locale}/maternity`;
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";

  const frame = (body: ReactNode, tab?: (typeof TABS)[number]) => (
    <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/dashboard`}>
      {tab ? (
        <HealthTabs label={t("tabsLabel")} base={base} active={tab} options={[
          { value: "pregnancy", label: t("tabPregnancy") },
          { value: "baby", label: t("tabBaby") },
          { value: "ovulation", label: t("tabOvulation") },
        ]} />
      ) : null}
      {body}
    </ConsultPage>
  );

  let response: Response;
  try {
    response = await callPatientApi("/maternity/profile", {}, token);
  } catch {
    return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const profile = parseMaternity(await response.json().catch(() => null));
  if (!profile.ready) {
    return frame(<ConsultState kind="empty" icon={MATERNITY.icon} tone={MATERNITY.tone} title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("setupAction")} actionHref={`${base}/maternity-setup`} />);
  }

  const tab = pickTab(query.tab, TABS, profile.pregnant ? "pregnancy" : "ovulation");
  const number = new Intl.NumberFormat(locale);
  const date = (value: string | null) => formatDate(locale, value);

  return frame(
    <>
      <div className={styles.toolbar}>
        <span />
        <ButtonLink href={`${base}/maternity-setup`} label={t("updateProfile")} size="md" variant="outline" />
      </div>
      {tab === "pregnancy" ? <PregnancyTab t={t} profile={profile} number={number} date={date} /> : null}
      {tab === "baby" ? <BabyTab t={t} profile={profile} number={number} date={date} /> : null}
      {tab === "ovulation" ? <OvulationTab t={t} profile={profile} locale={locale} /> : null}
      <RowCard href={`/${locale}/consultations/doctors?specialty=gynecology`} icon="stethoscope" tone="blue" title={t("consultTitle")} sub={t("consultSub")} caret={<Icon name={caret} size={16} tone="secondary" />} />
      <RowCard href={`/${locale}/diagnostics/radiology`} icon="scan" tone="violet" title={t("scansTitle")} sub={t("scansSub")} caret={<Icon name={caret} size={16} tone="secondary" />} />
      <Notice warn>{t("notice")}</Notice>
    </>,
    tab,
  );
}

type Tr = Awaited<ReturnType<typeof getTranslations>>;
type TabProps = { t: Tr; profile: MaternityView; number: Intl.NumberFormat; date: (value: string | null) => string | null };

function PregnancyTab({ t, profile, number, date }: TabProps) {
  if (!profile.pregnant) {
    return <ConsultState kind="empty" icon={MATERNITY.icon} tone={MATERNITY.tone} title={t("notPregnantTitle")} body={t("notPregnantBody")} />;
  }
  const due = date(profile.dueDate);
  return (
    <>
      {profile.week !== null ? (
        <CareHero
          tone={MATERNITY.tone}
          icon={MATERNITY.icon}
          label={t("tabPregnancy")}
          ring={{ value: Math.min(profile.week, 40) / 40, label: t("ringLabel", { week: number.format(profile.week) }), valueText: number.format(profile.week), caption: t("weekUnit") }}
          title={t(`trimester${trimesterOf(profile.week)}`)}
          lines={due ? [t("dueOn", { date: due })] : []}
        />
      ) : due ? (
        <CareHero tone={MATERNITY.tone} icon={MATERNITY.icon} label={t("tabPregnancy")} title={t("tabPregnancy")} lines={[t("dueOn", { date: due })]} />
      ) : null}
      {profile.kicks.length ? (
        <>
          <SectionHead id="kicks" title={t("kicksTitle")} />
          <RowsCard label={t("kicksTitle")}>
            {profile.kicks.map((kick) => (
              <li key={kick.id}>
                <RecordRow icon="baby" tone="pink" title={t("kickCount", { count: kick.count })} sub={[kick.durationSeconds !== null ? t("seconds", { value: number.format(kick.durationSeconds) }) : null, date(kick.date)].filter((line): line is string => line !== null)} />
              </li>
            ))}
          </RowsCard>
        </>
      ) : null}
      {profile.contractions.length ? (
        <>
          <SectionHead id="contractions" title={t("contractionsTitle")} />
          <RowsCard label={t("contractionsTitle")}>
            {profile.contractions.map((item) => (
              <li key={item.id}>
                <RecordRow
                  icon="heartbeat"
                  tone={SERVICE_ICONS.health.tone}
                  title={t("contractionRow")}
                  sub={[
                    item.intervalSeconds !== null ? t("interval", { value: number.format(item.intervalSeconds) }) : null,
                    item.durationSeconds !== null ? t("duration", { value: number.format(item.durationSeconds) }) : null,
                    date(item.date),
                  ].filter((line): line is string => line !== null)}
                />
              </li>
            ))}
          </RowsCard>
        </>
      ) : null}
      {profile.kicks.length === 0 && profile.contractions.length === 0 ? <p className={rx.note} role="status">{t("logsEmpty")}</p> : null}
    </>
  );
}

function BabyTab({ t, profile, number, date }: TabProps) {
  if (profile.growth.length === 0) {
    return <ConsultState kind="empty" icon="chart-line-up" tone="mint" title={t("growthTitle")} body={t("growthEmpty")} />;
  }
  return (
    <>
      <SectionHead id="growth" title={t("growthTitle")} />
      <RowsCard label={t("growthTitle")}>
        {profile.growth.map((entry) => (
          <li key={entry.id}>
            <RecordRow
              icon="chart-line-up"
              tone="mint"
              title={t("monthN", { month: number.format(entry.month) })}
              sub={[
                entry.weightKg !== null ? t("weightKg", { value: number.format(entry.weightKg) }) : null,
                entry.heightCm !== null ? t("heightCm", { value: number.format(entry.heightCm) }) : null,
                entry.headCm !== null ? t("headCm", { value: number.format(entry.headCm) }) : null,
                date(entry.date),
              ].filter((line): line is string => line !== null)}
            />
          </li>
        ))}
      </RowsCard>
    </>
  );
}

function OvulationTab({ t, profile, locale }: { t: Tr; profile: MaternityView; locale: string }) {
  const window = !profile.pregnant && profile.lastPeriod && profile.cycleLength ? cycleWindow(profile.lastPeriod, profile.cycleLength) : null;
  if (!window) {
    return <ConsultState kind="empty" icon="calendar-dots" tone="violet" title={t("cycleTitle")} body={profile.pregnant ? t("cyclePregnant") : t("cycleEmpty")} actionLabel={t("updateProfile")} actionHref={`/${locale}/maternity/maternity-setup`} />;
  }
  const day = (value: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(value);
  return (
    <>
      <CareHero
        tone="violet"
        icon="calendar-dots"
        label={t("cycleTitle")}
        title={t("cycleTitle")}
        lines={[profile.regular === null ? null : profile.regular ? t("regular") : t("irregular")].filter((line): line is string => line !== null)}
        badge={t("estimate")}
      />
      <RowsCard label={t("cycleTitle")}>
        <li><RecordRow icon="calendar-dots" tone="violet" title={t("ovulationDay")} end={<bdi>{day(window.ovulation)}</bdi>} /></li>
        <li><RecordRow icon="heart" tone="pink" title={t("fertileWindow")} end={<bdi>{`${day(window.start)} - ${day(window.end)}`}</bdi>} /></li>
        <li><RecordRow icon="drop" tone={SERVICE_ICONS.health.tone} title={t("nextPeriod")} end={<bdi>{day(window.next)}</bdi>} /></li>
      </RowsCard>
      <Notice>{t("estimateNotice")}</Notice>
    </>
  );
}
