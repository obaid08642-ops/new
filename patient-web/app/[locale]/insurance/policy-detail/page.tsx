import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary } from "@/lib/api/insurance";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsurancePolicyDetailPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await getPatientInsurancePolicy(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{ar ? "تعذر تحميل الوثيقة" : "Could not load policy"}</h1>
        </section>
      </main>
    );
  }
  const summary = parseInsuranceSummary(await response.json().catch(() => null));
  if (!summary || !summary.hasPolicy) {
    return (
      <main className={`main ${styles.page}`}>
        <Link href={`/${locale}/insurance`} className={styles.back}>{ar ? "التأمين" : "Insurance"}</Link>
        <h1>{ar ? "لا توجد وثيقة" : "No policy"}</h1>
        <Link href={`/${locale}/insurance/add-policy`}>{ar ? "إضافة وثيقة" : "Add policy"}</Link>
      </main>
    );
  }

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{ar ? "التأمين" : "Insurance"}</Link>
      <h1>{ar ? "تفاصيل الوثيقة" : "Policy details"}</h1>
      <dl>
        {summary.companyName ? <div><dt>{ar ? "الشركة" : "Company"}</dt><dd>{summary.companyName}</dd></div> : null}
        {summary.planClass ? <div><dt>{ar ? "الفئة" : "Class"}</dt><dd>{summary.planClass}</dd></div> : null}
        <div><dt>{ar ? "الحالة" : "Status"}</dt><dd>{ar ? "نشطة" : "Active"}</dd></div>
      </dl>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/insurance/benefits`}>{ar ? "المزايا" : "Benefits"}</Link>
        <Link href={`/${locale}/insurance/network-providers`}>{ar ? "مزودو الشبكة" : "Network providers"}</Link>
      </nav>
    </main>
  );
}
