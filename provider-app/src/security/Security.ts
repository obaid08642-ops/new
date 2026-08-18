/**
 * NABDAH PLUS — Security Layer
 * AES-256 SecureStore · JWT · Biometric · Input Validation · Rate Limiting
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuth from 'expo-local-authentication';
import { Platform } from 'react-native';

// ─── Secure Key Names ─────────────────────────────────────────────────────────
export const SK = {
 ACCESS: 'np_access_token',
 REFRESH: 'np_refresh_token',
 SESSION_ID: 'np_session_id',
 PROVIDER_ID: 'np_provider_id',
 PROVIDER_TYPE: 'np_provider_type',
 BIOENABLED: 'np_biometric_on',
 DEVICE_ID: 'np_device_id',
 REMEMBER: 'np_remember',
 CUSTOM_API_IP: 'np_custom_api_ip',
} as const;

// ─── SecureStore Wrapper ──────────────────────────────────────────────────────
 export const Vault = {
  async set(key: string, value: any): Promise<boolean> {
  try {
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);
  if (strValue === undefined || strValue === null) return false;
  await SecureStore.setItemAsync(key, strValue, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  return true;
 } catch (e) {
 if (__DEV__) console.warn('[Vault.set]', key, e);
 return false;
 }
 },

 async get(key: string): Promise<string | null> {
 try {
 return await SecureStore.getItemAsync(key);
 } catch (e) {
 if (__DEV__) console.warn('[Vault.get]', key, e);
 return null;
 }
 },

 async del(key: string): Promise<void> {
 try { await SecureStore.deleteItemAsync(key); } catch {}
 },

 async clearAll(): Promise<void> {
 await Promise.all(Object.values(SK).map(k => Vault.del(k)));
 },
};

// ─── Token Management ─────────────────────────────────────────────────────────
export const Tokens = {
 async save(access: string, refresh: string, session_id: string, provider_id: string, provider_type: string) {
  await Promise.all([
    Vault.set(SK.ACCESS, access), 
    Vault.set(SK.REFRESH, refresh),
    Vault.set(SK.SESSION_ID, session_id),
    Vault.set(SK.PROVIDER_ID, provider_id),
    Vault.set(SK.PROVIDER_TYPE, provider_type)
  ]);
 },
 async getAccess() { return Vault.get(SK.ACCESS); },
 async getRefresh() { return Vault.get(SK.REFRESH); },
 async getSessionId() { return Vault.get(SK.SESSION_ID); },
 async getProviderType() { return Vault.get(SK.PROVIDER_TYPE); },
 async clear() { 
   await Promise.all([
     Vault.del(SK.ACCESS), 
     Vault.del(SK.REFRESH),
     Vault.del(SK.SESSION_ID),
     Vault.del(SK.PROVIDER_ID),
     Vault.del(SK.PROVIDER_TYPE)
   ]); 
 },

 parse(token: string): { exp?: number; sub?: string; role?: string } | null {
  try {
  const p = token.split('.');
  if (p.length !== 3) return null;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = String(p[1]).replace(/=+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer, i = 0;
    buffer = str.charAt(i++);
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    buffer = chars.indexOf(buffer);
  }
  return JSON.parse(output);
  } catch (e) { return null; }
  },

 isExpired(token: string): boolean {
 const p = Tokens.parse(token);
 if (!p?.exp) return true;
 return Date.now() >= p.exp * 1000;
 },
};

// ─── Device Identity ──────────────────────────────────────────────────────────
export const DeviceId = {
 async get(): Promise<string> {
 let id = await Vault.get(SK.DEVICE_ID);
 if (!id) {
 const bytes = await Crypto.getRandomBytesAsync(16);
 id = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
 await Vault.set(SK.DEVICE_ID, id);
 }
 return id;
 },
};

// ─── Crypto Utilities ─────────────────────────────────────────────────────────
export const CryptoUtils = {
 async sha256(input: string): Promise<string> {
 return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
 },

 async hashPassword(pass: string, salt?: string): Promise<{ hash: string; salt: string }> {
 const s = salt ?? (await Crypto.getRandomBytesAsync(16)
 .then(b => Array.from(b).map(x => x.toString(16).padStart(2,'0')).join('')));
 const hash = await CryptoUtils.sha256(`${s}:${pass}:nabdah_v1_salt`);
 return { hash, salt: s };
 },

 async verifyPassword(pass: string, hash: string, salt: string): Promise<boolean> {
 const { hash: h2 } = await CryptoUtils.hashPassword(pass, salt);
 return h2 === hash;
 },

 async randomHex(bytes = 16): Promise<string> {
 const b = await Crypto.getRandomBytesAsync(bytes);
 return Array.from(b).map(x => x.toString(16).padStart(2,'0')).join('');
 },
};

// ─── Biometric Authentication ──────────────────────────────────────────────────
export const Biometric = {
  async isAvailable(): Promise<boolean> {
    try {
      const hw = await LocalAuth.hasHardwareAsync();
      const en = await LocalAuth.isEnrolledAsync();
      // In dev/Expo Go, hardware may report false on simulator — still show button
      if (__DEV__) return true;
      return hw && en;
    } catch {
      return __DEV__; // show in dev even if check fails
    }
  },

  async getType(): Promise<'face' | 'fingerprint' | 'none'> {
    try {
      const types = await LocalAuth.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
      if (types.includes(LocalAuth.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    } catch {}
    return 'none';
  },

  async authenticate(reason = 'تحقق من هويتك'): Promise<{ success: boolean; error?: string }> {
    try {
      const hw = await LocalAuth.hasHardwareAsync();
      const en = await LocalAuth.isEnrolledAsync();

      if (!hw || !en) {
        return { success: false, error: 'البصمة غير متاحة على هذا الجهاز' };
      }

      const r = await LocalAuth.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'إلغاء', // Don't prompt for password
        cancelLabel: 'إلغاء',
        disableDeviceFallback: true, // DO NOT allow PIN fallback, enforce biometrics
      });
      
      return { success: r.success, error: 'error' in r ? (r as any).error : undefined };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Unknown error' };
    }
  },
};

// ─── Input Sanitization & Validation ─────────────────────────────────────────
export const Validate = {
 email(v: string): boolean {
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
 },

 phone(v: string): boolean {
 const c = v.replace(/\D/g, '');
 return /^(05\d{8}|5\d{8})$/.test(c);
 },

 formatPhone(v: string): string {
 const c = v.replace(/\D/g, '');
 if (c.startsWith('966')) return `+${c}`;
 if (c.startsWith('05')) return `+966${c.slice(1)}`;
 if (c.startsWith('5')) return `+966${c}`;
 return `+966${c}`;
 },

 iban(v: string): boolean {
 const c = v.replace(/\s/g, '').toUpperCase();
 if (!c.startsWith('SA') || c.length !== 24) return false;
 const digits = (c.slice(4) + c.slice(0,4)).split('').reduce((acc, ch) => {
 return acc + (ch.match(/[A-Z]/) ? (ch.charCodeAt(0) - 55).toString() : ch);
 }, '');
 let rem = 0;
 for (const ch of digits) rem = (rem * 10 + parseInt(ch)) % 97;
 return rem === 1;
 },

 cr(v: string): boolean {
 return /^\d{10}$/.test(v.trim());
 },

 scfhs(v: string): boolean {
 return /^\d{6,8}$/.test(v.trim());
 },

 otp(v: string): boolean {
 return /^\d{6}$/.test(v);
 },

 password(v: string): { score: number; valid: boolean; msgAr: string; msgEn: string } {
 const checks = [/.{8,}/, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/];
 const score = checks.filter(r => r.test(v)).length;
 const valid = score >= 3 && v.length >= 8;
 const ar = ['ضعيفة جداً','ضعيفة','متوسطة','جيدة','قوية'];
 const en = ['Very Weak','Weak','Fair','Good','Strong'];
 return { score, valid, msgAr: ar[score-1]??ar[0], msgEn: en[score-1]??en[0] };
 },

 // Strip XSS / injection
 sanitize(v: string): string {
 return v.replace(/<[^>]*>/g,'').replace(/['"`;\\]/g,'').trim().slice(0,1000);
 },

 searchQuery(v: string): string {
 return v.replace(/[<>"'`{}|\\^~\[\]]/g,'').trim().slice(0,100);
 },
};

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
class RateLimiterClass {
 private store = new Map<string, { count: number; resetAt: number }>();

 check(key: string, max = 5, windowMs = 15 * 60 * 1000): boolean {
 const now = Date.now();
 const rec = this.store.get(key);
 if (!rec || now > rec.resetAt) {
 this.store.set(key, { count: 1, resetAt: now + windowMs });
 return true;
 }
 if (rec.count >= max) return false;
 rec.count++;
 return true;
 }

 remaining(key: string): number {
 const rec = this.store.get(key);
 if (!rec) return 0;
 return Math.max(0, rec.resetAt - Date.now());
 }

 reset(key: string) { this.store.delete(key); }
}
export const RateLimiter = new RateLimiterClass();

// ─── Session Manager ──────────────────────────────────────────────────────────
class SessionManagerClass {
 private timer: ReturnType<typeof setTimeout> | null = null;
 readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 min

 start(onExpiry: () => void) { this.reset(onExpiry); }

 reset(onExpiry: () => void) {
 if (this.timer) clearTimeout(this.timer);
 this.timer = setTimeout(onExpiry, this.TIMEOUT_MS);
 }

 stop() {
 if (this.timer) { clearTimeout(this.timer); this.timer = null; }
 }
}
export const SessionMgr = new SessionManagerClass();

// ─── Secure API Headers ───────────────────────────────────────────────────────
export async function buildHeaders(auth = true): Promise<Record<string,string>> {
 const deviceId = await DeviceId.get();
 const reqId = await CryptoUtils.randomHex(8);
 const headers: Record<string,string> = {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'X-App-Version': '1.0.0',
 'X-Platform': Platform.OS,
 'X-Device-ID': deviceId,
 'X-Request-ID': reqId,
 };
 if (auth) {
 const token = await Tokens.getAccess();
 if (token) headers['Authorization'] = `Bearer ${token}`;
 }
 return headers;
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────
type AuditAction = 'login'|'logout'|'login_fail'|'biometric'|'pass_change'|
 'toggle_online'|'withdraw_request'|'doc_upload'|'settings_change'|'biometric_login'|'biometric_enabled';

const _log: Array<{ action: AuditAction; ok: boolean; ts: number; meta?: object }> = [];

export const Audit = {
  log(action: AuditAction, ok: boolean, meta?: object) {
    _log.push({ action, ok, ts: Date.now(), meta });
    // Audit logs stored in memory only — no console output in any environment
  },
  getLog() { return [..._log]; },
  clear() { _log.length = 0; },
};
