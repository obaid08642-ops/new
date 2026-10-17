import { describe, expect, it } from 'vitest';
import { LOG_LANGS, LOG_LANG_DIR, LOG_MESSAGES, fmt } from './app-logs-i18n';
import { csvCell, localToIso, logsQuery, logsToCsv, rangeIsInvalid, EMPTY_FILTERS, type LogLine } from './app-logs';

describe('Logs page texts: six languages', () => {
  const keys = Object.keys(LOG_MESSAGES.ar).sort();
  it('has the six platform languages, right-to-left for Arabic and Urdu only', () => {
    expect([...LOG_LANGS]).toEqual(['ar', 'en', 'ur', 'hi', 'bn', 'fil']);
    expect(Object.entries(LOG_LANG_DIR).filter(([, d]) => d === 'rtl').map(([l]) => l).sort()).toEqual(['ar', 'ur']);
  });
  it('every language has every key, none empty, same placeholders', () => {
    for (const lang of LOG_LANGS) {
      const m = LOG_MESSAGES[lang] as Record<string, string>;
      expect(Object.keys(m).sort(), lang).toEqual(keys);
      for (const k of keys) {
        expect(m[k].trim(), `${lang}.${k}`).not.toBe('');
        const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
        expect(ph(m[k]), `${lang}.${k} placeholders`).toBe(ph((LOG_MESSAGES.ar as Record<string, string>)[k]));
      }
    }
  });
  it('no other language reuses the Arabic text, and no non-English language leaves the English text', () => {
    const ar = LOG_MESSAGES.ar as Record<string, string>; const en = LOG_MESSAGES.en as Record<string, string>;
    // technical words that are the same everywhere (CSV, ms columns, an example module)
    const same = new Set(['module_ph', 'export_csv', 'col_duration']);
    for (const lang of LOG_LANGS.filter((l) => l !== 'ar')) {
      const m = LOG_MESSAGES[lang] as Record<string, string>;
      for (const k of keys) expect(m[k], `${lang}.${k} equals Arabic`).not.toBe(ar[k]);
      if (lang !== 'en') for (const k of keys.filter((x) => !same.has(x))) expect(m[k], `${lang}.${k} left in English`).not.toBe(en[k]);
    }
  });
  it('substitutes placeholders', () => {
    expect(fmt(LOG_MESSAGES.en.page_of, { page: 2, pages: 9 })).toBe('Page 2 of 9');
    expect(fmt('{n} lines', {})).toBe('{n} lines');
  });
});

describe('Logs page helpers', () => {
  it('builds the query: only what is set, request id trimmed, dates as ISO, page 1 not sent', () => {
    expect(logsQuery(EMPTY_FILTERS, 1)).toBe('?page_size=50');
    const q = logsQuery({ level: 'error', from: '2026-10-01T10:00', to: '', module: ' auth ', request_id: ' abc-1 ', q: 'timeout' }, 3);
    const p = new URLSearchParams(q);
    expect(p.get('level')).toBe('error'); expect(p.get('module')).toBe('auth'); expect(p.get('request_id')).toBe('abc-1'); expect(p.get('q')).toBe('timeout');
    expect(p.get('page')).toBe('3'); expect(p.get('from')).toBe(new Date('2026-10-01T10:00').toISOString()); expect(p.has('to')).toBe(false);
  });
  it('detects an inverted date range', () => {
    expect(rangeIsInvalid({ from: '2026-10-02T00:00', to: '2026-10-01T00:00' })).toBe(true);
    expect(rangeIsInvalid({ from: '2026-10-01T00:00', to: '2026-10-02T00:00' })).toBe(false);
    expect(rangeIsInvalid({ from: '', to: '2026-10-02T00:00' })).toBe(false);
    expect(localToIso('not a date')).toBe('');
  });
  it('quotes CSV cells and neutralises spreadsheet formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell(null)).toBe('');
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(csvCell(500)).toBe('500');
  });
  it('writes one CSV row per line, with a BOM and the header', () => {
    const row: LogLine = { id: '1', ts: '2026-10-01T00:00:00.000Z', level: 'error', service: 'backend', module: 'http', event: 'http_request', request_id: 'r1', user_id: null, route: '/x', status: 500, duration_ms: 12, details: { a: 1 } };
    const csv = logsToCsv([row]);
    expect(csv.startsWith('﻿ts,level,service,module,event,request_id,user_id,route,status,duration_ms,details\r\n')).toBe(true);
    expect(csv).toContain('2026-10-01T00:00:00.000Z,error,backend,http,http_request,r1,,/x,500,12,"{""a"":1}"');
  });
});
