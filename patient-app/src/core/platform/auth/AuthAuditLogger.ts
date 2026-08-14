import { logger } from '../../../services/Logger';
import { AuditManager } from '../../events/AuditManager';

export class AuthAuditLogger {
  private log = logger.scope('AuthAuditLogger');

  constructor(private auditManager: AuditManager) {}

  public async logLoginSuccess(userId: string, deviceId: string, sessionId: string, method: string): Promise<void> {
    this.log.info(`Logging successful login for user ${userId}`);
    this.auditManager.logAction('USER_LOGIN', userId, {
      deviceId,
      sessionId,
      method,
      ipAddress: 'IP_PLACEHOLDER', // To be populated by backend or networking layer
      timestamp: new Date().toISOString()
    });
  }

  public async logLoginFailed(identifier: string, deviceId: string, reason: string, method: string): Promise<void> {
    this.log.warn(`Logging failed login for ${identifier}: ${reason}`);
    this.auditManager.logAction('LOGIN_FAILED', 'UNKNOWN', {
      deviceId,
      identifier,
      reason,
      method,
      ipAddress: 'IP_PLACEHOLDER',
      timestamp: new Date().toISOString()
    });
  }

  public async logLogout(userId: string, deviceId: string, sessionId: string, reason: string): Promise<void> {
    this.log.info(`Logging logout for user ${userId}. Reason: ${reason}`);
    this.auditManager.logAction('USER_LOGOUT', userId, {
      deviceId,
      sessionId,
      reason,
      ipAddress: 'IP_PLACEHOLDER',
      timestamp: new Date().toISOString()
    });
  }
}
