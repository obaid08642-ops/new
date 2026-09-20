import { VectorInsurance } from "@/components-next/vector-illustrations";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileCheck2 } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { InsuranceSubmitClaimForm } from "@/components-next/insurance-submit-claim-form";
import styles from "../insurance.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function InsuranceSubmitClaimPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Insurance");
  await requirePatientAccess(locale);

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/insurance`} className={styles.back}>{locale === "ar" ? "التأمين" : "Insurance"}</Link>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <p className={styles.eyebrow}><FileCheck2 size={15} aria-hidden="true" />{t("claimsEyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{locale === "ar" ? "تقديم مطالبة تأمين" : "Submit insurance claim"}</h1>
          <p>{t("claimsNotice")}</p>
        </div>
              <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(95,217,179,.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as React.CSSProperties} aria-hidden="true"><VectorInsurance size={48} aria-hidden="true" /></span>
      <span style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", display: "inline-flex", gap: 8, alignItems: "center" } as React.CSSProperties} aria-hidden="true" />
      </section>
      <InsuranceSubmitClaimForm locale={locale} />
    </main>
  );
}
