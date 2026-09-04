import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, ShieldCheck, Clock, UserRound } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyCalendar } from "@/lib/api/family-server";
import { VectorFamily } from "@/components-next/vector-illustrations";
import styles from "../family.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function FamilyCalendarPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);
  const response = await getPatientFamilyCalendar(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  const data = response.ok ? await response.json().catch(() => []) : [];
  const events = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
  const AR = locale === "ar" || locale === "ur";
  const t = await getTranslations("Family");

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
            {AR ? "تقويم العائلة المشترك" : "Shared Care Calendar"}
          </p>
          <h1>{AR ? "مواعيد وأنشطة الرعاية" : "Family Health Events"}</h1>
          <p>
            {AR
              ? "مزامنة موحدة لمواعيد أفراد الأسرة، الأدوية المجدولة، والمتابعات الدورية."
              : "Synchronized care schedules, checkups, and routine clinical visits for all members."}
          </p>
        </div>
        <div className={styles.introVector}>
          <VectorFamily size={80} />
        </div>
      </section>

      {events.length > 0 ? (
        <section className={styles.detail}>
          <h2>
            <CalendarDays size={18} aria-hidden="true" />
            {AR ? "الأحداث المجدولة" : "Scheduled Events"} ({events.length})
          </h2>
          <ul>
            {events.map((event: any, index: number) => (
              <li key={event.id || index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.95rem" }}>
                    {event.title || (AR ? "موعد رعاية عائلية" : "Family Care Event")}
                  </strong>
                  {event.member_name ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "#BE185D", fontSize: "0.82rem", fontWeight: 650 }}>
                      <UserRound size={13} aria-hidden="true" />
                      {event.member_name}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--muted)", fontSize: "0.82rem" }}>
                  <Clock size={13} aria-hidden="true" />
                  {event.event_date
                    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.event_date))
                    : "—"}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className={styles.state}>
          <CalendarDays size={32} aria-hidden="true" />
          <h1>{AR ? "لا توجد أحداث مجدولة" : "No Scheduled Events"}</h1>
          <p>
            {AR
              ? "لا توجد مواعيد أو أنشطة مسجلة حالياً في تقويم المجموعة العائلية."
              : "No upcoming visits or family health activities currently registered."}
          </p>
        </section>
      )}
    </main>
  );
}
