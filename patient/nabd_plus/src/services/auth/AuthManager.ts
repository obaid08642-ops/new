import { AuthProvider, AuthResult, AuthUser } from './types';
import { secureSet, secureGet, secureDelete, logAuditEvent } from '../../utils/security';
import { logger } from '../Logger';

const AUTH_SESSION_KEY = 'app_auth_session';
const AUTH_USER_KEY = 'app_auth_user';

export class AuthManager {
  private static instance: AuthManager;
  private providers: Map<string, AuthProvider> = new Map();
  private currentUser: AuthUser | null = null;
  private log = logger.scope('AuthManager');

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  public registerProvider(provider: AuthProvider): void {
    this.providers.set(provider.id, provider);
    if (provider.initialize) {
      provider.initialize().catch(err => {
        this.log.error(`Failed to initialize provider ${provider.id}`, err);
      });
    }
  }

  public async initialize(): Promise<void> {
    try {
      const userStr = await secureGet(AUTH_USER_KEY);
      if (userStr) {
        this.currentUser = JSON.parse(userStr) as AuthUser;
        this.log.info('Restored user session', { userId: this.currentUser.id });
      }
    } catch (err) {
      this.log.error('Failed to restore session', err);
    }
  }

  public async loginWithProvider(providerId: string, credentials?: any): Promise<AuthResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Auth provider ${providerId} not found`);
    }

    try {
      this.log.info(`Attempting login with ${providerId}`);
      const result = await provider.login(credentials);
      
      await this.setSession(result);
      
      logAuditEvent('LOGIN_SUCCESS', { provider: providerId, userId: result.user.id });
      return result;
    } catch (err) {
      logAuditEvent('LOGIN_FAILED', { provider: providerId, error: (err as Error).message });
      throw err;
    }
  }

  public async logout(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Attempt to logout from all providers
    for (const provider of this.providers.values()) {
      promises.push(
        provider.logout().catch(err => {
          this.log.error(`Failed to logout from provider ${provider.id}`, err);
        })
      );
    }
    
    await Promise.all(promises);
    await this.clearSession();
    logAuditEvent('LOGOUT', { userId: this.currentUser?.id ?? 'unknown' });
  }

  private async setSession(result: AuthResult): Promise<void> {
    this.currentUser = result.user;
    await secureSet(AUTH_USER_KEY, JSON.stringify(result.user));
    await secureSet(AUTH_SESSION_KEY, JSON.stringify(result.session));
  }

  private async clearSession(): Promise<void> {
    this.currentUser = null;
    await secureDelete(AUTH_USER_KEY);
    await secureDelete(AUTH_SESSION_KEY);
  }

  public getUser(): AuthUser | null {
    return this.currentUser;
  }
  
  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

export const authManager = AuthManager.getInstance();
