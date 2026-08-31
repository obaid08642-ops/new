import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, ShieldCheck } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPatientFamilyCalendar } from "@/lib/api/family-server";

type Props = { params: Promise<{ locale: string }> };
export default async function FamilyCalendarPage({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  const response = await getPatientFamilyCalendar(token); if (response.status === 401) redirect(`/${locale}/login`);
  const data = response.ok ? await response.json().catch(() => []) : [];
  const events = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []); const AR = locale === "ar" || locale === "ur"; const t = await getTranslations("Family");
  return <main className="main"><Link href={`/${locale}/family`}><ChevronLeft size={16} aria-hidden="true" />{AR ? "العائلة" : "Family"}</Link><section className="hero premium-hero"><div className="premium-hero-copy"><div className="eyebrow"><ShieldCheck size={14} aria-hidden="true" />{AR ? "تقويم العائلة" : "Family calendar"}</div><h1>{AR ? "مواعيد وأساليب رعاية مشتركة" : "Shared care calendar"}</h1><p>{AR ? "الأحداث المعروضة تأتي من تقويم المجموعة المصرح به." : "Events are loaded from the authorized family group calendar."}</p></div><CalendarDays size={28} aria-hidden="true" /></section>{events.length ? <ol style={{ display: "grid", gap: 12, paddingInlineStart: "1.4rem" }}>{events.map((event: any, index: number) => <li key={event.id || index}><strong>{event.title || (AR ? "حدث عائلي" : "Family event")}</strong><div>{event.event_date ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.event_date)) : "—"}{event.member_name ? ` · ${event.member_name}` : ""}</div></li>)}</ol> : <section className="state"><CalendarDays size={26} aria-hidden="true" /><p>{t("empty")}</p></section>}</main>;
}
