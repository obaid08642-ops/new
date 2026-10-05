"use client";

import { useState } from "react";
import { Button, FIcon, Icon } from "@/components-next/ui-generated";
import { NabdMark } from "@/components-next/nabd-mark";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

const copy: Record<Locale, { brand:string; tagline:string; title:string; body:string; guest:string; register:string; login:string; social:string; blocked:string; language:string }> = {
  ar:{brand:"نبض بلس",tagline:"رعايتك الصحية المتكاملة",title:"رعايتك الصحية في مكان واحد",body:"استشارات، صيدلية، تحاليل، ورعاية منزلية بتجربة واضحة وآمنة.",guest:"المتابعة كضيف",register:"إنشاء حساب",login:"تسجيل الدخول",social:"أو الدخول بواسطة",blocked:"طرق الدخول الإضافية ستظهر بعد تثبيت عقودها الآمنة.",language:"اللغة"},
  en:{brand:"Nabd Plus",tagline:"Your complete healthcare",title:"Your care, in one place",body:"Consultations, pharmacy, diagnostics, and home care in one clear, secure experience.",guest:"Continue as guest",register:"Create account",login:"Log in",social:"Or continue with",blocked:"Additional sign-in methods appear after their secure contracts are verified.",language:"Language"},
  fil:{brand:"Nabd Plus",tagline:"Mas malapit ang pangangalaga",title:"Ang iyong pangangalaga, isang lugar",body:"Konsultasyon, parmasya, diagnostics, at home care sa isang ligtas na karanasan.",guest:"Magpatuloy bilang bisita",register:"Gumawa ng account",login:"Mag-log in",social:"O magpatuloy gamit ang",blocked:"Lilitaw ang ibang paraan kapag verified na ang secure contracts.",language:"Wika"},
  hi:{brand:"Nabd Plus",tagline:"देखभाल, और करीब",title:"आपकी देखभाल, एक जगह",body:"परामर्श, फार्मेसी, जांच और होम केयर एक सुरक्षित अनुभव में।",guest:"अतिथि के रूप में जारी रखें",register:"खाता बनाएं",login:"लॉग इन",social:"या इसके साथ जारी रखें",blocked:"सुरक्षित contracts सत्यापित होने के बाद अन्य तरीके उपलब्ध होंगे।",language:"भाषा"},
  ur:{brand:"Nabd Plus",tagline:"نگہداشت، قریب تر",title:"آپ کی نگہداشت، ایک جگہ",body:"مشاورت، فارمیسی، تشخیص اور گھر کی نگہداشت ایک محفوظ تجربے میں۔",guest:"بطور مہمان جاری رکھیں",register:"اکاؤنٹ بنائیں",login:"لاگ اِن",social:"یا اس کے ساتھ جاری رکھیں",blocked:"محفوظ معاہدے کی تصدیق کے بعد اضافی طریقے ظاہر ہوں گے۔",language:"زبان"},
  bn:{brand:"Nabd Plus",tagline:"যত্ন, আরও কাছে",title:"আপনার যত্ন, এক জায়গায়",body:"পরামর্শ, ফার্মেসি, ডায়াগনস্টিক ও হোম কেয়ার এক নিরাপদ অভিজ্ঞতায়।",guest:"অতিথি হিসেবে চালিয়ে যান",register:"অ্যাকাউন্ট তৈরি করুন",login:"লগ ইন",social:"অথবা চালিয়ে যান",blocked:"নিরাপদ চুক্তি যাচাই হলে অতিরিক্ত পদ্ধতি দেখা যাবে।",language:"ভাষা"}
};

export function AuthWelcome({ locale }: { locale: Locale }) {
  const t=copy[locale]; const router=useRouter();
  const [guestBusy, setGuestBusy]=useState(false);
  // Device-bound guest session (parity with mobile): the same browser keeps
  // the same guest account via a stored device id; convert on register.
  async function doGuest() {
    if (guestBusy) return;
    setGuestBusy(true);
    try {
      let deviceId: string | null = null;
      try { deviceId = window.localStorage.getItem("nabd_device_id"); } catch {}
      if (!deviceId) {
        deviceId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try { window.localStorage.setItem("nabd_device_id", deviceId); } catch {}
      }
      const res = await fetch("/api/auth/guest", { method: "POST", headers: { "content-type": "application/json", "x-nabd-device-id": deviceId } });
      if (!res.ok) throw new Error("guest_failed");
      router.push(`/${locale}`);
    } catch {
      router.push(`/${locale}/login?guest=blocked`);
    } finally {
      setGuestBusy(false);
    }
  }
  const ar = locale === "ar";
  return <div className={styles.welcome}>
    <div className={styles.stage} aria-hidden="true">
      <span className={`${styles.orbit} ${styles.o1}`}><FIcon icon="pill" tone="coral" chip="none" size={40} /></span>
      <span className={`${styles.orbit} ${styles.o2}`}><FIcon icon="stethoscope" tone="blue" chip="none" size={36} /></span>
      <span className={`${styles.orbit} ${styles.o3}`}><FIcon icon="test-tube" tone="mint" chip="none" size={34} /></span>
      <span className={`${styles.orbit} ${styles.o4}`}><FIcon icon="first-aid-kit" tone="teal" chip="none" size={38} /></span>
      <NabdMark size={150} variant="text" pulse />
    </div>
    <div className={styles.identity}>
      <h1 className={styles.welcomeWord}>{ar ? "نبض" : "Nabd"}<span className={styles.plus}>+</span></h1>
      <svg className={styles.ecg} width="160" height="14" viewBox="0 0 160 14" aria-hidden="true"><path d="M0 7h58l6-6 7 12 6-10 4 4h79" /></svg>
      <p className={styles.tagline}>{t.tagline}</p>
    </div>
    <div className={styles.cta}>
      <div className={styles.pair}>
        <Button variant="primary" size="lg" fullWidth label={t.register} onClick={() => router.push(`/${locale}/register`)} />
        <Button variant="outline" size="lg" fullWidth label={t.login} onClick={() => router.push(`/${locale}/login`)} />
      </div>
      <button type="button" className={styles.guestLink} onClick={doGuest} disabled={guestBusy}>
        {t.guest}<Icon name={ar ? "caret-left" : "caret-right"} size={16} tone="currentColor" />
      </button>
    </div>
  </div>;
}
