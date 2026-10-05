// Q84: every template key push.module.ts sends must resolve to real text in all
// six locales. Fourteen keys (emergency, call, chat, payment, report) existed in
// no dictionary and no seeded template, so I18nService.t returned the key and
// patients received "push.emergency.assigned.title".
import { readFileSync } from 'fs';
import { join } from 'path';
import { I18nService } from '../i18n/i18n.service';

const source = readFileSync(join(__dirname, 'push.module.ts'), 'utf8');
const keys = [...new Set(source.match(/'push\.[a-z_]+\.[a-z_]+\.(title|body)'|'push\.[a-z_]+\.(title|body)'/g) || [])].map((k) => k.slice(1, -1));
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] as const;
const params = { sender_name: 'S', body: 'B', caller_name: 'C', amount: 10, code: '1234', name: 'N' };

describe('push template keys resolve in every locale (Q84)', () => {
  const i18n = new I18nService();
  it('finds the keys push.module.ts uses', () => {
    expect(keys).toEqual(expect.arrayContaining(['push.emergency.assigned.title', 'push.call.incoming.body', 'push.report.ready.title']));
  });
  it.each(keys)('%s', (key) => {
    for (const lang of LANGS) {
      const text = i18n.t(key, lang, params);
      expect(text).not.toBe(key);
      expect(text).not.toMatch(/\{[a-z_]+\}/);
      const entry = (i18n as unknown as { all: (l: string) => Record<string, string> }).all(lang)[key];
      expect(entry).toBeTruthy();
    }
  });
});
