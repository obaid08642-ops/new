import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorInsurance } from "@/components-next/vector-illustrations";
import { InsuranceCopayClient } from "@/components-next/insurance-copay-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ approvalCode?: string; amount?: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app copay: latest COPAY_PENDING request + NPHIES code + card intent. */
export default async function InsuranceCopayPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/insurance/requests/my", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const payload = asRecord(await response.json().catch(() => null));
  const list = [payload?.data, payload?.requests, payload?.items].find(Array.isArray);
  const arr = (Array.isArray(list) ? list : []).map(asRecord).filter((r): r is Record<string, unknown> => !!r);
  const pending = arr
    .filter((r) => r.state === "COPAY_PENDING")
    .sort((a, b) => String(b.created_at ?? b.createdAt ?? "").localeCompare(String(a.created_at ?? a.createdAt ?? "")))[0];
  if (!pending || typeof pending.id !== "string") notFound();
  const sp = await searchParams;
  const due = typeof pending.copay_amount === "number"
    ? pending.copay_amount
    : parseFloat(sp.amount || "") || 0;
  return (
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16 } as React.CSSProperties}><Link href={`/${locale}/insurance/claims`} style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as React.CSSProperties}>{ar ? "المطالبات" : "Claims"}</Link><span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span></div>
      <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{ar ? "موافقة التأمين" : "Insurance approval"}</h1>
      <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as React.CSSProperties}>{ar ? "مطلوب دفع نسبة التحمل" : "Co-pay payment required"}</p>
      <InsuranceCopayClient
        requestId={pending.id}
        dueAmount={due}
        approvalCode={(sp.approvalCode || pending.id || "").trim()}
        locale={locale}
      />
    <span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", display: "none" } as React.CSSProperties} aria-hidden="true" />
    </main>
  );
}
