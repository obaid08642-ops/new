import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { startAuthentication } from '@simplewebauthn/browser';
import { apiErrorMessage } from '@/lib/admin-client';

type LoginStep = 'credentials' | 'otp' | 'passkey' | 'reset-request' | 'reset-confirm';

async function publicAuth(action: 'send-otp' | 'reset-password', body: Record<string, string>) {
  const response = await fetch(`/api/admin/auth/public/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage({ status: response.status, payload }, 'تعذر تنفيذ الطلب.'));
  return payload;
}

export default function AdminLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passkeyOptions, setPasskeyOptions] = useState<any>(null);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const returnTo = typeof router.query.returnTo === 'string' && router.query.returnTo.startsWith('/admin/')
    ? router.query.returnTo
    : '/admin/command-center';

  function completeLogin(payload: any) {
    const role = payload?.user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      setError('بيانات الدخول غير صحيحة.');
      return;
    }
    router.replace(returnTo);
  }

  async function submitCredentials(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 202 && payload?.requires_2fa) {
        setStep('otp');
        return;
      }
      if (response.status === 202 && payload?.requires_passkey && payload?.passkey_options) {
        setPasskeyOptions(payload.passkey_options);
        setStep('passkey');
        return;
      }
      if (!response.ok) throw new Error('بيانات الدخول غير صحيحة.');
      completeLogin(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/auth/verify-2fa', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), code: otp.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error('رمز التحقق غير صحيح أو منتهي.');
      completeLogin(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر التحقق من الرمز.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPasskey() {
    setLoading(true); setError('');
    try {
      const assertion = await startAuthentication({ optionsJSON: passkeyOptions });
      const response = await fetch('/api/admin/auth/passkey-verify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), response: assertion }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error('فشل التحقق من مفتاح الأمان.');
      completeLogin(payload);
    } catch (reason: any) {
      setError(reason?.name === 'NotAllowedError' ? 'تم إلغاء التحقق أو انتهت المهلة.' : (reason?.message || 'فشل التحقق من مفتاح الأمان.'));
    } finally {
      setLoading(false);
    }
  }

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    try {
      await publicAuth('send-otp', { identifier: identifier.trim() });
      setNotice('أُرسل رمز التحقق إلى بريدك الإلكتروني.');
      setStep('reset-confirm');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال رمز التحقق.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    try {
      await publicAuth('reset-password', { identifier: identifier.trim(), code: resetCode, password: newPassword });
      setNotice('تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.');
      setPassword(''); setResetCode(''); setNewPassword(''); setStep('credentials');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إعادة تعيين كلمة المرور.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none ring-teal-400 focus:ring-2';
  const buttonClass = 'w-full rounded-xl bg-teal-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <>
      <Head><title>نبض — دخول الإدارة</title><meta name="robots" content="noindex,nofollow" /></Head>
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <header className="mb-8 text-center"><h1 className="text-3xl font-black text-teal-300">نبض</h1><p className="mt-2 text-slate-400">دخول الإدارة المحمي</p></header>
          {error ? <p role="alert" className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
          {notice ? <p role="status" className="mb-4 rounded-lg border border-teal-500/40 bg-teal-500/10 p-3 text-sm text-teal-100">{notice}</p> : null}

          {step === 'credentials' ? <form onSubmit={submitCredentials} className="space-y-4">
            <label className="block text-sm text-slate-300">رقم الجوال أو البريد الإلكتروني<input className={`${inputClass} mt-2`} dir="ltr" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" /></label>
            <label className="block text-sm text-slate-300">كلمة المرور<input className={`${inputClass} mt-2`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
            <button className={buttonClass} type="submit" disabled={loading}>{loading ? 'جارٍ التحقق…' : 'تسجيل الدخول'}</button>
            <button className="w-full text-sm text-slate-400 underline hover:text-white" type="button" onClick={() => setStep('reset-request')}>نسيت كلمة المرور؟</button>
          </form> : null}

          {step === 'otp' ? <form onSubmit={submitOtp} className="space-y-4">
            <p className="text-sm text-slate-300">أدخل رمز التحقق المكوّن من 6 أرقام.</p>
            <input className={`${inputClass} text-center text-xl tracking-[0.5em]`} dir="ltr" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
            <button className={buttonClass} type="submit" disabled={loading || otp.length !== 6}>{loading ? 'جارٍ التحقق…' : 'تأكيد الرمز'}</button>
            <button className="w-full text-sm text-slate-400 underline" type="button" onClick={() => setStep('credentials')}>رجوع</button>
          </form> : null}

          {step === 'passkey' ? <div className="space-y-4 text-center"><p className="text-sm text-slate-300">أكّد الهوية بمفتاح الأمان المسجّل.</p><button className={buttonClass} type="button" onClick={submitPasskey} disabled={loading}>{loading ? 'بانتظار المفتاح…' : 'تأكيد بمفتاح الأمان'}</button><button className="w-full text-sm text-slate-400 underline" onClick={() => setStep('credentials')}>رجوع</button></div> : null}

          {step === 'reset-request' ? <form onSubmit={requestReset} className="space-y-4"><p className="text-sm text-slate-300">أدخل بريدك أو رقمك المسجل لإرسال رمز الاستعادة.</p><input className={inputClass} dir="ltr" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /><button className={buttonClass} disabled={loading}>{loading ? 'جارٍ الإرسال…' : 'إرسال الرمز'}</button><button className="w-full text-sm text-slate-400 underline" type="button" onClick={() => setStep('credentials')}>رجوع</button></form> : null}

          {step === 'reset-confirm' ? <form onSubmit={confirmReset} className="space-y-4"><input className={inputClass} placeholder="رمز التحقق" inputMode="numeric" maxLength={6} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} required /><input className={inputClass} type="password" placeholder="كلمة المرور الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required /><button className={buttonClass} disabled={loading || resetCode.length !== 6}>{loading ? 'جارٍ الحفظ…' : 'تعيين كلمة المرور'}</button><button className="w-full text-sm text-slate-400 underline" type="button" onClick={() => setStep('credentials')}>رجوع</button></form> : null}
        </section>
      </main>
    </>
  );
}
