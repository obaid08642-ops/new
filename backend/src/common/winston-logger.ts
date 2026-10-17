/**
 * 20.3 — the logger used while Nest boots (before `app.useLogger` can run): winston, at the level LOG_LEVEL says,
 * printing the same JSON record as the LoggerService, so the first lines of a start-up look like every other line.
 */
import * as winston from 'winston';
import { LogLevel, buildLogRecord, resolveLogLevel } from './structured-logger';

function levelOf(raw: unknown): LogLevel {
  const v = String(raw ?? '');
  return v === 'error' ? 'error' : v === 'warn' ? 'warn' : v === 'debug' || v === 'verbose' ? 'debug' : 'info';
}

export function bootstrapWinstonOptions(): winston.LoggerOptions {
  return {
    // winston's npm levels (error 0, warn 1, info 2, ... debug 5) have the same four names as LOG_LEVEL
    level: resolveLogLevel(),
    transports: [
      new winston.transports.Console({
        format: winston.format.printf((info) => {
          const { message, context, level: l } = info as { message?: unknown; context?: unknown; level?: unknown };
          return JSON.stringify(buildLogRecord(levelOf(l), 'app_log', { message: typeof message === 'string' ? message : JSON.stringify(message) }, typeof context === 'string' ? context : 'bootstrap'));
        }),
      }),
    ],
  };
}
