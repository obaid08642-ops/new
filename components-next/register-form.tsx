"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./login-form.module.css";

const copy: Record<Locale, { name:string; phone:string; email:string; password:string; confirm:string; terms:string; privacy:string; submit:string; busy:string; invalid:string; unavailable:string; success:string; login:string; title:string; body:string }> = {
  ar: { name:"الاسم الكامل", phone:"رقم الهاتف", email:"البريد الإلكتروني", password:"كلمة المرور", confirm:"تأكيد كلمة المرور", terms:"أوافق على الشروط والأحكام وسياسة الخصوصية", privacy:"سياسة الخصوصية", submit:"إنشاء الحساب", busy:"جارٍ إنشاء الحساب…", invalid:"راجع الحقول وأكمل البيانات المطلوبة.", unavailable:"تعذر الوصول إلى خدمة التسجيل. لم يُنشأ حساب.", success:"تم قبول البيانات. أكمل التحقق بالرمز المرسل.", login:"لديك حساب؟ دخول", title:"إنشاء حساب", body:"ابدأ رعايتك الصحية مع نبض بلس." },
  en: { name:"Full name", phone:"Phone number", email:"Email address", password:"Password", confirm:"Confirm password", terms:"I agree to the Terms and Privacy Policy", privacy:"Privacy Policy", submit:"Create account", busy:"Creating account…", invalid:"Review the fields and complete the required information.", unavailable:"Registration is unavailable. No account was created.", success:"Details accepted. Complete verification with the code sent to you.", login:"Already have an account? Log in", title:"Create your account", body:"Start your care journey with Nabd Plus." },
  fil: { name:"Buong pangalan", phone:"Numero ng telepono", email:"Email address", password:"Password", confirm:"Kumpirmahin ang password", terms:"Sumasang-ayon ako sa Terms at Privacy Policy", privacy:"Privacy Policy", submit:"Gumawa ng account", busy:"Gumagawa ng account…", invalid:"Suriin ang mga field at kumpletuhin ang kailangan.", unavailable:"Hindi available ang pagpaparehistro. Walang account na ginawa.", success:"Tinanggap ang detalye. I-verify gamit ang ipinadalang code.", login:"May account na? Mag-log in", title:"Gumawa ng account", body:"Simulan ang iyong care journey sa Nabd Plus." },
  hi: { name:"पूरा नाम", phone:"फ़ोन नंबर", email:"ईमेल पता", password:"पासवर्ड", confirm:"पासवर्ड की पुष्टि करें", terms:"मैं शर्तों और गोपनीयता नीति से सहमत हूँ", privacy:"गोपनीयता नीति", submit:"खाता बनाएं", busy:"खाता बनाया जा रहा है…", invalid:"फ़ील्ड जांचें और आवश्यक जानकारी पूरी करें।", unavailable:"पंजीकरण उपलब्ध नहीं है। कोई खाता नहीं बनाया गया।", success:"विवरण स्वीकार हुआ। भेजे गए कोड से सत्यापन पूरा करें।", login:"पहले से खाता है? लॉग इन", title:"खाता बनाएं", body:"Nabd Plus के साथ अपनी देखभाल शुरू करें।" },
  ur: { name:"پورا نام", phone:"فون نمبر", email:"ای میل", password:"پاس ورڈ", confirm:"پاس ورڈ کی تصدیق", terms:"میں شرائط اور رازداری کی پالیسی سے اتفاق کرتا ہوں", privacy:"رازداری کی پالیسی", submit:"اکاؤنٹ بنائیں", busy:"اکاؤنٹ بنایا جا رہا ہے…", invalid:"خانے دیکھیں اور مطلوبہ معلومات مکمل کریں۔", unavailable:"رجسٹریشن دستیاب نہیں۔ اکاؤنٹ نہیں بنایا گیا۔", success:"تفصیلات قبول ہو گئیں۔ بھیجے گئے کوڈ سے تصدیق مکمل کریں۔", login:"اکاؤنٹ ہے؟ لاگ اِن", title:"اکاؤنٹ بنائیں", body:"Nabd Plus کے ساتھ اپنی نگہداشت شروع کریں۔" },
  bn: { name:"পূর্ণ নাম", phone:"ফোন নম্বর", email:"ইমেল", password:"পাসওয়ার্ড", confirm:"পাসওয়ার্ড নিশ্চিত করুন", terms:"আমি শর্তাবলি ও গোপনীয়তা নীতিতে সম্মত", privacy:"গোপনীয়তা নীতি", submit:"অ্যাকাউন্ট তৈরি করুন", busy:"অ্যাকাউন্ট তৈরি হচ্ছে…", invalid:"ফিল্ডগুলো পরীক্ষা করে প্রয়োজনীয় তথ্য পূরণ করুন।", unavailable:"নিবন্ধন উপলভ্য নয়। কোনো অ্যাকাউন্ট তৈরি হয়নি।", success:"তথ্য গ্রহণ করা হয়েছে। পাঠানো কোড দিয়ে যাচাই সম্পূর্ণ করুন।", login:"অ্যাকাউন্ট আছে? লগ ইন", title:"অ্যাকাউন্ট তৈরি করুন", body:"Nabd Plus-এর সঙ্গে আপনার যত্নের যাত্রা শুরু করুন।" }
};

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = copy[locale]; const router = useRouter();
  const [form, setForm] = useState({ name:"", phone:"", email:"", password:"", confirm_password:"" });
  const [agreed, setAgreed] = useState(false); const [showPassword, setShowPassword] = useState(false); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    if (form.name.trim().length < 2 || form.phone.trim().length < 8 || !form.email.includes("@") || form.password.length < 8 || form.password !== form.confirm_password || !agreed) { setMessage(t.invalid); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ ...form, agreed_to_terms:true }) });
      if (!response.ok) { setMessage(response.status >= 500 ? t.unavailable : t.invalid); return; }
      setMessage(t.success);
      router.push(`/${locale}/login?otp=1&identifier=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch { setMessage(t.unavailable); } finally { setSubmitting(false); }
  }
  return <form className={styles.form} onSubmit={submit} aria-busy={submitting}>
    <label className={styles.field}><span>{t.name}</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name" /></label>
    <label className={styles.field}><span>{t.phone}</span><input required inputMode="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/[^+\d]/g,"")})} autoComplete="tel" /></label>
    <label className={styles.field}><span>{t.email}</span><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" /></label>
    <label className={styles.field}><span>{t.password}</span><span className={styles.inputWrap}><input required type={showPassword ? "text" : "password"} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} autoComplete="new-password" /><button type="button" className={styles.iconButton} onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
    <label className={styles.field}><span>{t.confirm}</span><input required type={showPassword ? "text" : "password"} value={form.confirm_password} onChange={e=>setForm({...form,confirm_password:e.target.value})} autoComplete="new-password" /></label>
    <label className={styles.consent}><button type="button" className={`${styles.checkbox} ${agreed ? styles.checked : ""}`} onClick={()=>setAgreed(v=>!v)} aria-pressed={agreed}>{agreed ? <Check size={15}/> : null}</button><span>{t.terms}</span></label>
    {message ? <p className={styles.error} role="alert">{message}</p> : null}
    <button className={styles.submit} disabled={submitting}>{submitting ? <LoaderCircle className={styles.spinner} size={18}/> : null}{submitting ? t.busy : t.submit}</button>
    <p className={styles.registerPrompt}><button type="button" className={styles.textLink} onClick={()=>router.push(`/${locale}/login`)}>{t.login}</button></p>
  </form>;
}
