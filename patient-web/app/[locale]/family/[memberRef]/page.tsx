import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyGroup, getPatientFamilyMemberRecords, getPatientFamilyMembers } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { extractFamilyMembers } from "@/lib/api/family";
import { formatDate } from "@/lib/format-date";
import { parseGroupPermissions, parseMemberRecords } from "@/lib/family/view";
import { pickTab } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { Facts, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { MemberPermissions } from "@/components-next/family/member-permissions";
import { FormSheet } from "@/components-next/health/form-sheet";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { BookForMemberButton } from "@/components-next/family/book-for-member-button";
import { ReminderForm } from "@/components-next/health/reminder-form";
import { HealthTabs, PartUnavailable } from "@/components-next/health/health-kit";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Avatar } from "@/components-next/ui-generated/components/Surfaces";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import rx from "@/components-next/pharmacy/rx.module.css";
import health from "@/components-next/health/health.module.css";
import styles from "@/components-next/family/family.module.css";

type Props = { params: Promise<{ locale: string; memberRef: string }>; searchParams: Promise<{ tab?: string | string[]; add?: string | string[]; edit?: string | string[] }> };
const TABS = ["records", "permissions"] as const;

/**
 * One family member (merge map B): `?tab=records` is what the member shared (GET /family/member-records/:id: basic details,
 * medicines and prescriptions, appointments, reports), `?tab=permissions` is that member's grants (from GET /family/my-group)
 * with Save and "Remove from family". The route carries an opaque reference, never the account id.
 */
