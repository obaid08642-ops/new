#!/usr/bin/env node
/**
 * Locale parity gate (owner rule, 2026-10-06, same strictness as the colour rule).
 *
 * Every user-visible string lives in a translation file and exists, non-empty and translated, in all six
 * languages: ar, en, ur, hi, bn and fil (the app calls the Filipino file `tl`). Checked per client:
 *
 *   web  patient-web/messages/{ar,en,ur,hi,bn,fil}.json        (next-intl, nested)
 *   app  patient-app/src/i18n/locales/{ar,en,ur,hi,bn,tl}.json (flat dotted keys)
 *
 * Three counts per client and locale, compared with `tools/design/locale-parity.baseline.json`:
 *   missing  a key another locale has is absent here
 *   empty    the key exists but the value is not a non-empty string
 *   english  the value is English text inside a non-English file: a Latin word outside the brand/unit
 *            allowlist in ar/ur/hi/bn, or a value identical to the English one in ar/ur/hi/bn/fil
 *            (brand names, numbers and codes excepted)
 *
 * The counts only go down. A count above its baseline fails; `--update` records lower counts and refuses to
 * raise one. A NEW key (one that is not in the baseline's snapshot of keys) must have zero of all three in
 * every locale, which is what "every new key gets all six translations in the same PR" means in CI: `--base
 * <ref>` lists the keys the branch adds against that ref and fails when any is missing, empty or English.
 *
 *   node tools/design/locale-parity.mjs                 check against the baseline
 *   node tools/design/locale-parity.mjs --update        lower the baseline
 *   node tools/design/locale-parity.mjs --base main     also require the keys added since main to be complete
 *   node tools/design/locale-parity.mjs --list web:ur   print the offending keys of one client:locale
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASELINE = join(REPO, 'tools/design/locale-parity.baseline.json');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : undefined; };

const CLIENTS = {
  web: { dir: 'patient-web/messages', locales: ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] },
  app: { dir: 'patient-app/src/i18n/locales', locales: ['ar', 'en', 'ur', 'hi', 'bn', 'tl'] },
};

/** Names and abbreviations that are written the same in every language. Lower-case. */
const KEEP = new Set(`nabd plus apple google snapchat whatsapp facebook instagram twitter visa mastercard mada stc pay tabby tamara
  samsung huawei iphone android ios web app sms otp pin qr pdf gps wifi wi-fi nfc id ids url uri http https www com sa
  sar usd aed kwd egp inr pkr bdt php kg g mg mcg ml l cm mm km m kcal cal bpm mmhg mmol dl mg/dl bmi hba1c spo2 ecg ekg ct mri iv iui ivf
  rx hiv hpv covid rh abo hcg pcos tsh gp er icu nicu cpr cbc ldl hdl a b o ab am pm vat iban swift bic zoom meet teams fb x
  ar en ur hi bn fil tl
  english arabic urdu hindi bengali filipino tagalog`.split(/\s+/).filter(Boolean));

/** The language names in their own script are not "English leftovers" either. */
const AUTONYMS = new Set(['english', 'arabic', 'urdu', 'hindi', 'bengali', 'filipino', 'tagalog']);

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

