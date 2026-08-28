import { AuthProvider, AuthResult } from '../types';
import { httpRequest } from '../../HttpClient';

export class EmailAuthProvider implements AuthProvider {
  id = 'email';
  name = 'Email & Password';

  async login(credentials: { email?: string; phone?: string; password?: string }): Promise<AuthResult> {
    // Phase 1C: Real backend authentication
    const response = await httpRequest({
      url: '/auth/login',
      method: 'POST',
      data: credentials,
    });

    const data = response.data.data || response.data; // Depending on wrapping

    if (!data.access_token) {
      throw new Error('Invalid credentials');
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name || 'Validated User',
        role: data.user.role || 'patient',
      },
      session: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      }
    };
  }

  async logout(): Promise<void> {
    try {
      await httpRequest({
        url: '/auth/logout',
        method: 'POST',
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }
}
