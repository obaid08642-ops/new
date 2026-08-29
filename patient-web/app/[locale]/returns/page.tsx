import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

type ReturnRequest = { id: string; status: string; amount?: number; reason?: string; createdAt?: string };

function extractReturns(payload: unknown): ReturnRequest[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const values = Array.isArray(payload) ? payload : [root?.data, root?.returns, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const r = value && typeof value === "object" ? value as Record<string, unknown> : null;
    if (!r || !r.id) return [];
    return [{
      id: String(r.id),
      status: String(r.status ?? r.state ?? "pending"),
      amount: Number(r.refund_amount ?? r.amount ?? NaN) || undefined,
      reason: typeof r.reason === "string" ? r.reason : undefined,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : undefined,
    }];
  });
}

export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Returns");
  const response = await callPatientApi("/pharmacy/returns", {}, token);
  const returns = response.ok ? extractReturns(await response.json().catch(() => null)) : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    {!response.ok ? <p role="alert">{t("error")}</p> : returns.length === 0 ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {returns.map((item) => (
          <li key={item.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <strong>{item.reason || item.id}</strong>
              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>
                {[item.createdAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.createdAt)) : null,
                  item.amount !== undefined ? `${item.amount.toFixed(2)} ${t("sar")}` : null].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span style={{ fontSize: 13, opacity: 0.75, whiteSpace: "nowrap" }}>{item.status}</span>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
