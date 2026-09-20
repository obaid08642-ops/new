import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { extractHomeCareService } from "@/lib/api/home-care-services";
import { getPatientHomeCareService } from "@/lib/api/home-care-services-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "../services.module.css";

type Props = { params: Promise<{ locale: string; serviceId: string }> };
export default async function HomeCareServicePage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HomeCareServices");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareService(serviceId, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16, display: "grid", placeItems: "center" } as any}>
        <section
          className={styles.state}
          role="alert"
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorNursing size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailableBody")}</p>
          <Link
            href={`/${locale}/home-care/services`}
            className={styles.action}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 700,
              textDecoration: "none",
              overflowWrap: "anywhere",
            } as any}
          >
            {t("back")}
          </Link>
        </section>
      </main>
    );
  const service = extractHomeCareService(await response.json().catch(() => null));
  if (!service) notFound();
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const name = rtl ? (service.nameAr ?? service.nameEn) : (service.nameEn ?? service.nameAr);
  const description = rtl ? (service.descriptionAr ?? service.descriptionEn) : (service.descriptionEn ?? service.descriptionAr);
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link
        href={`/${locale}/home-care/services`}
        className={styles.back}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#5FD9B3",
          color: "#1E332E",
          fontWeight: 700,
          textDecoration: "none",
          width: "fit-content",
          overflowWrap: "anywhere",
        } as any}
      >
        <Arrow size={16} aria-hidden="true" />
        {t("back")}
      </Link>
      <article
        className={styles.detail}
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", overflowWrap: "anywhere", fontWeight: 700 } as any}>
            {t("eyebrow")}
          </p>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "rgba(95,217,179,.12)",
              border: "1px solid #E8EDEE",
              flex: "0 0 auto",
            } as any}
          >
            <VectorNursing size={48} aria-hidden="true" />
          </span>
        </div>
        <h1
          style={{
            color: "#1E332E",
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2 as any,
            WebkitBoxOrient: "vertical" as any,
            overflow: "hidden",
          } as any}
        >
          {name}
        </h1>
        {description ? (
          <p
            className={styles.description}
            style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}
          >
            {description}
          </p>
        ) : null}
        <div className={styles.facts} style={{ display: "flex", gap: 16, flexWrap: "wrap" } as any}>
          {service.price !== undefined ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "rgba(255,255,255,.82)",
                color: "#1E332E",
                fontWeight: 700,
                overflowWrap: "anywhere",
              } as any}
            >
              <strong>{t("priceLabel")}</strong>
              {t("price", { value: service.price })}
            </span>
          ) : null}
          {service.durationValue !== undefined || service.duration ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "rgba(255,255,255,.82)",
                color: "#1E332E",
                overflowWrap: "anywhere",
              } as any}
            >
              <Clock3 size={16} aria-hidden="true" />
              <strong>{t("durationLabel")}</strong>
              {[service.durationValue, service.duration].filter(Boolean).join(" ")}
            </span>
          ) : null}
          {service.insuranceAvailable ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#5FD9B3",
                color: "#1E332E",
                fontWeight: 700,
                overflowWrap: "anywhere",
              } as any}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              {t("insurance")}
            </span>
          ) : null}
        </div>
        <p
          className={styles.notice}
          style={{ color: "#6B7C6E", overflowWrap: "anywhere", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", padding: "12px 16px" } as any}
        >
          {t("bookingNotice")}
        </p>
      </article>
    </main>
  );
}
