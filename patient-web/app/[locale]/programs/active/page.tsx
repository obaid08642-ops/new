import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { ProgramsActiveClient } from "@/components-next/programs-active-client";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app programs/active: live programs + session completion + milestone rewards. */
export default async function ProgramsActivePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/medical/programs/active", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = asRecord(await response.json().catch(() => null));
  const list = [payload?.data, payload?.programs].find(Array.isArray);
  const programs = (Array.isArray(list) ? list : []).flatMap((p) => {
    const o = asRecord(p);
    if (!o || typeof o.id !== "string") return [];
    const sessions = (Array.isArray(o.sessions) ? o.sessions : []).flatMap((s) => {
      const so = asRecord(s);
      if (!so) return [];
      return [{
        id: typeof so.id === "string" || typeof so.id === "number" ? so.id : "",
        title: typeof so.title === "string" ? so.title : "",
        completed: so.status === "completed",
      }];
    });
    const completedSessions = sessions.filter((s) => s.completed).length;
    const next = sessions.find((s) => !s.completed);
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    return [{
      id: o.id,
      title: str(o.title) ?? o.id,
      duration: str(o.duration),
      completedSessions,
      totalSessions: sessions.length,
      nextTitle: next?.title,
      nextDate: str(o.next_session_date),
      nextTime: str(o.next_session_time),
      milestoneReward: str(o.milestoneReward),
      rewardDesc: str(o.rewardDesc),
      sessions,
    }];
  });
  return (
    <main className="main">
      <Link href={`/${locale}/programs`}>{ar ? "البرامج" : "Programs"}</Link>
      <h1>{ar ? "البرامج العلاجية النشطة" : "Active treatment programs"}</h1>
      <p>{ar ? "تتبع التزامك بجلساتك وزياراتك." : "Track your session adherence."}</p>
      <ProgramsActiveClient initial={programs} locale={locale} />
    </main>
  );
}