export default async function FamilyMemberPage({ params, searchParams }: Props) {
  const { locale, memberRef } = await params;
  const query = await searchParams;
  if (!isLocale(locale) || !/^[a-f0-9]{32}$/.test(memberRef)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("FamilyWeb");
  const rs = await getTranslations("RouteState");

  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);
  const tab = pickTab(query.tab, TABS, "records");
  const base = `/${locale}/family`;

  const membersResponse = await getPatientFamilyMembers(token);
  if (membersResponse.status === 401) redirect(`/${locale}/login`);
  const member = extractFamilyMembers(await membersResponse.json().catch(() => null)).find((x) => familyMemberRef(x.id) === memberRef);
  if (!member) notFound();

  const name = member.displayName || t("member");
  const sub = [member.role === "owner" ? t("owner") : t("memberRole"), member.relation].filter(Boolean).join(" · ");
  const frame = (body: ReactNode, age?: number | null) => (
    <ConsultPage locale={locale} title={name} backHref={base}>
      <section className={`${rx.card} ${styles.memberHero}`}>
        <Avatar name={name} size="lg" />
        <h2 className={styles.heroTitle}>{name}</h2>
        <span className={styles.heroSub}>{[sub, age != null ? t("memberAge", { n: age }) : null].filter(Boolean).join(" · ")}</span>
        <ButtonLink href={`/${locale}/family/chat`} label={t("memberChat")} variant="outline" size="md" />
      </section>
      <HealthTabs label={name} base={`${base}/${memberRef}`} active={tab} options={[
        { value: "records", label: t("tabRecords") },
        { value: "permissions", label: t("tabPermissions") },
      ]} />
      <BookForMemberButton memberRef={memberRef} label={t("bookForMember")} errorLabel={t("bookForMemberFailed")} href={`/${locale}/consultations/doctors`} />
      {body}
    </ConsultPage>
  );

  if (tab === "permissions" && member.role === "owner") {
    // the owner holds every permission: nothing to switch and never a removal (as in the app)
    return frame(<ConsultState kind="empty" icon="shield-check" title={t("ownerPermsTitle")} body={t("ownerPermsBody")} />);
  }
  if (tab === "permissions") {
    const groupResponse = await getPatientFamilyGroup(token).catch(() => null);
    if (groupResponse?.status === 401) redirect(`/${locale}/login`);
    if (!groupResponse?.ok) return frame(<PartUnavailable>{t("permsUnavailable")}</PartUnavailable>);
    const grants = parseGroupPermissions(await groupResponse.json().catch(() => null));
    return frame(<MemberPermissions memberId={member.id} granted={grants.get(member.id) ?? []} backHref={base} />);
  }

  const recordsResponse = await getPatientFamilyMemberRecords(token, member.id);
  if (recordsResponse.status === 401) redirect(`/${locale}/login`);
  if (recordsResponse.status === 403) return frame(<ConsultState kind="empty" icon="file-text" title={t("notSharedTitle")} body={t("notShared")} />);
  if (!recordsResponse.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);

  const records = parseMemberRecords(await recordsResponse.json().catch(() => null));
  const arabicFirst = locale === "ar" || locale === "ur";
  const gender = records.gender === "male" ? t("genderMale") : records.gender === "female" ? t("genderFemale") : undefined;
  const birth = formatDate(locale, records.birthDate);
  const facts: FactRow[] = [
    ...(gender ? [{ label: t("gender"), value: gender }] : []),
    ...(birth ? [{ label: t("birthDate"), value: birth }] : []),
    ...(records.bloodType ? [{ label: t("bloodType"), value: <bdi>{records.bloodType}</bdi> }] : []),
  ];
  const age = records.birthDate && !Number.isNaN(new Date(records.birthDate).getTime()) ? Math.max(0, Math.floor((Date.now() - new Date(records.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))) : null;
  const hw = await getTranslations("HealthWeb");
  const vitalRows: FactRow[] = records.vitals.map((v) => ({ label: hw(`vital.${v.type}`), value: <bdi>{[v.value, v.unit].filter(Boolean).join(" ")}</bdi> }));
  const meds = SERVICE_ICONS.pharmacy;
  const editId = Array.isArray(query.edit) ? query.edit[0] : query.edit;
  const editing = editId ? records.medicines.find((m) => m.id === editId && m.reminder) : undefined;
  const consult = SERVICE_ICONS.consult;

  return frame(
    <>
      <SectionCard id="member-vitals" title={t("vitalsTitle")}>
        {vitalRows.length ? <Facts rows={vitalRows} /> : <p className={rx.note}>{t("noVitals")}</p>}
      </SectionCard>

      {facts.length ? <SectionCard id="member-basics" title={t("basics")}><Facts rows={facts} /></SectionCard> : null}

      <SectionCard id="member-meds" title={t("medsTitle")}>
        {records.medicines.length ? (
          <ul className={health.rows}>
            {records.medicines.map((item) => {
              const title = (arabicFirst ? item.nameAr ?? item.nameEn : item.nameEn ?? item.nameAr) ?? item.doctor ?? t("prescriptionFallback");
              const lastMissed = item.reminder?.doses.find((d) => d.status === "missed");
              return (
                <li key={item.id}>
                  <div className={health.row}>
                    <FIcon icon={meds.icon} tone={meds.tone} size={40} />
                    <span className={health.rowBody}>
                      <span className={health.rowTitle}>{title}</span>
                      {item.dose ? <span className={health.rowSub}><bdi>{item.dose}</bdi></span> : null}
                      {/* journeys 68: the doses of the last seven days, and the last missed one */}
                      {item.reminder ? <span className={health.rowSub}>{t("medsWeek", { taken: item.reminder.taken7, missed: item.reminder.missed7 })}</span> : null}
                      {lastMissed ? <span className={health.rowSub} role="note">{t("medsLastMissed")} <LocalTimeLine iso={lastMissed.at} locale={locale} /></span> : null}
                    </span>
                    {item.reminder ? <ButtonLink href={`${base}/${memberRef}?edit=${encodeURIComponent(item.id)}`} label={t("medsEditReminder")} variant="ghost" size="sm" /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <p className={rx.note}>{t("medsEmpty")}</p>}
        {records.canSeeMeds ? (
          <FormSheet title={t("medsAddReminder")} triggerLabel={t("medsAddReminder")} closeLabel={t("close")} defaultOpen={query.add === "1" && !editing} closeHref={`${base}/${memberRef}`}>
            <ReminderForm forMember={{ id: member.id, name }} />
          </FormSheet>
        ) : null}
        {editing?.reminder ? (
          <FormSheet title={t("medsEditReminder")} triggerLabel={t("medsEditReminder")} closeLabel={t("close")} defaultOpen closeHref={`${base}/${memberRef}`} hideTrigger>
            <ReminderForm forMember={{ id: member.id, name }} initial={{ id: editing.id, name: editing.nameAr ?? editing.nameEn ?? "", dose: editing.dose ?? "", times: editing.reminder.times.join(", "), frequency: editing.reminder.frequency ?? "daily", chronic: editing.reminder.chronic }} />
          </FormSheet>
        ) : null}
      </SectionCard>

      <SectionCard id="member-appts" title={t("apptsTitle")}>
        {records.appointments.length ? (
          <ul className={health.rows}>
            {records.appointments.map((item) => (
              <li key={item.id}>
                <div className={health.row}>
                  <FIcon icon={consult.icon} tone={consult.tone} size={40} />
                  <span className={health.rowBody}>
                    <span className={health.rowTitle}>{item.doctor ?? t("apptFallback")}</span>
                    {item.at ? <LocalTimeLine iso={item.at} locale={locale} className={health.rowSub} /> : null}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className={rx.note}>{t("apptsEmpty")}</p>}
      </SectionCard>

      <SectionCard id="member-reports" title={t("reportsTitle")}>
        <p className={rx.note}>{records.hasReports ? t("reportsShared") : t("reportsNone")}</p>
      </SectionCard>
    </>,
    age,
  );
}
