import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, FileText, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractPrescriptionDetail } from "@/lib/api/prescriptions-detail";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../prescriptions.module.css";

type Props = { params: Promise<{ locale: string; prescriptionId: string }> };

export default async function PrescriptionDetailPage({ params }: Props) {
  const { locale, prescriptionId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(prescriptionId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  const token = await requirePatientAccess(locale);

  const response = await callPatientApi(`/prescriptions/${prescriptionId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <FileText size={25} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }

  const detail = extractPrescriptionDetail(await response.json().catch(() => null));
  if (!detail) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <FileText size={25} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }

  const isRtl = locale === "ar" || locale === "ur";
  const Direction = isRtl ? ArrowRight : ArrowLeft;

  return (
    <main className={`main ${styles.page}`}>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("detailEyebrow")}
          </p>
          <h1>{t("detailTitle")}</h1>
        </div>
        <span className={styles.introIcon}>
          <FileText size={27} aria-hidden="true" />
        </span>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link className={styles.date} href={`/${locale}/prescriptions`} style={{ fontWeight: 600 }}>
          <Direction size={16} aria-hidden="true" />
          {t("back")}
        </Link>
        <Link
          href={`/${locale}/pharmacy/checkout?prescriptionId=${encodeURIComponent(detail.id)}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.2rem",
            borderRadius: "var(--radius-md)",
            background: "var(--brand)",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: "0.9rem",
          }}
        >
          <Pill size={16} aria-hidden="true" />
          {locale === "ar" ? "طلب أدوية الوصفة" : "Order Prescription Medicines"}
        </Link>
      </div>

      <div className={styles.card} style={{ gridTemplateColumns: "1fr", gap: "1.2rem", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>
              {locale === "ar" ? "معرف الوصفة" : "Prescription ID"}
            </span>
            <strong style={{ fontSize: "1.05rem", fontFamily: "monospace" }}>#{detail.id.slice(-8).toUpperCase()}</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>
              {locale === "ar" ? "الحالة" : "Status"}
            </span>
            <strong className={styles.status} style={{ color: "var(--brand-deep)" }}>
              {detail.status}
            </strong>
          </div>
          {detail.doctor.displayName && (
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>
                {locale === "ar" ? "الطبيب المعالج" : "Doctor"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Stethoscope size={15} color="var(--brand)" />
                <strong className={styles.doctor}>{detail.doctor.displayName}</strong>
                {detail.doctor.specialty && <small style={{ color: "var(--muted)" }}>({detail.doctor.specialty})</small>}
              </div>
            </div>
          )}
          {detail.issuedAt && (
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block" }}>
                {locale === "ar" ? "تاريخ الإصدار" : "Issued Date"}
              </span>
              <span className={styles.date}>
                <CalendarDays size={14} aria-hidden="true" />
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(detail.issuedAt))}
              </span>
            </div>
          )}
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "0.5rem 0" }} />

        <div>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--ink)" }}>{t("medications")}</h2>
          {detail.items.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>{t("empty")}</p>
          ) : (
            <div style={{ display: "grid", gap: "0.8rem" }}>
              {detail.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(231,247,247,0.3)",
                    border: "1px solid rgba(8,127,140,0.12)",
                  }}
                >
                  <strong style={{ fontSize: "1rem", color: "var(--brand-deep)" }}>
                    {item.name || t("unnamedMedication")}
                  </strong>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                    {item.dose && (
                      <span>
                        <strong>{t("dose")}:</strong> {item.dose}
                      </span>
                    )}
                    {item.frequency?.every_hours != null && (
                      <span>
                        <strong>{t("frequencyHours")}:</strong> {item.frequency.every_hours}
                      </span>
                    )}
                    {item.frequency?.times_per_day != null && (
                      <span>
                        <strong>{locale === "ar" ? "مرات باليوم" : "Times/Day"}:</strong> {item.frequency.times_per_day}
                      </span>
                    )}
                    {item.duration != null && (
                      <span>
                        <strong>{t("durationDays")}:</strong> {item.duration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className={styles.notice}>{t("detailNotice")}</p>
    </main>
  );
}
