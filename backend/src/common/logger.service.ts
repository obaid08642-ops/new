/**
 * 20.3 — the one logger of the app. Installed with `app.useLogger(app.get(LoggerService))`, it replaces Nest's own
 * Logger everywhere: `new Logger('Orders').warn(...)`, Nest's framework lines and our `logEvent(...)` all end as the same
 * JSON line on stdout (and, for warn and error, in the `app_logs` collection). It is a thin layer over `logEvent`:
 * masking, the request id, LOG_LEVEL and the sinks live there.
 */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { LogLevel, buildLogRecord, emitLog, isLevelEnabled } from './structured-logger';

type Params = unknown[];

/** Nest calls `logger.error(message, stack?, context?)` and `logger.log(message, context?)`: the last string is the context. */
function splitParams(level: LogLevel, params: Params): { context?: string; stack?: string } {
  const strings = params.filter((p): p is string => typeof p === 'string');
  if (!strings.length) return {};
  const context = strings[strings.length - 1];
  if (level === 'error' && strings.length > 1) return { stack: strings[0], context };
  return { context };
}

/** A line written the old way (`logger.log(JSON.stringify({ event, ... }))`) keeps its event and fields. */
function parseLegacyLine(message: string): Record<string, unknown> | null {
  if (message.charCodeAt(0) !== 123 /* { */) return null;
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === 'object' && typeof parsed.event === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function detailsOf(message: unknown, stack?: string): { event: string; fields: Record<string, unknown> } {
  if (message instanceof Error) {
    return { event: 'exception', fields: { message: message.message, error_name: message.name, stack: (message.stack ?? stack ?? '').split('\n').slice(0, 8).join('\n') } };
  }
  if (typeof message === 'string') {
    const legacy = parseLegacyLine(message);
    if (legacy) {
      const { event, level: _level, ts: _ts, service: _service, ...fields } = legacy as Record<string, unknown> & { event: string };
      return { event, fields };
    }
    return { event: 'app_log', fields: { message: message.slice(0, 2000), ...(stack ? { stack: stack.split('\n').slice(0, 8).join('\n') } : {}) } };
  }
  return { event: 'app_log', fields: { message, ...(stack ? { stack: stack.split('\n').slice(0, 8).join('\n') } : {}) } };
}

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: unknown, ...params: Params) { this.write('info', message, params); }
  error(message: unknown, ...params: Params) { this.write('error', message, params); }
  warn(message: unknown, ...params: Params) { this.write('warn', message, params); }
  debug(message: unknown, ...params: Params) { this.write('debug', message, params); }
  verbose(message: unknown, ...params: Params) { this.write('debug', message, params); }
  fatal(message: unknown, ...params: Params) { this.write('error', message, params); }

  private write(level: LogLevel, message: unknown, params: Params) {
    if (!isLevelEnabled(level)) return;
    const { context, stack } = splitParams(level, params);
    const { event, fields } = detailsOf(message, stack);
    emitLog(buildLogRecord(level, event, fields, context ?? 'app'));
  }
}
