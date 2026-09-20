import { VectorLoyalty } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app loyalty/leaderboard: top-50 rows, masked names, podium for top 3. */
export default async function LoyaltyLeaderboardPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/loyalty/leaderboard?limit=50", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = asRecord(await response.json().catch(() => null));
  const list = [payload?.data, payload?.rows, payload?.leaders].find(Array.isArray);
  const rows = (Array.isArray(list) ? list : []).slice(0, 50).map((r, i) => {
    const o = asRecord(r) ?? {};
    const uid = typeof o.user_id === "string" ? o.user_id : "";
    return {
      rank: i + 1,
      name: `${ar ? "مستخدم نبض" : "Nabd user"} ${uid.slice(0, 4)}****`,
      pts: Number(o.lifetime_points ?? 0) || 0,
      tier: typeof o.tier === "string" ? o.tier : "",
    };
  });
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" } as React.CSSProperties}><div style={{ minWidth: 0 }}><Link href={`/${locale}/loyalty`} style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as React.CSSProperties}>{ar ? "الولاء" : "Loyalty"}</Link><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "لوحة المتصدرين" : "Leaderboard"}</h1></div><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorLoyalty size={48} aria-hidden="true" /></span><span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      </section>
      {rows.length === 0 ? (
        <p role="status">{ar ? "لا توجد بيانات متصدرين بعد — اجمع النقاط لتظهر هنا" : "No leaderboard data yet — earn points to appear here"}</p>
      ) : (
        <>
          {top3.length >= 3 ? (
            <section aria-label={ar ? "المراكز الثلاثة" : "Top three"}>
              <ol>
                {top3.map((r) => (
                  <li key={r.rank}>#{r.rank} {r.name.split(" ")[0]} — {(r.pts / 1000).toFixed(1)}k</li>
                ))}
              </ol>
            </section>
          ) : null}
          <ol>
            {rest.map((r) => (
              <li key={r.rank}>#{r.rank} {r.name} — {r.pts.toLocaleString(locale)} {r.tier ? `(${r.tier})` : ""}</li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
