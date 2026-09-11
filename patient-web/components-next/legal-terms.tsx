"use client";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./legal-placeholder.module.css";

const AR_TERMS = [
  "التعريفات: منصة نبض وسيط تقني يربط المريض بمقدمي الخدمات الصحية المرخصين، وليست مقدم خدمة طبية.",
  "الأهلية: يجب أن يكون المستخدم بالغاً (18+) أو بموافقة ولي الأمر، ويتحمل مسؤولية صحة بياناته.",
  "الخدمات: استشارات، صيدلية، مختبر، أشعة، تمريض منزلي، تغذية، تذكير أدوية، حمل، صحة نفسية — كل خدمة تخضع لشروطها الخاصة.",
  "الأدوية (Rx): لا تُصرف أدوية بوصفة إلا بوصفة طبية معتمدة من طبيب مرخص، ويُمنع تجاوز ذلك.",
  "التأمين: تُستخدم بيانات التأمين للتحقق من الأهلية عبر NPHIES، ويتحمل المريض الفروقات غير المغطاة.",
  "الدفع: يتم عبر البوابات المعتمدة، مع مفتاح عدم تكرار (idempotency) يمنع الخصم المزدوج.",
  "الذكاء الاصطناعي: توصيات AI استرشادية فقط ولا تغني عن استشارة الطبيب.",
  "البيانات: تُعالج وفق نظام حماية البيانات الشخصية (PDPL)، وللمستخدم حق الوصول والتصحيح والحذف.",
  "الشكاوى: تُقدم عبر مركز الدعم خلال 30 يوماً من الواقعة، وتُرد خلال 5 أيام عمل.",
  "المسؤولية: المنصة غير مسؤولة عن الأخطاء الطبية — المسؤولية على المزود المرخص.",
  "التعديلات: تُشعر المنصة المستخدم قبل 15 يوماً، والاستمرار استخداماً قبول ضمني.",
  "الاختصاص: تخضع للقوانين السعودية، والمحكمة المختصة في الرياض.",
];

const AR_PRIVACY = [
  "نجمع: الاسم، الجوال، العنوان، السجل الصحي اللازم للخدمة فقط (تقليل البيانات).",
  "نستخدم البيانات لتقديم الخدمة والتحقق من التأمين وتحسين الجودة — لا تسويق دون موافقة.",
  "نشارك البيانات مع المزود المختار وشركة التأمين والبوابات — فقط بالقدر اللازم.",
  "نحتفظ بالبيانات طوال الحساب + 5 سنوات للسجلات النظامية ثم تُحذف.",
  "حقوقك (PDPL): الوصول، التصحيح، الحذف، الاعتراض، سحب الموافقة عبر الإعدادات.",
  "الأمان: تشفير TLS + تخزين مشفر + سجلات وصول (ABAC) غير قابلة للتعديل.",
  "الأطفال: خدمات القاصرين بموافقة ولي الأمر فقط.",
  "التواصل: لأي طلب خصوصية راسلنا عبر الدعم — الرد خلال 72 ساعة.",
];

export function LegalTerms({ locale }: { locale: Locale }) {
  const isAr = locale === "ar";
  const items = isAr ? AR_TERMS : AR_TERMS;
  return (
    <main className={styles.page} dir={isAr ? "rtl" : "ltr"}>
      <section className={styles.card}>
        <div className={styles.icon}><ShieldCheck size={25} /></div>
        <p className={styles.eyebrow}>{isAr ? "الشروط والأحكام" : "Terms"}</p>
        <h1>{isAr ? "شروط استخدام منصة نبض" : "Nabd Terms"}</h1>
        <ol style={{ textAlign: isAr ? "right" : "left", lineHeight: 2 }}>
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
        <Link className={styles.back} href={`/${locale}/register`}>{isAr ? "العودة إلى إنشاء الحساب" : "Back"}</Link>
      </section>
    </main>
  );
}
export function LegalPrivacy({ locale }: { locale: Locale }) {
  const isAr = locale === "ar";
  return (
    <main className={styles.page} dir={isAr ? "rtl" : "ltr"}>
      <section className={styles.card}>
        <div className={styles.icon}><ShieldCheck size={25} /></div>
        <p className={styles.eyebrow}>{isAr ? "سياسة الخصوصية" : "Privacy"}</p>
        <h1>{isAr ? "سياسة خصوصية منصة نبض (PDPL)" : "Nabd Privacy (PDPL)"}</h1>
        <ol style={{ textAlign: isAr ? "right" : "left", lineHeight: 2 }}>
          {AR_PRIVACY.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
        <Link className={styles.back} href={`/${locale}/register`}>{isAr ? "العودة" : "Back"}</Link>
      </section>
    </main>
  );
}
