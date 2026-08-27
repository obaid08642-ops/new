import Link from "next/link";
import { FileText, LockKeyhole } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./legal-placeholder.module.css";

const copy: Record<Locale,{terms:string;privacy:string;title:string;body:string;back:string;blocked:string}>={
 ar:{terms:"الشروط والأحكام",privacy:"سياسة الخصوصية",title:"المحتوى القانوني المعتمد مطلوب",body:"هذه الصفحة موجودة ضمن رحلة التسجيل، لكن النص القانوني المعتمد لم يُسلّم بعد. لن نعرض نصاً افتراضياً أو نطلب موافقة على محتوى غير موثق.",back:"العودة إلى إنشاء الحساب",blocked:"محجوب بانتظار النسخة القانونية المعتمدة."},
 en:{terms:"Terms and conditions",privacy:"Privacy policy",title:"Approved legal copy required",body:"This page is part of the registration journey, but approved legal copy has not been supplied. No placeholder policy is shown and no consent is implied.",back:"Back to registration",blocked:"Blocked pending approved legal copy."},
 fil:{terms:"Terms and conditions",privacy:"Privacy policy",title:"Kailangang aprubadong legal copy",body:"Hindi pa ibinigay ang aprubadong legal copy. Walang placeholder policy ang ipapakita.",back:"Bumalik sa registration",blocked:"Blocked habang hinihintay ang aprubadong kopya."},
 hi:{terms:"नियम और शर्तें",privacy:"गोपनीयता नीति",title:"स्वीकृत कानूनी सामग्री आवश्यक",body:"स्वीकृत कानूनी सामग्री अभी उपलब्ध नहीं कराई गई है। कोई काल्पनिक नीति नहीं दिखाई जाएगी।",back:"पंजीकरण पर वापस जाएं",blocked:"स्वीकृत कानूनी सामग्री लंबित है।"},
 ur:{terms:"شرائط و ضوابط",privacy:"رازداری کی پالیسی",title:"منظور شدہ قانونی متن درکار ہے",body:"منظور شدہ قانونی متن ابھی فراہم نہیں کیا گیا۔ کوئی فرضی پالیسی نہیں دکھائی جائے گی۔",back:"رجسٹریشن پر واپس جائیں",blocked:"منظور شدہ قانونی متن کا انتظار ہے۔"},
 bn:{terms:"শর্তাবলি",privacy:"গোপনীয়তা নীতি",title:"অনুমোদিত আইনি কপি প্রয়োজন",body:"অনুমোদিত আইনি কপি এখনও দেওয়া হয়নি। কোনো placeholder policy দেখানো হবে না।",back:"রেজিস্ট্রেশনে ফিরুন",blocked:"অনুমোদিত আইনি কপি অপেক্ষমাণ।"}
};
export function LegalPlaceholder({locale,kind}:{locale:Locale;kind:"terms"|"privacy"}){const t=copy[locale];const label=kind==="terms"?t.terms:t.privacy;return <main className={styles.page} dir={locale === "ar" || locale === "ur" ? "rtl":"ltr"}><section className={styles.card}><div className={styles.icon}><FileText size={25}/></div><p className={styles.eyebrow}><LockKeyhole size={14}/>{label}</p><h1>{t.title}</h1><p>{t.body}</p><div className={styles.blocked}>{t.blocked}</div><Link className={styles.back} href={`/${locale}/register`}>{t.back}</Link></section></main>}
