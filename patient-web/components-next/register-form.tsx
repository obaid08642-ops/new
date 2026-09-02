"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./login-form.module.css";

const copy: Record<Locale, { name: string; identifier: string; password: string; confirm: string; terms: string; privacy: string; submit: string; busy: string; invalid: string; unavailable: string; success: string; login: string; title: string; body: string }> = {
  ar: { name: "الاسم الكامل", identifier: "البريد الإلكتروني أو رقم الهاتف", password: "كلمة المرور", confirm: "تأكيد كلمة المرور", terms: "أوافق على الشروط والأحكام", privacy: "سياسة الخصوصية", submit: "إنشاء الحساب", busy: "جارٍ إنشاء الحساب…", invalid: "راجع الحقول وأكمل البيانات المطلوبة.", unavailable: "تعذر الوصول إلى خدمة التسجيل. لم يُنشأ حساب.", success: "تم إنشاء الحساب. أكمل التحقق بالرمز المرسل.", login: "لديك حساب؟ دخول", title: "إنشاء حساب", body: "ابدأ رعايتك الصحية مع نبض بلس." },
  en: { name: "Full name", identifier: "Email or mobile number", password: "Password", confirm: "Confirm password", terms: "I agree to the Terms", privacy: "Privacy Policy", submit: "Create account", busy: "Creating account…", invalid: "Review the fields and complete the required information.", unavailable: "Registration is unavailable. No account was created.", success: "Account created. Complete verification with the code sent to you.", login: "Already have an account? Log in", title: "Create your account", body: "Start your care journey with Nabd Plus." },
  fil: { name: "Buong pangalan", identifier: "Email o mobile number", password: "Password", confirm: "Kumpirmahin ang password", terms: "Sumasang-ayon ako sa Terms", privacy: "Privacy Policy", submit: "Gumawa ng account", busy: "Gumagawa ng account…", invalid: "Suriin ang mga field at kumpletuhin ang kailangan.", unavailable: "Hindi available ang pagpaparehistro. Walang account na ginawa.", success: "Nagawa ang account. I-verify gamit ang ipinadalang code.", login: "May account na? Mag-log in", title: "Gumawa ng account", body: "Simulan ang iyong care journey sa Nabd Plus." },
  hi: { name: "पूरा नाम", identifier: "ईमेल या मोबाइल नंबर", password: "पासवर्ड", confirm: "पासवर्ड की पुष्टि करें", terms: "मैं शर्तों से सहमत हूं", privacy: "गोपनीयता नीति", submit: "खाता बनाएं", busy: "खाता बनाया जा रहा है…", invalid: "फ़ील्ड जांचें और आवश्यक जानकारी पूरी करें।", unavailable: "पंजीकरण उपलब्ध नहीं है। कोई खाता नहीं बनाया गया।", success: "खाता बन गया। भेजे गए कोड से सत्यापन करें।", login: "पहले से खाता है? लॉग इन", title: "खाता बनाएं", body: "Nabd Plus के साथ अपनी देखभाल शुरू करें।" },
  ur: { name: "پورا نام", identifier: "ای میل یا موبائل نمبر", password: "پاس ورڈ", confirm: "پاس ورڈ کی تصدیق", terms: "میں شرائط سے اتفاق کرتا ہوں", privacy: "رازداری کی پالیسی", submit: "اکاؤنٹ بنائیں", busy: "اکاؤنٹ بنایا جا رہا ہے…", invalid: "خانے دیکھیں اور مطلوبہ معلومات مکمل کریں۔", unavailable: "رجسٹریشن دستیاب نہیں۔ اکاؤنٹ نہیں بنایا گیا۔", success: "اکاؤنٹ بن گیا۔ بھیجے گئے کوڈ سے تصدیق کریں۔", login: "اکاؤنٹ ہے؟ لاگ اِن", title: "اکاؤنٹ بنائیں", body: "Nabd Plus کے ساتھ اپنی نگہداشت شروع کریں۔" },
  bn: { name: "পূর্ণ নাম", identifier: "ইমেল বা মোবাইল নম্বর", password: "পাসওয়ার্ড", confirm: "পাসওয়ার্ড নিশ্চিত করুন", terms: "আমি শর্তাবলিতে সম্মত", privacy: "গোপনীয়তা নীতি", submit: "অ্যাকাউন্ট তৈরি করুন", busy: "অ্যাকাউন্ট তৈরি হচ্ছে…", invalid: "ফিল্ডগুলো পরীক্ষা করে প্রয়োজনীয় তথ্য পূরণ করুন।", unavailable: "নিবন্ধন উপলভ্য নয়। কোনো অ্যাকাউন্ট তৈরি হয়নি।", success: "অ্যাকাউন্ট তৈরি হয়েছে। পাঠানো কোড দিয়ে যাচাই করুন।", login: "অ্যাকাউন্ট আছে? লগ ইন", title: "অ্যাকাউন্ট তৈরি করুন", body: "Nabd Plus-এর সঙ্গে আপনার যত্নের যাত্রা শুরু করুন।" }
};

