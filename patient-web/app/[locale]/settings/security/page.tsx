import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ShieldCheck, ChevronLeft } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("SecuritySettings");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/users/me/sessions", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return <main className="main" style={{ padding: "24px 16px", maxWidth: 720, margin: "0 auto", background: "#FDFDFC", minHeight: "60vh" }}>
    <Link href={`/${locale}/dashboard`} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E", textDecoration: "none", marginBottom: 16 }}><ChevronLeft size={17} />{t("back")}</Link>
    <h1 style={{ display: "flex", alignItems: "center", gap: 8, color: "#1E332E", overflowWrap: "anywhere", overflow: "hidden" } as any}><ShieldCheck size={22} /><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t("title")}</span></h1>
    {list.length === 0 ? <p style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 32, textAlign: "center", color: "#1E332E" }}>{t("empty")}</p> : (
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {list.map((item: any, i: number) => (
          <li key={String(item?.id ?? i)} style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: "16px 18px", boxShadow: "0 8px 24px rgba(30,51,46,.07)", color: "#1E332E", overflowWrap: "anywhere" }}>
            <strong>{String(item?.title ?? item?.name ?? item?.type ?? item?.id ?? "")}</strong>
            {item?.created_at ? <span style={{ display: "block", fontSize: 13, opacity: .6, marginTop: 4 }}>{String(item.created_at).slice(0, 10)}</span> : null}
          </li>
        ))}
      </ul>
    )}
  </main>;
}
