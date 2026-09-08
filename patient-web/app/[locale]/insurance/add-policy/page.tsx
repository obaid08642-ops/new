import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { InsuranceAddPolicyForm } from "@/components-next/insurance-add-policy-form";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsuranceAddPolicyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/insurance/companies", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const raw = res.ok ? await res.json().catch(() => null) : null;
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;
  const companies = (Array.isArray(list) ? list : [])
    .map((c: unknown) => {
      const r = c as Record<string, unknown>;
      const id = String(r.id ?? r._id ?? r.code ?? "");
      if (!id) return null;
      const name = String(r.name_ar ?? r.name_en ?? r.name ?? r.code ?? id);
      return { id, name };
    })
    .filter((c): c is { id: string; name: string } => c !== null);

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{locale === "ar" ? "إضافة وثيقة تأمين" : "Add insurance policy"}</h1>
          <p>{locale === "ar" ? "تُحفظ الوثيقة في حسابك فقط بعد تحقق الخادم — لا نقبل أرقاماً وهمية." : "The policy is stored only after server verification."}</p>
        </div>
      </section>
      <InsuranceAddPolicyForm companies={companies} locale={locale} />
    </main>
  );
}
