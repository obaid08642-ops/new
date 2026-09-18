import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bell } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientNotificationSettings } from "@/lib/api/notification-settings-server";
import { extractNotificationSettings } from "@/lib/api/notification-settings";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const LABELS: Record<string, { ar: string; en: string }> = {
  general: { ar: "عامة", en: "General" },
  appointments: { ar: "المواعيد", en: "Appointments" },
  orders: { ar: "الطلبات", en: "Orders" },
  offers: { ar: "العروض", en: "Offers" },
  medications: { ar: "الأدوية", en: "Medications" },
  doctorMessages: { ar: "رسائل الأطباء", en: "Doctor messages" },
  emergency: { ar: "الطوارئ", en: "Emergency" },
  sound: { ar: "الصوت", en: "Sound" },
  vibration: { ar: "الاهتزاز", en: "Vibration" },
};

export default async function SettingsNotificationsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await getTranslations("Settings");
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await getPatientNotificationSettings(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{ar ? "تعذر تحميل إعدادات الإشعارات" : "Could not load notification settings"}</h1>
        </section>
      </main>
    );
  }
  const settings = extractNotificationSettings(await response.json().catch(() => null));
  const entries = Object.entries(LABELS);

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>
        {ar ? "الإعدادات" : "Settings"}
      </Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Bell size={15} aria-hidden="true" />
          {ar ? "الإشعارات" : "Notifications"}
        </p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? "إعدادات الإشعارات" : "Notification settings"}</h1>
        <p style={{ overflowWrap: "anywhere" }}>{ar ? "عرض فقط — غيّرها من تطبيق الجوال." : "Read-only — change them in the mobile app."}</p>
      </section>
      <section className={styles.grid}>
        {entries.map(([key, label]) => (
          <article key={key} className={styles.card} style={{ alignItems: "center" }}>
            <span className={styles.icon}><Bell size={18} aria-hidden="true" /></span>
            <div style={{ minInlineSize: 0 }}>
              <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{ar ? label.ar : label.en}</h2>
            </div>
            <strong style={{ marginInlineStart: "auto", padding: "6px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: settings[key as keyof typeof settings] ? "#5FD9B3" : "rgba(255,255,255,.82)", color: "#1E332E", fontSize: ".82rem", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" as any }}>{settings[key as keyof typeof settings] === undefined ? "—" : settings[key as keyof typeof settings] ? (ar ? "مفعّلة" : "On") : (ar ? "معطّلة" : "Off")}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
