import { logger } from '../../services/Logger';

export type AuditAction = 
  | 'USER_LOGIN'
  | 'LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'PROFILE_UPDATED'
  | 'PRESCRIPTION_ISSUED'
  | 'PAYMENT_PROCESSED'
  | 'ORDER_PLACED'
  | 'ROLE_CHANGED'
  | 'SECURITY_SETTINGS_CHANGED';

export interface AuditRecord {
  id: string;
  action: AuditAction;
  userId: string;
  targetId?: string; // Entity that was acted upon (e.g. orderId)
  timestamp: Date;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export class AuditManager {
  private log = logger.scope('AuditManager');
  private auditQueue: AuditRecord[] = [];

  /**
   * Log an action to the audit trail
   */
  public logAction(action: AuditAction, userId: string, metadata?: Record<string, any>, targetId?: string): void {
    const record: AuditRecord = {
      id: Math.random().toString(36).substring(7),
      action,
      userId,
      targetId,
      timestamp: new Date(),
      metadata,
    };

    this.auditQueue.push(record);
    this.log.info(`Audit Event: ${action}`, { userId, targetId });

    // Periodically flush this queue to the backend
    this.flushIfNeeded();
  }

  private flushIfNeeded(): void {
    if (this.auditQueue.length >= 10) {
      this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.auditQueue.length === 0) return;

    const recordsToSend = [...this.auditQueue];
    this.auditQueue = [];

    try {
      // In Phase 1C, send to API:
      // await http.post('/audit/batch', { records: recordsToSend });
      this.log.debug(`Flushed ${recordsToSend.length} audit records to server`);
    } catch (e) {
      this.log.error('Failed to flush audit records, returning to queue', e);
      // Re-queue on failure
      this.auditQueue = [...recordsToSend, ...this.auditQueue];
    }
  }
}
