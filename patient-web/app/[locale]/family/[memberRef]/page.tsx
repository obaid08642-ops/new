import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ClipboardList, FileText, Pill, ShieldCheck, UserRound, HeartPulse, Activity } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyMemberRecords, getPatientFamilyMembers } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { extractFamilyMembers } from "@/lib/api/family";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string; memberRef: string }> };
function list(value: unknown): any[] { return Array.isArray(value) ? value : []; }

export default async function FamilyMemberPage({ params }: Props) {
  const { locale, memberRef } = await params;
  if (!isLocale(locale) || !/^[a-f0-9]{32}$/.test(memberRef)) notFound();
  setRequestLocale(locale);

  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);

  const membersResponse = await getPatientFamilyMembers(token);
  const member = extractFamilyMembers(await membersResponse.json().catch(() => null)).find(
    (x) => familyMemberRef(x.id) === memberRef
  );
  if (!member) notFound();

  const memberId = member.id;
  const recordsResponse = await getPatientFamilyMemberRecords(token, memberId);
  if (membersResponse.status === 401 || recordsResponse.status === 401) redirect(`/${locale}/login`);
  if (recordsResponse.status === 403 || recordsResponse.status === 404) notFound();
  if (!recordsResponse.ok) notFound();

  const records: any = (await recordsResponse.json().catch(() => null)) || {};
  const t = await getTranslations("Family");
  const AR = locale === "ar" || locale === "ur";

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/family`}>
        <ChevronLeft size={16} aria-hidden="true" />
        {AR ? "العودة للعائلة" : "Back to Family"}
      </Link>

      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {AR ? "ملف عائلي مصرح" : "Authorized family profile"}
          </p>
          <h1>{member.displayName || t("member")}</h1>
          <p>{member.relation ? `${member.relation} · ` : ""}{member.role === "owner" ? t("owner") : t("memberRole")}</p>
        </div>
        <div className={styles.introVector}>
          <VectorFamily size={80} />
        </div>
      </section>

      {records.profile ? (
        <section className={styles.detail}>
          <h2>
            <UserRound size={17} aria-hidden="true" />
            {AR ? "البيانات الأساسية" : "Basic profile"}
          </h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {records.profile.gender ? <span><strong>{AR ? "الجنس:" : "Gender:"}</strong> {records.profile.gender}</span> : null}
            {records.profile.birth_date ? <span><strong>{AR ? "الميلاد:" : "Birth:"}</strong> {records.profile.birth_date}</span> : null}
            {records.profile.blood_type ? <span><strong>{AR ? "فصيلة الدم:" : "Blood type:"}</strong> {records.profile.blood_type}</span> : null}
          </div>
        </section>
      ) : null}

      <section className={styles.detail}>
        <h2>
          <Pill size={17} aria-hidden="true" />
          {AR ? "الأدوية والوصفات الطبية" : "Medications & Prescriptions"}
        </h2>
        {list(records.meds).length || list(records.prescriptions).length ? (
          <ul>
            {[...list(records.meds), ...list(records.prescriptions)].slice(0, 20).map((x: any, i: number) => (
              <li key={x.id || i}>
                <strong>{x.medicine_name_ar || x.medicine_name_en || x.doctor_name || (AR ? "وصفة علاجية" : "Prescription")}</strong>
                {x.dose ? ` · ${x.dose}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.notice}>{AR ? "لا توجد أدوية مصرح بمشاركتها حالياً." : "No shared medications available."}</p>
        )}
      </section>

      <section className={styles.detail}>
        <h2>
          <ClipboardList size={17} aria-hidden="true" />
          {AR ? "المواعيد السريرية والاستشارات" : "Appointments"}
        </h2>
        {list(records.appointments).length ? (
          <ul>
            {records.appointments.slice(0, 20).map((x: any, i: number) => (
              <li key={x.id || i}>
                <strong>{x.doctor_name || (AR ? "استشارة طبية" : "Consultation")}</strong>
                <span> · {x.scheduled_at || x.status || "—"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.notice}>{AR ? "لا توجد مواعيد مصرح بها." : "No shared appointments found."}</p>
        )}
      </section>

      <section className={styles.detail}>
        <h2>
          <FileText size={17} aria-hidden="true" />
          {AR ? "السجلات والتقارير" : "Clinical Reports"}
        </h2>
        <p className={styles.notice}>
          {records.reports
            ? (AR ? "التقارير الطبية متاحة وفق الصلاحيات الممنوحة من ولي الأمر." : "Clinical reports are accessible per authorized parental consent.")
            : (AR ? "لا توجد تقارير طبية مشاركة حالياً." : "No shared clinical reports available.")}
        </p>
      </section>
    </main>
  );
}
