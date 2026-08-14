import client from './client';
import { Tokens } from '../security/Security';
import * as FileSystem from 'expo-file-system/legacy';

export const ProviderApi = {
  /** Step 1: Start onboarding flow. Creates user & provider profile. */
  async start(payload: { phone: string; password?: string; full_name?: string; email?: string; type: string }) {
    const res = await client.post('/provider-onboarding/start', payload);
    return res.data;
  },

  /** Step 1.5: Login to obtain JWT token for subsequent steps */
  async login(email: string, password?: string) {
    const res = await client.post('/provider/auth/login', { email, password });
    if (res.data && (res.data.token || res.data.access_token)) {
      await Tokens.save(
        res.data.token || res.data.access_token, 
        res.data.refresh_token || '', 
        res.data.session_id || '', 
        res.data.provider_id || res.data.user?.id || '', 
        res.data.provider_type || res.data.user?.role || 'doctor'
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
        original_name: originalName,
        visibility: 'private'
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
      original_name: 'signature.png',
      visibility: 'private'
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
