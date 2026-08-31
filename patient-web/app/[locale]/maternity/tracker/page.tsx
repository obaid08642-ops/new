import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Baby, ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MaternityTracker");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/maternity/profile", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto", background: "#F5F5F7", minHeight: "60vh" }}>
    <Link href={`/${locale}/dashboard`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16213A", textDecoration: "none", marginBottom: 12 }}><ChevronLeft size={17} />{t("back")}</Link>
    <h1 style={{ display: "flex", alignItems: "center", gap: 8, color: "#16213A" }}><Baby size={22} />{t("title")}</h1>
    {list.length === 0 ? <p style={{ background: "#fff", borderRadius: 22, padding: 32, textAlign: "center" }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {list.map((item: any, i: number) => (
          <li key={String(item?.id ?? i)} style={{ background: "#fff", borderRadius: 18, padding: "16px 18px", boxShadow: "0 4px 14px rgba(22,33,58,.06)", color: "#16213A" }}>
            <strong>{String(item?.title ?? item?.name ?? item?.type ?? item?.id ?? "")}</strong>
            {item?.created_at ? <span style={{ display: "block", fontSize: 13, opacity: .6, marginTop: 4 }}>{String(item.created_at).slice(0, 10)}</span> : null}
          </li>
        ))}
      </ul>
    )}
  </main>;
}
