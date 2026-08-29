import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };

export default async function MaternityPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const t = await getTranslations("Maternity");
  const response = await callPatientApi("/maternity/profile", {}, token);
  const raw = response.ok ? await response.json().catch(() => null) : null;
  const root = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
  const profile = root && typeof root.data === "object" && root.data !== null ? root.data as Record<string, unknown> : root;
  const hasProfile = !!profile && Object.keys(profile).length > 0;
  const week = Number(profile?.pregnancy_week ?? profile?.current_week ?? profile?.week ?? NaN);
  const dueDate = typeof profile?.due_date === "string" ? profile.due_date : typeof profile?.expected_delivery_date === "string" ? profile.expected_delivery_date : null;
  const mode = typeof profile?.mode === "string" ? profile.mode : null;
  const card = (label: string, value: string) => (
    <div key={label} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  );
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 760, margin: "0 auto" }}>
    <h1>{t("title")}</h1>
    {!response.ok ? <p role="alert">{t("error")}</p> : !hasProfile ? <p style={{ opacity: 0.7 }}>{t("empty")}</p> : (
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {Number.isFinite(week) ? card(t("week"), `${week}`) : null}
        {dueDate ? card(t("dueDate"), new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(dueDate))) : null}
        {mode ? card(t("mode"), mode) : null}
      </section>
    )}
  </main>;
}
