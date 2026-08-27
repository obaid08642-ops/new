import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { startAuthentication } from '@simplewebauthn/browser';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

/**
 * Discreet sign-in — no role/panel branding by design (security through
 * obscurity): the page presents only "نبض — تسجيل دخول". The 2FA flow and
 * role gate stay identical; unauthorized accounts simply see a generic error.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp' | 'passkey' | 'reset-request' | 'reset-confirm'>('credentials');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState('');
  const [passkeyOptions, setPasskeyOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('بيانات الدخول غير صحيحة');

      if (data?.requires_passkey && data?.passkey_options) {
        // Strict layer-2: WebAuthn challenge issued ONLY after a valid password.
        setPasskeyOptions(data.passkey_options);
        setStep('passkey');
        return;
      }
      if (data?.requires_2fa) {
        setStep('otp');
        return;
      }
      completeLogin(data);
    } catch (err: any) {
      setError(err?.message || 'تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), code: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('رمز التحقق غير صحيح');
      completeLogin(data);
    } catch (err: any) {
      setError(err?.message || 'تعذر التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskey = async () => {
    setError('');
    setLoading(true);
    try {
      // Triggers Face ID / Touch ID / device passcode — or a QR code for
      // cross-device sign-in (e.g. old Mac + iPhone camera) via hybrid transport.
      const assertion = await startAuthentication({ optionsJSON: passkeyOptions });
      const res = await fetch(`${API_BASE}/api/v1/auth/passkey/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), response: assertion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('فشل التحقق من مفتاح الأمان');
      completeLogin(data);
    } catch (err: any) {
      setError(err?.name === 'NotAllowedError' ? 'تم إلغاء التحقق أو انتهت المهلة' : (err?.message || 'فشل التحقق من مفتاح الأمان'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      if (!res.ok) throw new Error('تعذر إرسال رمز التحقق');
      setInfo('أُرسل رمز التحقق إلى بريدك الإلكتروني — صالح لدقائق.');
      setStep('reset-confirm');
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), code: resetCode.trim(), password: newPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.message === 'OTP expired or not requested' ? 'رمز التحقق غير صحيح أو منتهي' : 'تعذر إعادة التعيين');
      }
      setInfo('تم تغيير كلمة المرور — سجّل دخولك الآن.');
      setNewPassword(''); setResetCode('');
      setStep('credentials');
    } catch (err: any) {
      setError(err?.message || 'تعذر إعادة التعيين');
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = (data: any) => {
    const role = data?.user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      // Generic message — never reveal that a privileged area exists
      setError('بيانات الدخول غير صحيحة');
      return;
    }
    localStorage.setItem('admin_token', data?.token?.accessToken || data?.token || '');
    localStorage.setItem('admin_refresh_token', data?.token?.refreshToken || '');
    localStorage.setItem('admin_role', role);
    localStorage.setItem('admin_user', JSON.stringify(data?.user || {}));
    router.push('/admin/dashboard');
  };

  return (
    <>
      <Head>
        <title>نبض — تسجيل دخول</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div dir="rtl" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(70% 50% at 80% 10%, rgba(25,195,214,0.12), transparent 60%), radial-gradient(50% 40% at 15% 85%, rgba(109,93,246,0.12), transparent 60%), #0A0E1A',
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
      }}>
        <div style={{
          width: '100%', maxWidth: 420, borderRadius: 24, padding: 36,
          background: 'linear-gradient(165deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <svg width="52" height="52" viewBox="0 0 40 40" fill="none" style={{ margin: '0 auto 14px' }}>
              <circle cx="20" cy="20" r="18" stroke="#19C3D6" strokeWidth="2.5" opacity="0.35" />
              <path d="M8 20 h6 l3 -7 4 13 3 -6 h8" stroke="#19C3D6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#EAF2F6', letterSpacing: 0.5 }}>نبض</h1>
            <p style={{ color: '#93A5B3', marginTop: 6, fontSize: 15 }}>تسجيل دخول</p>
          </div>

          {error && (
            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 12,
              background: 'rgba(240,86,122,0.1)', border: '1px solid rgba(240,86,122,0.35)',
              color: '#F0567A', fontSize: 14, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {info && (
            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 12,
              background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.35)',
              color: '#2ECC71', fontSize: 14, textAlign: 'center',
            }}>
              {info}
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#93A5B3', marginBottom: 8 }}>رقم الجوال أو البريد الإلكتروني</label>
                <input
                  type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required dir="ltr"
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)', color: '#EAF2F6', fontSize: 15, outline: 'none',
                  }}
                  placeholder="+9665XXXXXXXX"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#93A5B3', marginBottom: 8 }}>كلمة المرور</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)', color: '#EAF2F6', fontSize: 15, outline: 'none',
                  }}
                  placeholder="••••••••••••"
                />
              </div>
              <button
                type="submit" disabled={loading}
                style={{
                  padding: '15px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #19C3D6, #0E8FA3)', color: '#04121a',
                  fontWeight: 800, fontSize: 16, opacity: loading ? 0.6 : 1,
                  boxShadow: '0 10px 30px rgba(25,195,214,0.3)',
                }}
              >
                {loading ? 'جاري التحقق...' : 'تسجيل دخول'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('reset-request'); setError(''); setInfo(''); }}
                style={{ background: 'none', border: 'none', color: '#93A5B3', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
              >
                نسيت كلمة المرور؟
              </button>
            </form>
          ) : step === 'reset-request' ? (
            <form onSubmit={handleResetRequest} style={{ display: 'grid', gap: 18 }}>
              <p style={{ color: '#93A5B3', fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>
                أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق لإعادة تعيين كلمة المرور:
              </p>
              <input
                type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required dir="ltr"
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)', color: '#EAF2F6', fontSize: 15, outline: 'none',
                }}
                placeholder="name@example.com"
              />
              <button
                type="submit" disabled={loading}
                style={{
                  padding: '15px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #19C3D6, #0E8FA3)', color: '#04121a',
                  fontWeight: 800, fontSize: 16, opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
              <button
                type="button" onClick={() => { setStep('credentials'); setError(''); setInfo(''); }}
                style={{ background: 'none', border: 'none', color: '#93A5B3', fontSize: 14, cursor: 'pointer' }}
              >
                ← رجوع
              </button>
            </form>
          ) : step === 'reset-confirm' ? (
            <form onSubmit={handleResetConfirm} style={{ display: 'grid', gap: 18 }}>
              <p style={{ color: '#93A5B3', fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>
                أدخل رمز التحقق المرسل إلى بريدك ثم كلمة المرور الجديدة:
              </p>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} required dir="ltr"
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)', color: '#EAF2F6', fontSize: 22, textAlign: 'center',
                  letterSpacing: '0.5em', outline: 'none',
                }}
                placeholder="——————"
              />
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)', color: '#EAF2F6', fontSize: 15, outline: 'none',
                }}
                placeholder="كلمة المرور الجديدة (8 أحرف فأكثر)"
              />
              <button
                type="submit" disabled={loading || resetCode.length !== 6 || newPassword.length < 8}
                style={{
                  padding: '15px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #19C3D6, #0E8FA3)', color: '#04121a',
                  fontWeight: 800, fontSize: 16,
                  opacity: (loading || resetCode.length !== 6 || newPassword.length < 8) ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري التعيين...' : 'تعيين كلمة المرور'}
              </button>
              <button
                type="button" onClick={() => { setStep('credentials'); setError(''); setInfo(''); }}
                style={{ background: 'none', border: 'none', color: '#93A5B3', fontSize: 14, cursor: 'pointer' }}
              >
                ← رجوع
              </button>
            </form>
          ) : step === 'passkey' ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <p style={{ color: '#93A5B3', fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>
                كلمة المرور صحيحة. أكّد هويتك بمفتاح الأمان (بصمة الوجه / الإصبع) لإتمام الدخول.
              </p>
              <div style={{ textAlign: 'center', fontSize: 42 }}>🔐</div>
              <button
                type="button" onClick={handlePasskey} disabled={loading}
                style={{
                  padding: '15px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #19C3D6, #0E8FA3)', color: '#04121a',
                  fontWeight: 800, fontSize: 16, opacity: loading ? 0.6 : 1,
                  boxShadow: '0 10px 30px rgba(25,195,214,0.3)',
                }}
              >
                {loading ? 'بانتظار البصمة...' : 'تأكيد بمفتاح الأمان (Face ID / Touch ID)'}
              </button>
              <p style={{ color: '#6B7C8A', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
                من جهاز لا يحمل المفتاح؟ اختر «استخدام هاتف أو جهاز لوحي» في نافذة المتصفح وامسح رمز QR بكاميرا جهازك المسجّل.
              </p>
              <button
                type="button" onClick={() => { setStep('credentials'); setPasskeyOptions(null); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#93A5B3', fontSize: 14, cursor: 'pointer' }}
              >
                ← رجوع
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'grid', gap: 18 }}>
              <p style={{ color: '#93A5B3', fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>
                أدخل رمز التحقق المرسل إليك (6 أرقام):
              </p>
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required dir="ltr"
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)', color: '#EAF2F6', fontSize: 26, textAlign: 'center',
                  letterSpacing: '0.5em', outline: 'none',
                }}
                placeholder="——————"
              />
              <button
                type="submit" disabled={loading || otp.length !== 6}
                style={{
                  padding: '15px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #19C3D6, #0E8FA3)', color: '#04121a',
                  fontWeight: 800, fontSize: 16, opacity: (loading || otp.length !== 6) ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري التحقق...' : 'تأكيد'}
              </button>
              <button
                type="button" onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#93A5B3', fontSize: 14, cursor: 'pointer' }}
              >
                ← رجوع
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
