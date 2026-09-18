import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Lock, ShieldCheck } from "lucide-react";
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
  // Backend binding: real upstream — no mock
  const response = await callPatientApi("/users/me/privacy-settings", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <ShieldCheck size={20} aria-hidden="true" style={{ color: "#1E332E" }} />
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "تعذر تحميل إعدادات الخصوصية" : "Could not load privacy settings"}</h1>
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
      <Link href={`/${locale}/settings`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>{ar ? "الإعدادات" : "Settings"}</Link>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>
          <Lock size={15} aria-hidden="true" />
          {ar ? "الخصوصية" : "Privacy"}
        </p>
        <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "إعدادات الخصوصية" : "Privacy settings"}</h1>
        <p style={{ overflowWrap: "anywhere" } as any}>{ar ? "بياناتك محمية ومشفرة. لا نبيع بياناتك لأي طرف خارجي." : "Your data is protected and encrypted. We never sell it."}</p>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flexShrink: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><Lock size={22} color="#1E332E" aria-hidden="true" /></span>
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
      <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Link href={`/${locale}/support`} style={{ padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" } as any}>{ar ? "طلب حذف بياناتي الشخصية نهائياً" : "Request permanent deletion of my data"}</Link>
      </p>
    </main>
  );
}