/** Text the reader sees: ICU syntax, rich-text tags, URLs and e-mail addresses removed. */
function visible(s) {
  return String(s)
    .replace(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    .replace(/\{\s*\w+\s*,\s*(?:plural|select|selectordinal)\s*,/g, ' ')
    .replace(/(?:zero|one|two|few|many|other|=\d+)\s*\{/g, ' ')
    .replace(/\{\s*\w+\s*(?:,[^{}]*)?\}/g, ' ')
    .replace(/[{}]/g, ' ');
}

/** Latin words (3+ letters, or any word for a script that has no Latin letters) that are not allowlisted. */
function latinWords(s) {
  const words = visible(s).match(/[A-Za-z][A-Za-z0-9'’-]*/g) ?? [];
  return words.filter((w) => w.length >= 2 && !KEEP.has(w.toLowerCase()) && !/^[A-Z0-9]{2,5}$/.test(w));
}

/** Is `value` English text inside the file of `locale`? `en` is the English value of the same key. */
function isEnglishLeftover(locale, value, en) {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (locale === 'en') return false;
  const own = visible(value).trim();
  const sameAsEnglish = typeof en === 'string' && own.toLowerCase() === visible(en).trim().toLowerCase();
  if (locale === 'fil' || locale === 'tl') {
    // Latin script: a leftover is a value that is the English one, ignoring names, numbers and codes.
    return sameAsEnglish && latinWords(own).length > 0;
  }
  // Arabic, Urdu, Hindi, Bengali: any non-allowlisted Latin word is English (or a transliteration that must be native script).
  if (latinWords(own).length > 0) return true;
  return false;
}

function load(client) {
  const { dir, locales } = CLIENTS[client];
  const data = {};
  for (const l of locales) {
    const p = join(REPO, dir, `${l}.json`);
    if (!existsSync(p)) throw new Error(`locale-parity: ${p} is missing`);
    data[l] = flatten(JSON.parse(readFileSync(p, 'utf8')));
  }
  return data;
}

/** Counts and offending keys per locale for one client. */
function measure(client) {
  const { locales } = CLIENTS[client];
  const data = load(client);
  const all = new Set();
  for (const l of locales) for (const k of Object.keys(data[l])) all.add(k);
  const result = {};
  for (const l of locales) {
    const missing = [], empty = [], english = [];
    for (const k of all) {
      if (!(k in data[l])) { missing.push(k); continue; }
      const v = data[l][k];
      if (typeof v !== 'string' || !v.trim()) { empty.push(k); continue; }
      if (isEnglishLeftover(l, v, data.en[k])) english.push(k);
    }
    result[l] = { missing, empty, english };
  }
  return { keys: all.size, result, data };
}

function counts(m) {
  const out = {};
  for (const [l, r] of Object.entries(m.result)) out[l] = { missing: r.missing.length, empty: r.empty.length, english: r.english.length };
  return out;
}

const measured = Object.fromEntries(Object.keys(CLIENTS).map((c) => [c, measure(c)]));

if (opt('list')) {
  const [c, l] = opt('list').split(':');
  const r = measured[c]?.result[l];
  if (!r) { console.error(`locale-parity: unknown ${opt('list')}`); process.exit(2); }
  for (const kind of ['missing', 'empty', 'english']) for (const k of r[kind]) console.log(`${kind}\t${k}\t${measured[c].data[l][k] ?? ''}`);
  process.exit(0);
}

const current = Object.fromEntries(Object.entries(measured).map(([c, m]) => [c, counts(m)]));
const total = (o) => Object.values(o).reduce((s, cl) => s + Object.values(cl).reduce((a, x) => a + x.missing + x.empty + x.english, 0), 0);

if (flag('update')) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
  const next = {};
  for (const [c, locs] of Object.entries(current)) {
    next[c] = {};
    for (const [l, n] of Object.entries(locs)) {
      const prev = old?.counts?.[c]?.[l];
      for (const kind of ['missing', 'empty', 'english']) {
        if (prev && n[kind] > prev[kind]) { console.error(`locale-parity: refusing to raise ${c}:${l}:${kind} from ${prev[kind]} to ${n[kind]}`); process.exit(1); }
      }
      next[c][l] = n;
    }
  }
  writeFileSync(BASELINE, JSON.stringify({ note: 'Counts only go down. Generated by tools/design/locale-parity.mjs --update.', counts: next }, null, 2) + '\n');
  console.log(`locale-parity: baseline recorded, ${total(next)} problem(s) in total`);
  process.exit(0);
}

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).counts : null;
let failed = 0;
for (const [c, locs] of Object.entries(current)) {
  for (const [l, n] of Object.entries(locs)) {
    for (const kind of ['missing', 'empty', 'english']) {
      const allowed = baseline?.[c]?.[l]?.[kind] ?? 0;
      if (n[kind] > allowed) {
        failed++;
        console.error(`locale-parity: ${c}:${l} has ${n[kind]} ${kind} (baseline ${allowed}). Run with --list ${c}:${l}.`);
      }
    }
  }
}

// New keys must be complete in all six languages (checked against a base ref).
const base = opt('base');
if (base) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { cwd: REPO, stdio: 'ignore' });
  } catch {
    // Without the base every key would look new (a shallow CI checkout did exactly that).
    console.error(`locale-parity: base ref ${base} not found (shallow checkout? use fetch-depth: 0)`);
    process.exit(2);
  }
  for (const [c, { dir, locales }] of Object.entries(CLIENTS)) {
    let before = {};
    try {
      const raw = execFileSync('git', ['show', `${base}:${dir}/en.json`], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
      before = flatten(JSON.parse(raw));
    } catch { /* the file did not exist on the base */ }
    const added = Object.keys(measured[c].data.en).filter((k) => !(k in before));
    for (const l of locales) {
      const r = measured[c].result[l];
      const bad = added.filter((k) => r.missing.includes(k) || r.empty.includes(k) || r.english.includes(k));
      if (bad.length) {
        failed++;
        console.error(`locale-parity: ${c}:${l} lacks a real translation for ${bad.length} key(s) added since ${base}: ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? ', …' : ''}`);
      }
    }
  }
}

for (const [c, m] of Object.entries(measured)) {
  const row = Object.entries(counts(m)).map(([l, n]) => `${l} ${n.missing}/${n.empty}/${n.english}`).join('  ');
  console.log(`locale-parity: ${c} ${m.keys} keys, missing/empty/english per locale: ${row}`);
}
if (failed) { console.error(`locale-parity: ${failed} check(s) failed.`); process.exit(1); }
console.log(`locale-parity: ok (${total(current)} known problem(s) in the baseline, none new).`);
