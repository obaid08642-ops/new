import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { startRegistration } from '@simplewebauthn/browser';
import { apiFetch } from '../../utils/api';

interface PasskeyDevice {
  credential_id: string;
  device_name: string;
  created_at?: string;
  last_used_at?: string;
}

/**
 * Admin security settings — enroll/manage Passkey (WebAuthn) devices for the
 * designated admin account. Enrollment is server-gated: only the designated
 * admin email with role admin/super_admin can call these endpoints.
 * Cross-device enrollment (old Mac ↔ iPhone) works via the browser's QR /
 * hybrid transport: choose "Use a phone or tablet" in the WebAuthn prompt.
 */
export default function AdminSecurity() {
  const [devices, setDevices] = useState<PasskeyDevice[]>([]);
  const [boundDevices, setBoundDevices] = useState<any[]>([]);
  const [deviceLock, setDeviceLock] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await apiFetch('/auth/passkey/devices');
      setDevices(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setMessage({ type: 'err', text: 'تعذر تحميل الأجهزة المسجلة' });
    }
    try {
      const bound: any = await apiFetch('/admin/devices');
      setBoundDevices(Array.isArray(bound) ? bound : []);
      const me: any = await apiFetch('/auth/me').catch(() => null);
      setDeviceLock(me?.device_lock_enabled === true);
    } catch { /* device binding optional */ }
    finally {
      setLoading(false);
    }
  };

  const toggleLock = async (enabled: boolean) => {
    if (enabled && !window.confirm('سيُقفل الدخول للإدارة على هذا المتصفح فقط (مربوط بالجهاز لا بالإنترنت — تغيير الـ IP لا يؤثر). متابعة؟')) return;
    setBusy(true);
    try {
      const r: any = await apiFetch('/admin/devices/lock', { method: 'POST', body: JSON.stringify({ enabled }) });
      setDeviceLock(r?.device_lock_enabled === enabled ? enabled : null);
      setMessage({ type: 'ok', text: enabled ? 'تم تفعيل القفل — هذا المتصفح مسجل تلقائياً.' : 'تم إيقاف القفل.' });
      await load();
    } catch (e: any) {
      setMessage({ type: 'err', text: 'تعذر تغيير القفل' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const enroll = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const options = await apiFetch('/auth/passkey/enroll/options', { method: 'POST' });
      // Opens Face ID / Touch ID / passcode — or QR for cross-device enrollment
      const attestation = await startRegistration({ optionsJSON: options });
      await apiFetch('/auth/passkey/enroll/verify', {
        method: 'POST',
        body: JSON.stringify({ response: attestation, device_name: deviceName.trim() || 'جهاز جديد' }),
      });
      setMessage({ type: 'ok', text: 'تم تسجيل الجهاز بنجاح — سيُطلب مفتاح الأمان عند كل دخول من الآن.' });
      setDeviceName('');
      await load();
    } catch (e: any) {
      setMessage({
        type: 'err',
        text: e?.name === 'NotAllowedError' ? 'تم إلغاء التسجيل أو انتهت المهلة' : 'فشل تسجيل الجهاز',
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (credentialId: string) => {
    if (!window.confirm('حذف هذا المفتاح؟ لن يتمكن هذا الجهاز من الدخول بعد الآن.')) return;
    setBusy(true);
    try {
      await apiFetch(`/auth/passkey/devices/${encodeURIComponent(credentialId)}`, { method: 'DELETE' });
      setMessage({ type: 'ok', text: 'تم حذف المفتاح.' });
      await load();
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message?.includes('last') ? 'لا يمكن حذف آخر مفتاح — سجّل جهازاً آخر أولاً.' : 'تعذر حذف المفتاح' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head><title>الأمان ومفاتيح الدخول</title></Head>
      <div dir="rtl" style={{ padding: 24, maxWidth: 720, margin: '0 auto', color: '#EAF2F6' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>الأمان — مفاتيح الدخول (Passkey)</h1>
        <p style={{ color: '#93A5B3', fontSize: 14, lineHeight: 1.9, marginBottom: 24 }}>
          المصادقة الثنائية الإجبارية للوحة التحكم: كلمة المرور ثم تأكيد بالبصمة (Face ID / Touch ID / رمز القفل).
          سجّل أجهزتك المصرّح لها هنا. لجهاز لا يحمل بصمة (مثل Mac قديم): اختر «استخدام هاتف أو جهاز لوحي»
          في نافذة التسجيل وامسح رمز QR بكاميرا الآيفون ثم أكّد بالـ Face ID.
        </p>

        {message && (
          <div style={{
            marginBottom: 16, padding: 12, borderRadius: 12, fontSize: 14, textAlign: 'center',
            background: message.type === 'ok' ? 'rgba(46,204,113,0.1)' : 'rgba(240,86,122,0.1)',
            border: `1px solid ${message.type === 'ok' ? 'rgba(46,204,113,0.35)' : 'rgba(240,86,122,0.35)'}`,
            color: message.type === 'ok' ? '#2ECC71' : '#F0567A',
          }}>
            {message.text}
          </div>
        )}

        <div style={{
          borderRadius: 16, padding: 20, marginBottom: 24,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>تسجيل جهاز جديد</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
              placeholder="اسم الجهاز (مثال: iPhone 15 / MacBook)"
              style={{
                flex: 1, minWidth: 220, padding: '12px 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
                color: '#EAF2F6', fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={enroll} disabled={busy}
              style={{
                padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #19C3D6, #0E8FA3)', color: '#04121a',
                fontWeight: 800, fontSize: 14, opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'بانتظار البصمة...' : '🔐 تسجيل بمفتاح أمان'}
            </button>
          </div>
        </div>

        <div style={{
          borderRadius: 16, padding: 20,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>الأجهزة المسجلة</h2>
          {loading ? (
            <p style={{ color: '#93A5B3', fontSize: 14 }}>جاري التحميل...</p>
          ) : devices.length === 0 ? (
            <p style={{ color: '#93A5B3', fontSize: 14, lineHeight: 1.8 }}>
              لا توجد أجهزة مسجلة بعد. سجّل جهازك الأول — بعدها يصبح مفتاح الأمان إجبارياً عند كل تسجيل دخول.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {devices.map((d) => (
                <div key={d.credential_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.device_name || 'جهاز'}</div>
                    <div style={{ color: '#6B7C8A', fontSize: 12, marginTop: 4 }}>
                      سُجّل: {d.created_at ? new Date(d.created_at).toLocaleString('ar-u-ca-gregory') : '—'}
                      {' · '}آخر استخدام: {d.last_used_at ? new Date(d.last_used_at).toLocaleString('ar-u-ca-gregory') : '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(d.credential_id)} disabled={busy}
                    style={{
                      padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      border: '1px solid rgba(240,86,122,0.4)', background: 'rgba(240,86,122,0.08)',
                      color: '#F0567A', fontWeight: 700,
                    }}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{
          borderRadius: 16, padding: 20, marginBottom: 24,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>القفل على هذا الجهاز فقط 🔒</h2>
          <p style={{ color: '#93A5B3', fontSize: 13, lineHeight: 1.9, marginBottom: 12 }}>
            مربوط بالمتصفح (بصمة جهاز) لا بعنوان الإنترنت — تغيير الـ IP أو الشبكة لا يؤثر.
            عند التفعيل يُسجَّل هذا المتصفح تلقائياً وأي جهاز آخر يُرفض حتى لو امتلك كلمة المرور.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: deviceLock ? '#2ECC71' : '#93A5B3', fontWeight: 700 }}>
              الحالة: {deviceLock === null ? '…' : deviceLock ? 'مفعّل' : 'معطّل'}
            </span>
            <button
              onClick={() => void toggleLock(!deviceLock)} disabled={busy || deviceLock === null}
              style={{ padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: deviceLock ? 'rgba(240,86,122,0.12)' : 'rgba(46,204,113,0.14)',
                color: deviceLock ? '#F0567A' : '#2ECC71', border: '1px solid currentColor' }}
            >
              {deviceLock ? 'إيقاف القفل' : 'تفعيل القفل على هذا المتصفح'}
            </button>
          </div>
          {boundDevices.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {boundDevices.map((d: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#93A5B3' }}>
                  <span>{d.name || 'متصفح'} · {d.ua || ''}</span>
                  <span>آخر ظهور: {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString('ar-u-ca-gregory') : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
