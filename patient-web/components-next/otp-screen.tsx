"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import type { Locale } from "@/lib/i18n";
import styles from "./auth/auth.module.css";

const copy: Record<Locale,{title:string;body:string;code:string;resend:string;wait:string;verify:string;busy:string;invalid:string;failed:string;missing:string;back:string}>={
 ar:{title:"أدخل رمز التأكيد",body:"أرسلنا رمزًا من 6 أرقام إلى",code:"رمز التحقق",resend:"إعادة إرسال الرمز",wait:"لم يصلك الرمز؟ راجع الرسائل غير المرغوبة. إعادة الإرسال بعد",verify:"تأكيد",busy:"جارٍ التحقق…",invalid:"أدخل رمزاً من 6 أرقام.",failed:"تعذر التحقق من الرمز. لم يتم تسجيل الدخول.",missing:"ابدأ من شاشة تسجيل الدخول أو إنشاء الحساب لنرسل إليك الرمز.",back:"العودة"},
 en:{title:"Enter the code",body:"We sent a 6-digit code to",code:"Verification code",resend:"Resend code",wait:"Resend available in",verify:"Verify code",busy:"Verifying…",invalid:"Enter a 6-digit code.",failed:"The code could not be verified. You are not signed in.",missing:"Start from sign in or create an account and we will send you a code.",back:"Back"},
 fil:{title:"I-verify ang account",body:"Ilagay ang 6-digit code na ipinadala sa iyo.",code:"Verification code",resend:"Ipadala muli",wait:"Muling ipadala sa",verify:"I-verify",busy:"Vine-verify…",invalid:"Maglagay ng 6-digit code.",failed:"Hindi ma-verify ang code.",missing:"Magsimula sa sign in o paggawa ng account at padadalhan ka namin ng code.",back:"Bumalik"},
 hi:{title:"खाते का सत्यापन",body:"आपको भेजा गया 6 अंकों का कोड दर्ज करें।",code:"सत्यापन कोड",resend:"कोड फिर भेजें",wait:"फिर भेजने में",verify:"कोड सत्यापित करें",busy:"सत्यापन हो रहा है…",invalid:"6 अंकों का कोड दर्ज करें।",failed:"कोड सत्यापित नहीं हो सका।",missing:"साइन इन या खाता बनाने से शुरू करें, हम आपको कोड भेजेंगे।",back:"वापस"},
 ur:{title:"اکاؤنٹ کی تصدیق",body:"آپ کو بھیجا گیا 6 ہندسوں کا کوڈ درج کریں۔",code:"تصدیقی کوڈ",resend:"کوڈ دوبارہ بھیجیں",wait:"دوبارہ بھیجنے میں",verify:"کوڈ کی تصدیق",busy:"تصدیق جاری ہے…",invalid:"6 ہندسوں کا کوڈ درج کریں۔",failed:"کوڈ کی تصدیق نہیں ہو سکی۔",missing:"سائن اِن یا اکاؤنٹ بنانے سے شروع کریں، ہم آپ کو کوڈ بھیجیں گے۔",back:"واپس"},
 bn:{title:"অ্যাকাউন্ট যাচাই",body:"আপনাকে পাঠানো ৬ সংখ্যার কোডটি লিখুন।",code:"যাচাইকরণ কোড",resend:"কোড আবার পাঠান",wait:"আবার পাঠাতে",verify:"কোড যাচাই করুন",busy:"যাচাই হচ্ছে…",invalid:"৬ সংখ্যার কোড লিখুন।",failed:"কোড যাচাই করা যায়নি।",missing:"সাইন ইন বা অ্যাকাউন্ট তৈরি থেকে শুরু করুন, আমরা আপনাকে কোড পাঠাব।",back:"ফিরে যান"}
};

export function OtpScreen({ locale }: { locale: Locale }) {
 const t=copy[locale]; const router=useRouter(); const params=useSearchParams(); const identifier=params.get("identifier") ?? ""; const [digits,setDigits]=useState(["","","","","",""]); const [seconds,setSeconds]=useState(300); const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(identifier?null:t.missing); const refs=useRef<Array<HTMLInputElement|null>>([]);
 useEffect(()=>{ if(seconds<=0)return; const id=window.setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000); return()=>window.clearInterval(id); },[seconds]);
 function update(index:number,value:string){const next=value.replace(/\D/g,"").slice(-1);const copyDigits=[...digits];copyDigits[index]=next;setDigits(copyDigits);if(next&&index<5)refs.current[index+1]?.focus();}
 function keyDown(index:number,event:React.KeyboardEvent<HTMLInputElement>){if(event.key==="Backspace"&&!digits[index]&&index>0)refs.current[index-1]?.focus();}
 async function resend(){if(!identifier||seconds>0||busy)return;setError(null);const response=await fetch("/api/auth/otp/request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({identifier})});if(response.ok)setSeconds(300);else setError(t.failed);}
 async function verify(event:React.FormEvent){event.preventDefault();const code=digits.join("");if(!identifier||code.length!==6){setError(t.invalid);return;}setBusy(true);setError(null);try{const verified=await fetch("/api/auth/otp/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({identifier,code})});if(!verified.ok){setError(t.failed);return;}const exchanged=await fetch("/api/auth/session/exchange",{method:"POST"});if(!exchanged.ok){setError(t.failed);return;}router.replace(`/${locale}/dashboard`);}catch{setError(t.failed)}finally{setBusy(false)}}
 const mm=Math.floor(seconds/60), ss=String(seconds%60).padStart(2,"0");
 return <>
  <div className={styles.heading}>
   <h1 className={styles.title}>{t.title}</h1>
   <p className={styles.subtitle}>{identifier ? <>{t.body} <bdi dir="ltr">{identifier}</bdi></> : t.missing}</p>
  </div>
  <form className={styles.form} onSubmit={verify}>
   <fieldset className={styles.otp} disabled={!identifier||busy}>
    <legend className={styles.srOnly}>{t.code}</legend>
    <div className={styles.cells} dir="ltr">{digits.map((digit,index)=><input key={index} ref={(el)=>{refs.current[index]=el;}} className={styles.cell} value={digit} inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} maxLength={1} aria-label={`${t.code} ${index+1}`} onChange={(event)=>update(index,event.target.value)} onKeyDown={(event)=>keyDown(index,event)} />)}</div>
   </fieldset>
   <div className={styles.resendRow}>
    {seconds>0 ? <><span className={styles.hint}>{t.wait}</span><span className={styles.timer} dir="ltr">{mm}:{ss}</span></> : <button type="button" className={styles.link} onClick={resend} disabled={!identifier||busy}>{t.resend}</button>}
   </div>
   {error && identifier ? <p className={styles.error} role="alert">{error}</p> : null}
   <div className={styles.actions}>
    <Button type="submit" variant="primary" size="lg" fullWidth label={busy?t.busy:t.verify} loading={busy} disabled={!identifier} />
    <p className={styles.foot}><button type="button" className={styles.link} onClick={()=>router.back()}>{t.back}</button></p>
   </div>
  </form>
 </>;
}
