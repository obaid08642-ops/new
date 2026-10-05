// R19 admin locale-name merge. Run: node_modules/.bin/jiti src/lib/medicine-translations.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLocaleNames } from './medicine-translations';

test('merges new locale names into the existing map and keeps the other keys', () => {
  const existing = {
    ar: { name: 'باراسيتامول', slug: 'paracetamol-ar' },
    ur: { name: 'پرانا', slug: 'purana', search_aliases: ['a'] },
  };
  const out = mergeLocaleNames(existing, { name_ur: '  نیا  ', name_hi: 'नया', name_bn: '', name_fil: '' });
  assert.deepEqual(out, {
    ar: { name: 'باراسيتامول', slug: 'paracetamol-ar' },
    ur: { name: 'نیا', slug: 'purana', search_aliases: ['a'] },
    hi: { name: 'नया' },
  });
  // the input map is not mutated
  assert.equal(existing.ur.name, 'پرانا');
});

test('blank names never create empty locale objects', () => {
  assert.deepEqual(mergeLocaleNames({}, { name_ur: ' ', name_hi: '', name_bn: undefined, name_fil: '' }), {});
});

test('an existing locale with a blank form name is kept unchanged (no wipe)', () => {
  assert.deepEqual(mergeLocaleNames({ bn: { name: 'পুরানো' } }, { name_bn: '' }), { bn: { name: 'পুরানো' } });
});

test('legacy tl seeds fil; a new Filipino name is sent under fil only', () => {
  const kept = mergeLocaleNames({ tl: { name: 'Luma', slug: 'luma' } }, { name_fil: '' });
  assert.deepEqual(kept, { tl: { name: 'Luma', slug: 'luma' }, fil: { name: 'Luma', slug: 'luma' } });
  const renamed = mergeLocaleNames({ tl: { name: 'Luma', slug: 'luma' } }, { name_fil: 'Bago' });
  assert.deepEqual(renamed, { fil: { name: 'Bago', slug: 'luma' } });
});

test('malformed stored payloads do not throw and are not echoed back', () => {
  assert.deepEqual(mergeLocaleNames(null, { name_ur: 'x' }), { ur: { name: 'x' } });
  assert.deepEqual(mergeLocaleNames('garbage', { name_hi: 'y' }), { hi: { name: 'y' } });
  assert.deepEqual(mergeLocaleNames([1, 2], {}), {});
  assert.deepEqual(mergeLocaleNames({ ur: null, hi: 'str', bn: [1] }, { name_ur: 'z' }), { ur: { name: 'z' } });
});