const policyIds = {
  terms: process.env.NEXT_PUBLIC_TERMS_POLICY_ID || "terms",
  termsVersion: process.env.NEXT_PUBLIC_TERMS_POLICY_VERSION || "v1",
  privacy: process.env.NEXT_PUBLIC_PRIVACY_POLICY_ID || "privacy",
  privacyVersion: process.env.NEXT_PUBLIC_PRIVACY_POLICY_VERSION || "v1",
};

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const router = useRouter();
  const [form, setForm] = useState({ name: "", identifier: "", password: "", confirm: "" });
  const [agreed, setAgreed] = useState(false);
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const consents = [
      { policy_id: policyIds.terms, version: policyIds.termsVersion },
      { policy_id: policyIds.privacy, version: policyIds.privacyVersion },
    ];
    if (form.name.trim().length < 2 || form.identifier.trim().length < 3 || form.password.length < 8 || form.password !== form.confirm || !agreed) {
      setMessage(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), identifier: form.identifier.trim(), password: form.password, locale, consents }),
      });
      if (!response.ok) {
        setMessage(response.status >= 500 ? t.unavailable : t.invalid);
        return;
      }
      setMessage(t.success);
      router.push(`/${locale}/otp?identifier=${encodeURIComponent(form.identifier.trim())}`);
    } catch {
      setMessage(t.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={busy}>
      <label className={styles.field}>
        <span>{t.name}</span>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
      </label>
      <label className={styles.field}>
        <span>{t.identifier}</span>
        <input required value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoComplete="username" />
      </label>
      <label className={styles.field}>
        <span>{t.password}</span>
        <span className={styles.inputWrap}>
          <input required minLength={8} type={show ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <button type="button" className={styles.iconButton} onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      <label className={styles.field}>
        <span>{t.confirm}</span>
        <input required minLength={8} type={show ? "text" : "password"} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
      </label>
      <label className={styles.consent}>
        <button type="button" className={`${styles.checkbox} ${agreed ? styles.checked : ""}`} onClick={() => setAgreed((v) => !v)} aria-pressed={agreed}>
          {agreed ? <Check size={15} /> : null}
        </button>
        <span>
          {locale === "ar" ? (
            <>أوافق على <Link className={styles.textLink} href={`/${locale}/terms`}>{t.terms}</Link> و<Link className={styles.textLink} href={`/${locale}/privacy`}>{t.privacy}</Link></>
          ) : (
            <>{t.terms} &amp; <Link className={styles.textLink} href={`/${locale}/privacy`}>{t.privacy}</Link></>
          )}
        </span>
      </label>
      {message ? <p className={styles.error} role="alert">{message}</p> : null}
      <button className={styles.submit} disabled={busy}>
        {busy ? <LoaderCircle className={styles.spinner} size={18} /> : null}
        {busy ? t.busy : t.submit}
      </button>
      <p className={styles.registerPrompt}>
        <button type="button" className={styles.textLink} onClick={() => router.push(`/${locale}/login`)}>
          {t.login}
        </button>
      </p>
    </form>
  );
}
