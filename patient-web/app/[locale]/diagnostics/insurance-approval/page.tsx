import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import { DiagnosticsInsuranceApprovalClient } from "@/components-next/diagnostics-insurance-approval-client";
import styles from "../diagnostics.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; id?: string; labName?: string; visitType?: string }>;
};
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app diagnostics/insurance-approval: live polling + hybrid cash opt-in + totals. Backend callPatientApi via client, no mock. */
export default async function DiagnosticsInsuranceApprovalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.intro} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20 }}>
        <div className={styles.introText} style={{ display: "grid", gap: 8 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E" }}>{ar ? "التشخيص" : "Diagnostics"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
            {ar ? "حالة الموافقة" : "Approval status"}
          </h1>
          <p style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
            {ar ? "متابعة حية لحالة الموافقة — بيانات الخادم فقط." : "Live approval status — server data only."}
          </p>
          <Link href={`/${locale}/diagnostics/bookings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", width: "fit-content", padding: "8px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", marginTop: 8 }}>
            {ar ? "حجوزاتي" : "My bookings"}
          </Link>
        </div>
        <span className={styles.introIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)" }} aria-hidden="true">
          <VectorHealthShield size={48} aria-hidden="true" />
        </span>
      </section>

      <section style={{ display: "grid", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <DiagnosticsInsuranceApprovalClient
          orderId={orderId}
          labName={(sp.labName || "").trim() || (ar ? "المختبر المختار" : "Selected lab")}
          visitType={(sp.visitType || "clinic").trim()}
          locale={locale}
        />
      </section>
    </main>
  );
}
