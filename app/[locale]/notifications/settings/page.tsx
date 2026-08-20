import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Bell, CalendarDays, LockKeyhole, MessageCircle, Pill, ShoppingBag, Tag, Volume2, Vibrate, ShieldAlert } from "lucide-react";
import { getPatientNotificationSettings } from "@/lib/api/notification-settings-server";
import { extractNotificationSettings } from "@/lib/api/notification-settings";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./settings.module.css";

type Props = { params: Promise<{ locale: string }> };
const items = [
  ["general", "الإشعارات العامة", "تحديثات عامة ومعلومات مهمة من التطبيق", Bell],
  ["appointments", "تذكير المواعيد", "تذكيرات قبل المواعيد المحجوزة", CalendarDays],
  ["orders", "تحديثات الطلبات", "متابعة حالة طلبات الصيدلية والتوصيل", ShoppingBag],
  ["offers", "عروض وخصومات", "عروض على الخدمات والمنتجات", Tag],
  ["medications", "تذكير الأدوية", "تنبيهات بمواعيد تناول الأدوية", Pill],
  ["doctorMessages", "رسائل الأطباء", "رسائل وملاحظات من الأطباء", MessageCircle],
  ["emergency", "إشعارات الطوارئ", "تنبيهات السلامة والطوارئ الصحية الحرجة", ShieldAlert],
  ["sound", "الصوت", "تشغيل صوت عند وصول الإشعارات", Volume2],
  ["vibration", "الاهتزاز", "تفعيل الاهتزاز مع الإشعارات", Vibrate],
] as const;

export default async function NotificationSettingsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Notifications");
  const token = await requirePatientAccess(locale);
  let response: Response;
  try { response = await getPatientNotificationSettings(token); } catch { return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>; }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const settings = extractNotificationSettings(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>إعدادات الإشعارات</h1><p>القيم المعروضة مصدرها إعدادات حسابك الحالية. لا يمكن تعديلها من هذه النسخة قبل إغلاق عقد التحديث الآمن.</p></div><span className={styles.headerIcon}><Bell size={26} aria-hidden="true" /></span></section><section className={styles.list} aria-label="إعدادات الإشعارات">{items.map(([key, label, description, Icon]) => { const locked = key === "emergency"; const value = settings[key as keyof typeof settings]; return <article className={styles.card} key={key}><span className={styles.icon}><Icon size={20} aria-hidden="true" /></span><div className={styles.copy}><strong>{label}</strong><span>{description}</span></div><span className={`${styles.value} ${locked ? styles.locked : ""}`}>{locked ? <><LockKeyhole size={14} aria-hidden="true" /> مطلوب</> : typeof value === "boolean" ? value ? "مفعّل" : "متوقف" : "غير متاح"}</span></article>; })}</section></main>;
}
