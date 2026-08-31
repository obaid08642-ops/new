import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ClipboardList, FileText, Pill, ShieldCheck, UserRound } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyMemberRecords, getPatientFamilyMembers } from "@/lib/api/family-server";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { extractFamilyMembers } from "@/lib/api/family";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string; memberRef: string }> };
function list(value: unknown): any[] { return Array.isArray(value) ? value : []; }
export default async function FamilyMemberPage({ params }: Props) {
  const { locale, memberRef } = await params; if (!isLocale(locale) || !/^[a-f0-9]{32}$/.test(memberRef)) notFound(); setRequestLocale(locale);
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  const membersResponse = await getPatientFamilyMembers(token);
  const member = extractFamilyMembers(await membersResponse.json().catch(() => null)).find((x) => familyMemberRef(x.id) === memberRef);
  if (!member) notFound();
  const memberId = member.id;
  const recordsResponse = await getPatientFamilyMemberRecords(token, memberId);
  if (membersResponse.status === 401 || recordsResponse.status === 401) redirect(`/${locale}/login`);
  if (recordsResponse.status === 403 || recordsResponse.status === 404) notFound();
  if (!recordsResponse.ok) notFound();
  const records: any = await recordsResponse.json().catch(() => null) || {}; const t = await getTranslations("Family"); const AR = locale === "ar" || locale === "ur";
  return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/family`}><ChevronLeft size={16} aria-hidden="true" />{AR ? "العائلة" : "Family"}</Link>
    <section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{AR ? "ملف عائلي مصرح" : "Authorized family profile"}</p><h1>{member.displayName || t("member")}</h1><p>{member.relation || t("memberRole")}</p></div><UserRound size={28} aria-hidden="true" /></section>
    {records.profile ? <section className={styles.detail}><h2><UserRound size={17} aria-hidden="true" /> {AR ? "البيانات الأساسية" : "Basic profile"}</h2><p>{records.profile.gender || ""}{records.profile.birth_date ? ` · ${records.profile.birth_date}` : ""}{records.profile.blood_type ? ` · ${records.profile.blood_type}` : ""}</p></section> : null}
    <section className={styles.detail}><h2><Pill size={17} aria-hidden="true" /> {AR ? "الأدوية والوصفات" : "Medications & prescriptions"}</h2>{list(records.meds).length || list(records.prescriptions).length ? <ul>{[...list(records.meds), ...list(records.prescriptions)].slice(0, 20).map((x: any, i: number) => <li key={x.id || i}>{x.medicine_name_ar || x.medicine_name_en || x.doctor_name || (AR ? "وصفة" : "Prescription")} {x.dose ? `· ${x.dose}` : ""}</li>)}</ul> : <p className={styles.notice}>{AR ? "لا توجد بيانات دواء مصرح بها." : "No authorized medication data."}</p>}</section>
    <section className={styles.detail}><h2><ClipboardList size={17} aria-hidden="true" /> {AR ? "المواعيد" : "Appointments"}</h2>{list(records.appointments).length ? <ul>{records.appointments.slice(0, 20).map((x: any, i: number) => <li key={x.id || i}>{x.doctor_name || (AR ? "موعد" : "Appointment")} · {x.scheduled_at || x.status || "—"}</li>)}</ul> : <p className={styles.notice}>{AR ? "لا توجد مواعيد مصرح بها." : "No authorized appointments."}</p>}</section>
    <section className={styles.detail}><h2><FileText size={17} aria-hidden="true" /> {AR ? "التقارير" : "Reports"}</h2><p className={styles.notice}>{records.reports ? (AR ? "التقارير متاحة وفق الصلاحيات الممنوحة." : "Reports are available according to granted permissions.") : (AR ? "لا توجد تقارير مصرح بها." : "No authorized reports.")}</p></section>
  </main>;
}
