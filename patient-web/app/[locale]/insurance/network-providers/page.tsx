import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ type?: string; q?: string }> };

export default async function InsuranceNetworkProvidersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const profileRes = await callPatientApi("/users/me/profile", {}, token);
  if (profileRes.status === 401) redirect(`/${locale}/login`);
  const profile = profileRes.ok ? await profileRes.json().catch(() => null) : null;
  const insurance = (profile as { insurance?: { company_id?: string; provider?: string } } | null)?.insurance ?? null;
  const companyId = insurance?.company_id || "";
  let providers: Array<{ id: string; name: string; type?: string }> = [];
  if (companyId) {
    const qs = new URLSearchParams({ insurance_company: companyId });
    if (sp.type && sp.type !== "all") qs.set("type", sp.type);
    if (sp.q) qs.set("q", sp.q);
    const res = await callPatientApi(`/providers?${qs.toString()}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    const raw = res.ok ? await res.json().catch(() => null) : null;
    const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
    providers = (Array.isArray(list) ? list : []).map((p: unknown) => {
      const r = p as Record<string, unknown>;
      return { id: String(r.id ?? r._id ?? ""), name: String(r.name_ar ?? r.name_en ?? r.name ?? ""), type: typeof r.type === "string" ? r.type : undefined };
    }).filter((p) => p.id && p.name);
  }

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{locale === "ar" ? "مزودو شبكة التأمين" : "Insurance network providers"}</h1>
          {!companyId ? <p>{locale === "ar" ? "لا توجد وثيقة محفوظة — أضف وثيقتك أولاً." : "No saved policy — add your policy first."}</p> : null}
        </div>
      </section>
      {companyId ? (
        <>
          <form method="get" style={{ display: "flex", gap: 8 }}>
            <input name="q" defaultValue={sp.q || ""} placeholder={locale === "ar" ? "ابحث باسم المزود" : "Search providers"} />
            <button type="submit">{locale === "ar" ? "بحث" : "Search"}</button>
          </form>
          {providers.length === 0 ? <p>{t("unavailable")}</p> : (
            <ul style={{ display: "grid", gap: 8 }}>
              {providers.map((p) => (
                <li key={p.id}><strong>{p.name}</strong>{p.type ? <span> · {p.type}</span> : null}</li>
              ))}
            </ul>
          )}
        </>
      ) : <Link href={`/${locale}/insurance/add-policy`}>{locale === "ar" ? "إضافة وثيقة" : "Add policy"}</Link>}
    </main>
  );
}
