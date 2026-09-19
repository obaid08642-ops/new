import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, FileCheck2, ShieldCheck } from "lucide-react";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../cart.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CartPrescriptionPreviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Cart");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/cart/prescription", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <FileCheck2 size={25} aria-hidden="true" />
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailableBody")}</p>
          <RetryButton />
        </section>
      </main>
    );
  const payload = (await response.json().catch(() => null)) as { prescription_id?: unknown; medications?: unknown } | null;
  const medications = Array.isArray(payload?.medications)
    ? payload.medications.flatMap((item) =>
        typeof item === "object" && item && typeof (item as { name?: unknown }).name === "string" ? [{ name: (item as { name: string }).name }] : [],
      )
    : [];
  const Direction = locale === "ar" || locale === "ur" ? ArrowLeft : ArrowRight;
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <section className={styles.hero} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={15} aria-hidden="true" color="#1E332E" />
            {t("eyebrow")}
          </p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("notice")}</p>
        </div>
        <span className={styles.heroIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } as any}>
          <VectorPharmacy size={48} aria-hidden="true" />
        </span>
      </section>
      {medications.length ? (
        <section className={styles.groups} style={{ display: "grid", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <article className={styles.group} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.9)", padding: 16, display: "grid", gap: 8 } as any}>
            <div className={styles.groupHead} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("itemCount")}</h2>
              <span style={{ color: "#1E332E", background: "#5FD9B3", border: "1px solid #5FD9B3", borderRadius: 20, padding: "4px 10px", fontWeight: 700 } as any}>{medications.length}</span>
            </div>
            {medications.map((item, index) => (
              <div className={styles.item} key={`${item.name}-${index}`} style={{ border: "1px solid #E8EDEE", borderRadius: 20, padding: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{item.name}</strong>
                <span style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("notAvailable")}</span>
              </div>
            ))}
          </article>
        </section>
      ) : (
        <section className={styles.state} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center" } as any}>
          <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" } as any}><FileCheck2 size={20} aria-hidden="true" color="#1E332E" /></span>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("empty")}</h2>
        </section>
      )}
      <Link className={styles.back} href={`/${locale}/cart`} style={{ color: "#1E332E", background: "#5FD9B3", border: "1px solid #5FD9B3", borderRadius: 20, padding: "8px 16px", fontWeight: 760, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, width: "fit-content", overflowWrap: "anywhere" } as any}>
        {t("back")}
        <Direction size={17} aria-hidden="true" />
      </Link>
    </main>
  );
}
