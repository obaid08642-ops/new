import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Star, ChevronLeft, MessageSquareQuote } from "lucide-react";

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
  const isAr = locale === "ar";

  return (
    <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto", minHeight: "60vh" }}>
      <Link
        href={`/${locale}/dashboard`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--brand-deep)",
          fontWeight: 750,
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <MessageSquareQuote size={28} color="var(--brand-deep)" />
        <h1 style={{ margin: 0, fontSize: "1.6rem", color: "var(--ink)" }}>{t("title")}</h1>
      </div>

      {list.length === 0 ? (
        <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 36, textAlign: "center", border: "1px dashed var(--line)", color: "var(--muted)" }}>
          <Star size={36} color="var(--muted)" style={{ margin: "0 auto 12px" }} />
          <p style={{ margin: 0 }}>{t("empty")}</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
          {list.map((r: any, i: number) => {
            const score = Math.min(Math.max(Number(r?.rating) || 0, 0), 5);
            return (
              <li
                key={String(r?.id ?? i)}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 18,
                  padding: "18px 20px",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", gap: 4, alignItems: "center" }} aria-label={`${score}/5`}>
                  {[1, 2, 3, 4, 5].map((starIdx) => (
                    <Star
                      key={starIdx}
                      size={18}
                      fill={starIdx <= score ? "#FBBF24" : "none"}
                      color={starIdx <= score ? "#F59E0B" : "rgba(22,33,58,0.2)"}
                    />
                  ))}
                </div>
                {r?.comment ? (
                  <p style={{ color: "var(--ink)", margin: "10px 0 0", lineHeight: 1.6, fontSize: "0.95rem" }}>
                    {String(r.comment)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
