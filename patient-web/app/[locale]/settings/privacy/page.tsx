import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Lock } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { PrivacyToggles, type PrivacyState } from "@/components-next/privacy-toggles";
import styles from "../settings.module.css";

type Props = { params: Promise<{ locale: string }> };

const DEFAULTS: PrivacyState = { shareData: false, analytics: true, location: true, marketing: false, thirdParty: false };

function extract(payload: unknown): PrivacyState {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const src = (root && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root) || {};
  const pick = (k: keyof PrivacyState) => (typeof src[k] === "boolean" ? (src[k] as boolean) : DEFAULTS[k]);
  return { shareData: pick("shareData"), analytics: pick("analytics"), location: pick("location"), marketing: pick("marketing"), thirdParty: pick("thirdParty") };
}

export default async function SettingsPrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await getTranslations("Settings");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi("/users/me/privacy-settings", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{ar ? "تعذر تحميل إعدادات الخصوصية" : "Could not load privacy settings"}</h1>
        </section>
      </main>
    );
  }
  const initial = extract(await response.json().catch(() => null));
  const names = {
    location: { label: ar ? "مشاركة الموقع" : "Location sharing", sub: ar ? "لإيجاد أقرب المزودين الصحيين" : "To find nearby providers" },
    analytics: { label: ar ? "تحليلات الاستخدام" : "Usage analytics", sub: ar ? "مساعدتنا في تحسين التطبيق" : "Help us improve the app" },
    shareData: { label: ar ? "مشاركة البيانات الصحية" : "Health data sharing", sub: ar ? "مشاركة بيانات صحية مجهولة للأبحاث" : "Share anonymized data for research" },
    marketing: { label: ar ? "التواصل التسويقي" : "Marketing contact", sub: ar ? "إرسال عروض مخصصة" : "Receive tailored offers" },
    thirdParty: { label: ar ? "مشاركة مع أطراف ثالثة" : "Third-party sharing", sub: ar ? "شركاء التأمين والصيدليات" : "Insurance and pharmacy partners" },
  } as const;

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/settings`}>{ar ? "الإعدادات" : "Settings"}</Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Lock size={15} aria-hidden="true" />
          {ar ? "الخصوصية" : "Privacy"}
        </p>
        <h1>{ar ? "إعدادات الخصوصية" : "Privacy settings"}</h1>
        <p>{ar ? "بياناتك محمية ومشفرة. لا نبيع بياناتك لأي طرف خارجي." : "Your data is protected and encrypted. We never sell it."}</p>
      </section>
      <PrivacyToggles
        initial={initial}
        names={names}
        labels={{
          saveFailed: ar ? "تعذر الحفظ — حاول مرة أخرى" : "Could not save — try again",
          unavailable: ar ? "الخدمة غير متاحة حالياً" : "Service unavailable",
          saving: ar ? "جارٍ الحفظ…" : "Saving…",
        }}
      />
      <p style={{ marginTop: 12 }}>
        <Link href={`/${locale}/support`}>{ar ? "طلب حذف بياناتي الشخصية نهائياً" : "Request permanent deletion of my data"}</Link>
      </p>
    </main>
  );
}
