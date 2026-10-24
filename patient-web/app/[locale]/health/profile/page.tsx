import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseChronicDiseases } from "@/lib/api/chronic";
import { getPatientChronicDiseases } from "@/lib/api/chronic-server";
import { parseEmergencyContacts } from "@/lib/api/emergency-contacts";
import { getPatientEmergencyContacts } from "@/lib/api/emergency-contacts-server";
import { getPatientFamilyEmergencyContacts } from "@/lib/api/family-server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { getDirection, isLocale } from "@/lib/i18n";
import { PROFILE_LISTS, familyContacts, profileBasics, profileItems, profileRoot } from "@/lib/health/profile";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, RowCard, SectionCard } from "@/components-next/consult/consult-parts";
import { Facts } from "@/components-next/consult/consult-parts";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { FormSheet } from "@/components-next/health/form-sheet";
import { PartUnavailable } from "@/components-next/health/health-kit";
import { BasicsForm, ProfileList } from "@/components-next/health/profile-forms";
import { EmergencyContactsEditor } from "@/components-next/health/emergency-contacts-editor";
import styles from "@/components-next/health/health.module.css";
import forms from "@/components-next/consult/consult.module.css";
import { CORAL, TEAL, pickTab } from "@/lib/health/view";
import { HealthTabs } from "@/components-next/health/health-kit";
import { AvatarUpload } from "@/components-next/health/avatar-upload";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[] }> };
const TABS = ["basics", "conditions", "emergency"] as const;

