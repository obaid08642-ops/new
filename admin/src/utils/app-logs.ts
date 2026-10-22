/** 20.3 admin "Logs" page: the response types, the query, the table CSV and the language preference. */
import { toQuery } from '@/lib/admin-client';
import { LOG_LANGS, LogLang } from './app-logs-i18n';

export type LogLine = {
  id: string; ts: string; level: 'warn' | 'error'; service: 'backend' | 'worker'; module: string; event: string;
  request_id: string | null; user_id: string | null; route: string | null; status: number | null; duration_ms: number | null;
  details: Record<string, unknown> | null;
};
export type LogsResponse = { data: LogLine[]; page: number; page_size: number; total: number; total_capped: boolean; pages: number; retention_days: number; dropped_in_this_process: number };
export type RequestLogsResponse = { request_id: string; count: number; data: LogLine[] };

export type LogFilters = { level: '' | 'warn' | 'error'; from: string; to: string; module: string; request_id: string; q: string };
export const EMPTY_FILTERS: LogFilters = { level: '', from: '', to: '', module: '', request_id: '', q: '' };
export const PAGE_SIZE = 50;

/** `datetime-local` gives local time without a zone: send it as an ISO instant. Empty or invalid stays empty. */
export function localToIso(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function rangeIsInvalid(f: Pick<LogFilters, 'from' | 'to'>): boolean {
  const a = localToIso(f.from); const b = localToIso(f.to);
  return !!a && !!b && a > b;
}

export function logsQuery(f: LogFilters, page: number): string {
  return toQuery({
    level: f.level, from: localToIso(f.from), to: localToIso(f.to), module: f.module.trim(), request_id: f.request_id.trim(), q: f.q.trim(),
    page: page > 1 ? page : undefined, page_size: PAGE_SIZE,
  });
}

/** A cell starting with = + - @ would run as a formula when the CSV is opened in a spreadsheet: neutralise it. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_COLUMNS = ['ts', 'level', 'service', 'module', 'event', 'request_id', 'user_id', 'route', 'status', 'duration_ms', 'details'] as const;

/** The rows on screen as CSV (UTF-8 with a BOM so a spreadsheet reads Arabic and Urdu correctly). The column names are the field names. */
export function logsToCsv(rows: LogLine[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows) lines.push(CSV_COLUMNS.map((c) => csvCell((r as Record<string, unknown>)[c])).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

const LANG_KEY = 'nabd-admin-logs-lang';
export function readLang(): LogLang {
  try {
    const v = typeof window === 'undefined' ? null : window.localStorage.getItem(LANG_KEY);
    return (LOG_LANGS as readonly string[]).includes(v ?? '') ? (v as LogLang) : 'ar';
  } catch { return 'ar'; }
}
export function saveLang(lang: LogLang) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(LANG_KEY, lang); } catch { /* a preference only */ }
}
