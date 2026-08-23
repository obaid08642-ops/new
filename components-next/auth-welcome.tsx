"use client";

import { useRouter } from "next/navigation";
import { Globe2, Moon, Sun } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./auth-welcome.module.css";

const copy: Record<Locale, { brand:string; tagline:string; title:string; body:string; guest:string; register:string; login:string; social:string; blocked:string; language:string }> = {
  ar:{brand:"نبض بلس",tagline:"رعايتك أقرب",title:"رعايتك الصحية في مكان واحد",body:"استشارات، صيدلية، تحاليل، ورعاية منزلية بتجربة واضحة وآمنة.",guest:"الاستمرار بدون تسجيل",register:"إنشاء حساب",login:"تسجيل الدخول",social:"أو الدخول بواسطة",blocked:"طرق الدخول الإضافية ستظهر بعد تثبيت عقودها الآمنة.",language:"اللغة"},
  en:{brand:"Nabd Plus",tagline:"Care, closer",title:"Your care, in one place",body:"Consultations, pharmacy, diagnostics, and home care in one clear, secure experience.",guest:"Continue as guest",register:"Create account",login:"Log in",social:"Or continue with",blocked:"Additional sign-in methods appear after their secure contracts are verified.",language:"Language"},
  fil:{brand:"Nabd Plus",tagline:"Mas malapit ang pangangalaga",title:"Ang iyong pangangalaga, isang lugar",body:"Konsultasyon, parmasya, diagnostics, at home care sa isang ligtas na karanasan.",guest:"Magpatuloy bilang bisita",register:"Gumawa ng account",login:"Mag-log in",social:"O magpatuloy gamit ang",blocked:"Lilitaw ang ibang paraan kapag verified na ang secure contracts.",language:"Wika"},
  hi:{brand:"Nabd Plus",tagline:"देखभाल, और करीब",title:"आपकी देखभाल, एक जगह",body:"परामर्श, फार्मेसी, जांच और होम केयर एक सुरक्षित अनुभव में।",guest:"अतिथि के रूप में जारी रखें",register:"खाता बनाएं",login:"लॉग इन",social:"या इसके साथ जारी रखें",blocked:"सुरक्षित contracts सत्यापित होने के बाद अन्य तरीके उपलब्ध होंगे।",language:"भाषा"},
  ur:{brand:"Nabd Plus",tagline:"نگہداشت، قریب تر",title:"آپ کی نگہداشت، ایک جگہ",body:"مشاورت، فارمیسی، تشخیص اور گھر کی نگہداشت ایک محفوظ تجربے میں۔",guest:"بطور مہمان جاری رکھیں",register:"اکاؤنٹ بنائیں",login:"لاگ اِن",social:"یا اس کے ساتھ جاری رکھیں",blocked:"محفوظ معاہدے کی تصدیق کے بعد اضافی طریقے ظاہر ہوں گے۔",language:"زبان"},
  bn:{brand:"Nabd Plus",tagline:"যত্ন, আরও কাছে",title:"আপনার যত্ন, এক জায়গায়",body:"পরামর্শ, ফার্মেসি, ডায়াগনস্টিক ও হোম কেয়ার এক নিরাপদ অভিজ্ঞতায়।",guest:"অতিথি হিসেবে চালিয়ে যান",register:"অ্যাকাউন্ট তৈরি করুন",login:"লগ ইন",social:"অথবা চালিয়ে যান",blocked:"নিরাপদ চুক্তি যাচাই হলে অতিরিক্ত পদ্ধতি দেখা যাবে।",language:"ভাষা"}
};

function Logo() { return <span className={styles.logo}><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 52H38l5-22 9 44 6-30 5 8H82" /></svg></span>; }
export function AuthWelcome({ locale }: { locale: Locale }) {
  const t=copy[locale]; const router=useRouter();
  return <main className={styles.page} dir={locale === "ar" || locale === "ur" ? "rtl" : "ltr"}><header className={styles.topbar}><button className={styles.iconButton} type="button" aria-label="Toggle theme"><Moon size={17}/><Sun size={15}/></button><span className={styles.language}><Globe2 size={16}/>{t.language}: {locale.toUpperCase()}</span></header><section className={styles.content}><div className={styles.brand}><Logo/><div><strong>{t.brand}</strong><span>{t.tagline}</span></div></div><h1 className={styles.title}>{t.title}</h1><p className={styles.body}>{t.body}</p><div className={styles.actions}><button type="button" className={styles.guest} onClick={()=>router.push(`/${locale}/login?guest=blocked`)}>{t.guest}</button><button type="button" className={styles.primary} onClick={()=>router.push(`/${locale}/register`)}>{t.register}</button><button type="button" className={styles.secondary} onClick={()=>router.push(`/${locale}/login`)}>{t.login}</button></div><div className={styles.divider}><span>{t.social}</span></div><div className={styles.socials}>{["G","A","S","X"].map((label)=><button type="button" key={label} className={styles.social} onClick={()=>undefined} aria-label={label}>{label}</button>)}</div><p className={styles.blocked}>{t.blocked}</p></section></main>;
}
