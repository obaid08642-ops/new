import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Star, ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ target?: string }> };

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { target = "" } = await searchParams;
  const t = await getTranslations("Reviews");
  const token = await requirePatientAccess(locale);
  const q = target && /^[A-Za-z0-9_-]{1,128}$/.test(target) ? `?target_id=${encodeURIComponent(target)}` : "";
  const res = await callPatientApi(`/patient-ux/reviews${q}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto", background: "#F5F5F7", minHeight: "60vh" }}>
    <Link href={`/${locale}/dashboard`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16213A", textDecoration: "none", marginBottom: 12 }}><ChevronLeft size={17} />{t("back")}</Link>
    <h1 style={{ display: "flex", alignItems: "center", gap: 8, color: "#16213A" }}><Star size={22} />{t("title")}</h1>
    {list.length === 0 ? <p style={{ background: "#fff", borderRadius: 22, padding: 32, textAlign: "center" }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {list.map((r: any, i: number) => (
          <li key={String(r?.id ?? i)} style={{ background: "#fff", borderRadius: 18, padding: "16px 18px", boxShadow: "0 4px 14px rgba(22,33,58,.06)" }}>
            <div style={{ color: "#FFC93C", fontSize: 18 }} aria-label={`${r?.rating ?? 0}/5`}>{"★".repeat(Math.min(Math.max(Number(r?.rating) || 0, 0), 5))}</div>
            {r?.comment ? <p style={{ color: "#16213A", margin: "6px 0 0" }}>{String(r.comment)}</p> : null}
          </li>
        ))}
      </ul>
    )}
  </main>;
}
