/**
 * Logger — Centralized logging with dev/prod modes,
 * sensitive data filtering, and remote log support.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

type RemoteLogSink = (entry: LogEntry) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Sensitive keys to redact from logs
// ─────────────────────────────────────────────────────────────────────────────
const SENSITIVE_KEYS = [
  'password', 'token', 'refreshToken', 'accessToken',
  'secret', 'apiKey', 'authorization', 'pin', 'otp',
  'nationalId', 'cardNumber', 'cvv', 'iban',
];

function redactSensitive(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redactSensitive);

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => {
      const isSensitive = SENSITIVE_KEYS.some((s) =>
        k.toLowerCase().includes(s.toLowerCase()),
      );
      return [k, isSensitive ? '[REDACTED]' : redactSensitive(v)];
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger class
// ─────────────────────────────────────────────────────────────────────────────
export class AppLogger {
  private minLevel: LogLevel = __DEV__ ? 'debug' : 'warn';
  private remoteSinks: RemoteLogSink[] = [];
  private buffer: LogEntry[] = [];
  private readonly maxBuffer = 200;

  private readonly levelOrder: Record<LogLevel, number> = {
    debug: 0, info: 1, warn: 2, error: 3, none: 4,
  };

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  addRemoteSink(sink: RemoteLogSink): () => void {
    this.remoteSinks.push(sink);
    return () => {
      const idx = this.remoteSinks.indexOf(sink);
      if (idx > -1) this.remoteSinks.splice(idx, 1);
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.minLevel];
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data: redactSensitive(data),
      timestamp: new Date().toISOString(),
      context,
    };

    // Console output (dev only)
    if (__DEV__) {
      const prefix = `[${level.toUpperCase()}]${context ? ` [${context}]` : ''}`;
      const logFn = level === 'error' ? console.error
        : level === 'warn' ? console.warn
        : level === 'info' ? console.info
        : console.log;
      data !== undefined
        ? logFn(prefix, message, entry.data)
        : logFn(prefix, message);
    }

    // Buffer
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }

    // Remote sinks (production)
    if (!__DEV__) {
      this.remoteSinks.forEach((sink) => {
        try { sink(entry); } catch { /* never throw from logger */ }
      });
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: unknown, context?: string): void {
    this.log('error', message, data, context);
  }

  getBuffer(): ReadonlyArray<LogEntry> {
    return this.buffer;
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  /** Create a scoped logger for a module */
  scope(context: string): ScopedLogger {
    return new ScopedLogger(this, context);
  }
}

class ScopedLogger {
  constructor(private parent: AppLogger, private context: string) {}
  debug(msg: string, data?: unknown) { this.parent.debug(msg, data, this.context); }
  info(msg: string, data?: unknown)  { this.parent.info(msg, data, this.context); }
  warn(msg: string, data?: unknown)  { this.parent.warn(msg, data, this.context); }
  error(msg: string, data?: unknown) { this.parent.error(msg, data, this.context); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────
export const logger = new AppLogger();
export type { ScopedLogger };