const settled = async (call: Promise<Response>): Promise<unknown | undefined> => {
  try {
    const res = await call;
    return res.ok ? await res.json().catch(() => undefined) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The medical profile, "my medical file" (merge map, section 1): one screen, five sections one under the other with a jump bar
 * (`#basics`, `#conditions`, `#chronic`, `#emergency`, `#healthid`, so a redirect can land on one): the basics with their edit
 * sheet, the conditions and allergies lists, the chronic diseases, the emergency contacts (two lists, owner answer of 2026-10-06:
 * "my contacts" from GET /health/emergency-contacts and "my family on Nabd+" from GET /family/emergency-contacts) and the
 * health ID card. Each section says in place when its own call failed; the page needs the medical profile itself.
 */
export default async function HealthProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const tab = pickTab(query.tab, TABS, "basics");
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);

  const profileRes = await callPatientApi("/medical-profile", {}, token).catch(() => null);
  if (profileRes?.status === 401) redirect(`/${locale}/login`);
  if (profileRes?.status === 403 || profileRes?.status === 404) notFound();
  if (!profileRes?.ok) {
    return (
      <ConsultPage locale={locale} title={t("profileTitle")} backHref={`/${locale}/health`}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const root = profileRoot(await profileRes.json().catch(() => null));
  // each tab reads only its own data
  const [chronicPayload, contactsPayload, familyPayload, userPayload] = await Promise.all([
    tab === "conditions" ? settled(getPatientChronicDiseases(token)) : Promise.resolve(undefined),
    tab === "emergency" ? settled(getPatientEmergencyContacts(token)) : Promise.resolve(undefined),
    tab === "emergency" ? settled(getPatientFamilyEmergencyContacts(token)) : Promise.resolve(undefined),
    tab === "basics" ? settled(callPatientApi("/users/me/profile", {}, token)) : Promise.resolve(undefined),
  ]);
  const user = profileRoot(userPayload);
  const avatarUrl = typeof user?.avatar_url === "string" && /^https?:\/\//.test(user.avatar_url) ? user.avatar_url : undefined;
  const basics = profileBasics(root);
  const lists = Object.fromEntries(PROFILE_LISTS.map(({ list, field }) => [list, profileItems(root?.[field])]));
  const recorded = chronicPayload === undefined ? null : parseChronicDiseases(chronicPayload);
  const mine = contactsPayload === undefined ? null : parseEmergencyContacts(contactsPayload);
  const family = familyPayload === undefined ? null : familyContacts(familyPayload);
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  const base = `/${locale}/health/profile`;
  const genderLabel = basics.gender ? t(`gender.${basics.gender}`) : t("notSet");

  return (
    <ConsultPage locale={locale} title={t("profileTitle")} backHref={`/${locale}/health`}>
      <HealthTabs label={t("profileTitle")} base={base} active={tab} options={[
        { value: "basics", label: t("secBasics") },
        { value: "conditions", label: t("secConditions") },
        { value: "emergency", label: t("secEmergency") },
      ]} />

      {tab === "basics" ? (<>
      <div id="basics" className={styles.anchor}>
        <AvatarUpload name={t("photoTitle")} src={avatarUrl} />
        <SectionCard id="profile-basics" title={t("secBasics")}>
          <Facts rows={[
            { label: t("basicsBlood"), value: basics.bloodType ? <bdi>{basics.bloodType}</bdi> : t("notSet"), icon: "drop", tone: CORAL },
            { label: t("basicsHeight"), value: basics.heightCm !== undefined ? <bdi>{basics.heightCm}</bdi> : t("notSet"), icon: "user", tone: "blue" },
            { label: t("basicsWeight"), value: basics.weightKg !== undefined ? <bdi>{basics.weightKg}</bdi> : t("notSet"), icon: "scales", tone: TEAL },
            { label: t("basicsGender"), value: genderLabel, icon: "user", tone: "violet" },
          ]} />
          <FormSheet title={t("basicsEdit")} triggerLabel={t("basicsEdit")} closeLabel={t("close")} closeHref={`${base}?tab=basics`} triggerVariant="outline">
            <BasicsForm initial={basics} />
          </FormSheet>
        </SectionCard>
      </div>

      <div id="healthid" className={styles.anchor}>
        <RowCard href={`/${locale}/reports/passport`} icon="identification-card" tone="blue" title={t("secHealthId")} sub={t("healthIdSub")} caret={<Icon name={caret} size={16} tone="secondary" />} />
      </div>
      </>) : null}

      {tab === "conditions" ? (<>
      <div id="conditions" className={styles.anchor}>
        <SectionCard id="profile-conditions" title={t("secConditions")}>
          <ProfileList list="allergies" title={t("listAllergies")} initial={lists.allergies} />
          <ProfileList list="surgeries" title={t("listSurgeries")} initial={lists.surgeries} />
        </SectionCard>
      </div>

      <div id="chronic" className={styles.anchor}>
        <SectionCard id="profile-chronic" title={t("secChronic")}>
          <ProfileList list="chronic-diseases" title={t("listChronic")} initial={lists["chronic-diseases"]} />
          <ProfileList list="long-term-medications" title={t("listLongTerm")} initial={lists["long-term-medications"]} />
          <div className={forms.section}>
            <h3 className={forms.sectionTitle}>{t("listRecorded")}</h3>
            {recorded === null ? <PartUnavailable>{t("partUnavailable")}</PartUnavailable> : recorded.length === 0 ? (
              <p className={`${forms.body} ${forms.muted}`}>{t("itemsEmpty")}</p>
            ) : (
              <ul className={styles.rows} aria-label={t("listRecorded")}>
                {recorded.map((disease, index) => (
                  <li key={disease.id || `${disease.name}-${index}`}>
                    <div className={styles.row}>
                      <FIcon icon="heartbeat" tone={CORAL} size={40} />
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>{disease.name}</span>
                        <span className={styles.rowSub}>{t("recordedSource", { source: disease.source || t("sourceUnknown") })}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Notice>{t("chronicRecordedNotice")}</Notice>
          </div>
        </SectionCard>
      </div>

      </>) : null}

      {tab === "emergency" ? (
      <div id="emergency" className={styles.anchor}>
        <SectionCard id="profile-emergency" title={t("secEmergency")}>
          <div className={forms.section}>
            <h3 className={forms.sectionTitle}>{t("emergencyMine")}</h3>
            {mine === null ? <PartUnavailable>{t("partUnavailable")}</PartUnavailable> : <EmergencyContactsEditor contacts={mine} />}
          </div>
          <div className={forms.section}>
            <h3 className={forms.sectionTitle}>{t("emergencyFamily")}</h3>
            {family === null ? <PartUnavailable>{t("partUnavailable")}</PartUnavailable> : family.length === 0 ? (
              <p className={`${forms.body} ${forms.muted}`}>{t("emergencyFamilyEmpty")}</p>
            ) : (
              <ul className={styles.rows} aria-label={t("emergencyFamily")}>
                {family.map((contact) => (
                  <li key={contact.id}>
                    <div className={styles.row}>
                      <FIcon icon="users-three" tone="peach" size={40} />
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>{contact.name}</span>
                        <span className={styles.rowSub}>{contact.relation}{contact.relation && contact.maskedPhone ? " · " : ""}{contact.maskedPhone ? <bdi>{contact.maskedPhone}</bdi> : null}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Notice>{t("emergencyNotice")}</Notice>
          </div>
        </SectionCard>
      </div>
      ) : null}
    </ConsultPage>
  );
}
