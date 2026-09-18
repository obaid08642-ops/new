import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck, LockKeyhole, Fingerprint } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientSecuritySettings } from "@/lib/api/settings-server";
import { parseSecuritySettings } from "@/lib/api/settings";
import styles from "./security.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsSecurityPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const t = await getTranslations("Settings");
  const token = await requirePatientAccess(locale);
  // Backend binding: real upstream via getPatientSecuritySettings → callPatientApi, no mock
  const response = await getPatientSecuritySettings(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <ShieldCheck size={20} aria-hidden="true" style={{ color: "#1E332E" }} />
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
        </section>
      </main>
    );
  }
  const security = parseSecuritySettings(await response.json().catch(() => null));
  const badge = (v?: boolean) => {
    if (v === undefined) return { label: t("notAvailable"), cls: styles.badgeOff };
    return v ? { label: t("enabled"), cls: styles.badgeOn } : { label: t("disabled"), cls: styles.badgeOff };
  };
  const bio = badge(security.biometric);
  const two = badge(security.twoFactor);

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <ShieldCheck size={15} aria-hidden="true" />
          {ar ? "الأمان" : "Security"}
        </p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
          {t("securityTitle")}
        </h1>
        <p style={{ overflowWrap: "anywhere" } as any}>{t("notice")}</p>
        <span className={styles.icon} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any} aria-hidden="true">
          <ShieldCheck size={22} color="#1E332E" />
        </span>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <Fingerprint size={20} />
          </span>
          <div style={{ minInlineSize: 0 }}>
            <h2>{t("biometric")}</h2>
            <p style={{ overflowWrap: "anywhere" } as any}>{ar ? "تسجيل الدخول بالبصمة أو الوجه حسب جهازك" : "Biometric sign-in on supported devices"}</p>
          </div>
          <strong className={`${styles.badge} ${bio.cls}`} style={{ marginInlineStart: "auto", alignSelf: "center" }}>
            {bio.label}
          </strong>
        </article>

        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <LockKeyhole size={20} />
          </span>
          <div style={{ minInlineSize: 0 }}>
            <h2>{t("twoFactor")}</h2>
            <p style={{ overflowWrap: "anywhere" } as any}>{ar ? "طبقة تحقق إضافية لحماية حسابك" : "Extra verification layer for your account"}</p>
          </div>
          <strong className={`${styles.badge} ${two.cls}`} style={{ marginInlineStart: "auto", alignSelf: "center" }}>
            {two.label}
          </strong>
        </article>
      </section>

      <p className={styles.boundary} style={{ overflowWrap: "anywhere" } as any}>
        {t("readOnlyBoundary")}
      </p>
    </main>
  );
}
