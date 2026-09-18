import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Database, HardDrive, Download, Trash2 } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientStorage } from "@/lib/api/settings-server";
import { parseStorageSummary } from "@/lib/api/settings";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsDataPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const t = await getTranslations("Settings");
  const token = await requirePatientAccess(locale);
  // Backend binding: real upstream via getPatientStorage → callPatientApi, no mock
  const response = await getPatientStorage(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <Database size={20} aria-hidden="true" style={{ color: "#1E332E" }} />
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
        </section>
      </main>
    );
  }
  const storage = parseStorageSummary(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Database size={15} aria-hidden="true" />
          {ar ? "البيانات" : "Data"}
        </p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
          {ar ? "إدارة بياناتي" : "Manage my data"}
        </h1>
        <p style={{ overflowWrap: "anywhere" } as any}>
          {ar ? "لك الحق في الوصول لبياناتك وتصحيحها ونقلها وحذفها وفق نظام حماية البيانات." : "You have the right to access, correct, port and delete your data."}
        </p>
        <span className={styles.icon} style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any} aria-hidden="true">
          <HardDrive size={22} color="#1E332E" />
        </span>
      </section>

      <section className={styles.card} style={{ display: "grid" }}>
        <span className={styles.icon} aria-hidden="true">
          <HardDrive size={20} />
        </span>
        <div style={{ minInlineSize: 0, display: "grid", gap: 8 }}>
          <h2 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {t("storageTitle")}
          </h2>
          <p style={{ overflowWrap: "anywhere" } as any}>{storage.used && storage.total ? `${storage.used} / ${storage.total}` : t("notAvailable")}</p>
          {storage.items.length ? (
            <ul style={{ marginTop: 8 }}>
              {storage.items.map((item) => (
                <li key={item.label} style={{ overflowWrap: "anywhere" }}>
                  <span dir="auto" style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
                    {item.label}
                  </span>
                  <strong style={{ background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE", borderRadius: 20, padding: "4px 10px" }}>
                    {item.value} · {item.percent}%
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("storageEmpty")}</p>
          )}
          <p className={styles.boundary} style={{ marginTop: 8, borderInlineStart: "3px solid #5FD9B3", borderRadius: 16 } as any}>
            {storage.used && storage.total
              ? ar
                ? `الإجمالي: ${storage.used} من ${storage.total}`
                : `Total: ${storage.used} of ${storage.total}`
              : ar
                ? "التخزين يُقرأ من الخلفية المصرح بها فقط"
                : "Storage is read from the authorized backend only"}
          </p>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <Download size={20} />
          </span>
          <div style={{ minInlineSize: 0 }}>
            <h2>{ar ? "تحميل نسخة من بياناتي" : "Download a copy of my data"}</h2>
            <p style={{ overflowWrap: "anywhere" } as any}>{ar ? "JSON/PDF — اطلبها عبر الدعم وتصلك خلال 24 ساعة." : "JSON/PDF — request via support, delivered within 24 hours."}</p>
            <Link
              href={`/${locale}/support/chat`}
              style={{ display: "inline-flex", marginTop: 8, padding: "8px 14px", borderRadius: 20, background: "#5FD9B3", border: "1px solid #E8EDEE", color: "#1E332E", fontWeight: 800, fontSize: ".84rem", textDecoration: "none" } as any}
            >
              {ar ? "طلب عبر الدعم" : "Request via support"}
            </Link>
          </div>
        </article>

        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <Trash2 size={20} />
          </span>
          <div style={{ minInlineSize: 0 }}>
            <h2>{ar ? "حذف بياناتي نهائياً" : "Delete my data permanently"}</h2>
            <p style={{ overflowWrap: "anywhere" } as any}>{ar ? "لا يمكن التراجع — يتم عبر الدعم مع تحقق الهوية." : "Irreversible — handled via support with identity verification."}</p>
            <Link
              href={`/${locale}/support/chat`}
              style={{ display: "inline-flex", marginTop: 8, padding: "8px 14px", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", color: "#EF4444", fontWeight: 800, fontSize: ".84rem", textDecoration: "none" } as any}
            >
              {ar ? "طلب عبر الدعم" : "Request via support"}
            </Link>
          </div>
        </article>

        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <Database size={20} />
          </span>
          <div style={{ minInlineSize: 0 }}>
            <h2>{ar ? "ما البيانات التي نجمعها؟" : "What data do we collect?"}</h2>
            <p style={{ overflowWrap: "anywhere" } as any}>{ar ? "راجع سياسة الخصوصية لمعرفة فئات البيانات المحفوظة." : "Review the privacy policy for stored data categories."}</p>
            <Link
              href={`/${locale}/privacy`}
              style={{ display: "inline-flex", marginTop: 8, padding: "8px 14px", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", color: "#1E332E", fontWeight: 700, fontSize: ".84rem", textDecoration: "none" } as any}
            >
              {ar ? "سياسة الخصوصية" : "Privacy policy"}
            </Link>
          </div>
        </article>

        <article className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            <Download size={20} />
          </span>
          <div style={{ minInlineSize: 0 }}>
            <h2>{ar ? "نقل بياناتي لمنصة أخرى" : "Port my data elsewhere"}</h2>
            <p style={{ overflowWrap: "anywhere" } as any}>FHIR R4/HL7 — {ar ? "اطلبها عبر الدعم." : "request via support."}</p>
            <Link
              href={`/${locale}/support/chat`}
              style={{ display: "inline-flex", marginTop: 8, padding: "8px 14px", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", color: "#1E332E", fontWeight: 700, fontSize: ".84rem", textDecoration: "none" } as any}
            >
              {ar ? "طلب عبر الدعم" : "Request via support"}
            </Link>
          </div>
        </article>
      </section>

      <p className={styles.boundary} style={{ overflowWrap: "anywhere" } as any}>
        {t("readOnlyBoundary")}
      </p>
    </main>
  );
}
