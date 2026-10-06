import { VectorInsurance } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientInsuranceBenefits } from "@/lib/api/insurance-server";
import styles from "../insurance.module.css";
import { benefitRows, serviceLabel } from "@/lib/insurance-f2";

type Props = { params: Promise<{ locale: string }> };

export default async function InsuranceBenefitsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  const token = await requirePatientAccess(locale);
  const res = await getPatientInsuranceBenefits(token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const data = res.ok ? await res.json().catch(() => null) : null;
  if (!data) {
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
        <section className={styles.state} role="alert"><h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p>        <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span>
      <span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      </section>
      </main>
    );
  }
  const rows = benefitRows(data);
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{locale === "ar" ? "طلبات التأمين" : "Insurance requests"}</h1>
        </div>
      </section>
      {rows.length === 0 ? (
        <section className={styles.state}><p>{locale === "ar" ? "لا توجد طلبات تأمين بعد. عند الحجز بالتأمين يطلب مقدم الخدمة الموافقة ويظهر قراره هنا." : "No insurance requests yet. When you book with insurance, the provider requests approval and its decision appears here."}</p></section>
      ) : (
        <table style={{ inlineSize: "100%", borderCollapse: "collapse", background: "rgba(255,255,255,.82)", borderRadius: 20 }}>
          <thead>
            <tr>
              {(locale === "ar" ? ["الخدمة", "الطلبات", "موافقة", "جزئية", "مرفوضة", "قيد المراجعة", "تحمل مدفوع", "تحمل مستحق"] : ["Service", "Requests", "Approved", "Partial", "Rejected", "Pending", "Copay paid", "Copay due"]).map((h) => <th key={h} scope="col" style={{ padding: 8, textAlign: "start" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.service}>
                <th scope="row" style={{ padding: 8, textAlign: "start" }}>{serviceLabel(r.service, locale)}</th>
                <td style={{ padding: 8 }}>{r.requests}</td>
                <td style={{ padding: 8 }}>{r.approved}</td>
                <td style={{ padding: 8 }}>{r.partiallyApproved}</td>
                <td style={{ padding: 8 }}>{r.rejected}</td>
                <td style={{ padding: 8 }}>{r.pending}</td>
                <td style={{ padding: 8 }}>{r.copayPaid}</td>
                <td style={{ padding: 8 }}>{r.copayDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ margin: 0 }}>{locale === "ar" ? "نبض+ لا يعتمد المطالبات؛ القرار من مقدم الخدمة بعد موافقة شركة التأمين." : "Nabd+ does not approve claims; the decision is the provider's, after the insurer's approval."}</p>
    </main>
  );
}
