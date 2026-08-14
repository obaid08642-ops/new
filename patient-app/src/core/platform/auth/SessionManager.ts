import { logger } from '../../../services/Logger';
import { SecureStorageService } from './SecureStorageService';

export interface SessionData {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  sessionVersion: number;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

export class SessionManager {
  private log = logger.scope('SessionManager');
  private currentSession: SessionData | null = null;
  private refreshPromise: Promise<SessionData> | null = null;
  private readonly ABSOLUTE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

  private readonly SESSION_KEY = 'NABD_ACTIVE_SESSION';

  constructor(private secureStorage: SecureStorageService) {}

  public async createSession(data: SessionData): Promise<void> {
    this.currentSession = data;
    this.log.info(`Session created for user ${data.userId} on device ${data.deviceId}`);
    await this.secureStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
  }

  public async getSession(): Promise<SessionData | null> {
    if (this.currentSession) return this.currentSession;
    const stored = await this.secureStorage.getItem(this.SESSION_KEY);
    if (stored) {
      this.currentSession = JSON.parse(stored) as SessionData;
      // Re-hydrate dates
      this.currentSession.expiresAt = new Date(this.currentSession.expiresAt);
      this.currentSession.absoluteExpiresAt = new Date(this.currentSession.absoluteExpiresAt);
      return this.currentSession;
    }
    return null;
  }

  /**
   * Refresh token rotation logic.
   * Revokes the old refresh token and issues a new pair.
   * Utilizes a refresh queue to prevent concurrent refresh requests.
   */
  public async rotateTokens(oldRefreshToken: string): Promise<SessionData> {
    if (this.refreshPromise) {
      this.log.debug('Token refresh already in progress. Waiting for queue...');
      return this.refreshPromise;
    }

    this.refreshPromise = this._rotateTokensCore(oldRefreshToken);
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _rotateTokensCore(oldRefreshToken: string): Promise<SessionData> {
    this.log.info('Rotating session tokens');
    if (!this.currentSession) throw new Error('No active session to rotate');
    
    if (Date.now() > this.currentSession.absoluteExpiresAt.getTime()) {
      this.log.warn('Absolute session lifetime expired. Forcing logout.');
      await this.revokeSession();
      throw new Error('Absolute session expired');
    }
    
    // API Call to rotate tokens (Placeholder for Phase 1C-C/Phase 3)
    const newSession = {
      ...this.currentSession,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(Date.now() + 3600000), // +1 hour
    };
    
    await this.createSession(newSession); // Will update memory & SecureStorage
    return newSession;
  }

  /**
   * Remotely check if session version is still valid.
   * (Allows invalidating all sessions across devices by bumping version on backend)
   */
  public async validateSessionVersion(latestBackendVersion: number): Promise<boolean> {
    if (!this.currentSession) return false;
    if (this.currentSession.sessionVersion < latestBackendVersion) {
      this.log.warn('Session version outdated. Force invalidating session.');
      await this.revokeSession();
      return false;
    }
    return true;
  }

  /**
   * Forced Logout triggered remotely by an admin action.
   */
  public async forceLogoutFromAdmin(reason: string): Promise<void> {
    this.log.warn(`Forced logout from Admin. Reason: ${reason}`);
    await this.revokeSession();
  }

  /**
   * Revoke current session (Logout)
   */
  public async revokeSession(): Promise<void> {
    this.log.info('Revoking session');
    this.currentSession = null;
    await this.secureStorage.deleteItem(this.SESSION_KEY);
  }
}
