import client from './client';
import { Tokens } from '../security/Security';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Strip secrets and device-local file URIs from the wizard data object before
 * it is snapshotted to the backend. The backend stores this as the raw
 * registration record so the admin review shows EVERY typed field.
 */
export function sanitizeWizardData(data: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (/pass|secret|token|signatureData/i.test(k)) continue;
    if (typeof v === 'string' && /^(file|content):\/\//.test(v)) continue;
    if (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && /^(file|content):\/\//.test(x))) continue;
    out[k] = v;
  }
  return out;
}

export const ProviderApi = {
  /** Step 1: Start onboarding flow. Creates user & provider profile. */
  async start(payload: { phone: string; password?: string; full_name?: string; email?: string; type: string }) {
    const res = await client.post('/provider-onboarding/start', payload);
    return res.data;
  },

  /** Step 1.5 (registration wizard): sign in as the onboarding identity that /provider-onboarding/start
   * just created (users row, role guest, onboarding_only). The wizard endpoints (step2/step3/submit,
   * storage upload) run on that identity; a provider account only exists after submit + admin review,
   * so /provider/auth/login cannot work during registration. */
  async onboardingLogin(email: string, password: string, providerType: string) {
    const res = await client.post('/auth/login', { identifier: (email || '').trim().toLowerCase(), password });
    const t = res.data?.token;
    const accessToken = typeof t === 'string' ? t : (t?.accessToken || '');
    const refreshToken = typeof t === 'object' && t ? (t.refreshToken || '') : '';
    if (!accessToken) throw new Error('onboarding_login_failed');
    await Tokens.save(accessToken, refreshToken, '', res.data?.user?.id || '', providerType);
    return res.data;
  },

  /** Provider sign-in (approved provider account).
   * F11: provider onboarding uses the PROVIDER login (role-scoped token),
   * never the patient /auth/login (which yields a guest-role token that can
   * never reach provider operations). The provider endpoint answers a flat
   * { access_token, refresh_token, session_id, provider_id, provider_type }.
   */
  async login(email: string, password?: string) {
    const res = await client.post('/provider/auth/login', { email, password });
    const accessToken = res.data?.access_token || '';
    const refreshToken = res.data?.refresh_token || '';
    if (accessToken) {
      await Tokens.save(
        accessToken,
        refreshToken,
        res.data.session_id || '',
        res.data.provider_id || '',
        res.data.provider_type || 'doctor'
      );
    }
    return res.data;
  },

  /** P3.0b: change password (verified and stored on the linked users row).
   * The server ends every other session and returns a fresh provider session
   * for this device — store it, or the next request 401s. */
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await client.post('/provider/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (res.data?.access_token) {
      await Tokens.save(
        res.data.access_token,
        res.data.refresh_token || '',
        res.data.session_id || '',
        res.data.provider_id || '',
        res.data.provider_type || 'doctor'
      );
    }
    return res.data;
  },

  /** Utility: Convert local URI to base64 and upload to Storage service */
  async uploadFile(uri: string, mimeType: string, originalName: string = 'file') {
    try {
      let base64 = uri;
      if (uri.startsWith('file://') || uri.startsWith('content://')) {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      } else if (uri.startsWith('data:')) {
        base64 = uri.split(',')[1];
      }

      const res = await client.post('/storage/upload', {
        data_base64: base64,
        mime: mimeType,
        original_name: originalName
      });
      return res.data?.id || res.data?.url || res.data;
    } catch (e) {
      throw e; // Re-throw so callers can handle upload errors
    }
  },

  /** Utility: Upload base64 signature directly */
  async uploadSignature(base64Image: string) {
    const cleanBase64 = base64Image.startsWith('data:') ? base64Image.split(',')[1] : base64Image;
    const res = await client.post('/storage/upload', {
      data_base64: cleanBase64,
      mime: 'image/png',
      original_name: 'signature.png'
    });
    return res.data?.id || res.data?.url || res.data;
  },

  /** Step 2: KYC & Document Info */
  async step2(payload: any) {
    const res = await client.post('/provider-onboarding/step2', payload);
    return res.data;
  },

  /** Step 3: Type-specific Capabilities (Services, Schedule) */
  async step3(payload: any) {
    const res = await client.post('/provider-onboarding/step3', payload);
    return res.data;
  },

  /** Final Step: Submit for Admin Review */
  async submit(payload?: any) {
    const res = await client.post('/provider-onboarding/submit', payload || {});
    return res.data;
  }
};
