// ---------------------------------------------------------------------------
// Chat Security Configuration
// Controls session lifecycle, message restrictions, and audit logging.
// ---------------------------------------------------------------------------

export interface ChatSession {
  id: string;
  type: 'doctor' | 'pharmacist';
  patientId: string;
  providerId: string;
  providerName: string;
  startedAt: number;
  expiresAt: number;
  isActive: boolean;
  isReadOnly: boolean;
}

// Session durations by type (in milliseconds)
export const CHAT_DURATIONS = {
  doctor: {
    consultation: 30 * 60 * 1000,   // 30 minutes for standard consultation
    followUp: 15 * 60 * 1000,       // 15 minutes for follow-up
    emergency: 60 * 60 * 1000,      // 1 hour for emergency
  },
  pharmacist: {
    orderChat: 60 * 60 * 1000,      // 1 hour for order-related chat
    prescription: 30 * 60 * 1000,   // 30 minutes for prescription clarification
  },
};

// Grace period after session ends where messages can still be read
export const READ_ONLY_GRACE_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if a chat session allows sending new messages
 */
export function canSendMessage(session: ChatSession): boolean {
  if (!session.isActive) return false;
  if (session.isReadOnly) return false;
  return Date.now() < session.expiresAt;
}

/**
 * Check if a chat session can be read (viewed)
 */
export function canReadChat(session: ChatSession): boolean {
  // Chat history is always readable within the grace period
  return Date.now() < session.expiresAt + READ_ONLY_GRACE_PERIOD;
}

/**
 * Get remaining time in the session (ms)
 */
export function getSessionRemaining(session: ChatSession): number {
  const remaining = session.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format remaining time as MM:SS
 */
export function formatSessionTimer(remainingMs: number): string {
  if (remainingMs <= 0) return '00:00';
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create a new chat session
 */
export function createChatSession(
  id: string,
  type: 'doctor' | 'pharmacist',
  patientId: string,
  providerId: string,
  providerName: string,
  durationMs: number,
): ChatSession {
  const now = Date.now();
  return {
    id,
    type,
    patientId,
    providerId,
    providerName,
    startedAt: now,
    expiresAt: now + durationMs,
    isActive: true,
    isReadOnly: false,
  };
}

/**
 * End a chat session (marks as read-only)
 */
export function endChatSession(session: ChatSession): ChatSession {
  return {
    ...session,
    isActive: false,
    isReadOnly: true,
  };
}

// ---------------------------------------------------------------------------
// Chat Audit Events
// ---------------------------------------------------------------------------

export type ChatAuditEvent =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'SESSION_EXPIRED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'FILE_SHARED'
  | 'PRESCRIPTION_SENT'
  | 'PRICE_CONFIRMED'
  | 'PRICE_REJECTED'
  | 'SESSION_EXTENDED';

export interface ChatAuditEntry {
  sessionId: string;
  event: ChatAuditEvent;
  timestamp: number;
  actorId: string;
  actorType: 'patient' | 'doctor' | 'pharmacist' | 'system';
  details?: Record<string, string | number | boolean>;
}

const chatAuditBuffer: ChatAuditEntry[] = [];

export function logChatEvent(entry: Omit<ChatAuditEntry, 'timestamp'>): void {
  const fullEntry: ChatAuditEntry = {
    ...entry,
    timestamp: Date.now(),
  };
  chatAuditBuffer.push(fullEntry);

  // TODO: In production, send to backend
  // await chatApi.logEvent(fullEntry);

  // Keep buffer manageable
  if (chatAuditBuffer.length > 200) {
    chatAuditBuffer.splice(0, chatAuditBuffer.length - 200);
  }
}

export function getChatAuditLog(sessionId: string): ChatAuditEntry[] {
  return chatAuditBuffer.filter((e) => e.sessionId === sessionId);
}
