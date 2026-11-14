#!/usr/bin/env node
// Checks sitemap, canonical and hreflang across the six languages on a live site (read only).
//   node tools/seo/verify-discovery.mjs [--site https://nabd.plus] [--per-sitemap 3]
// For every child sitemap of /sitemap.xml it takes the first N <url> entries and checks:
//   1. the sitemap entry lists the six language alternates (+ x-default), and its own loc is one of them;
//   2. the page answers 200 and its <link rel="canonical"> is its own URL (self-canonical);
//   3. the page's <link rel="alternate" hreflang> set equals the sitemap's set (all six + x-default);
//   4. each alternate answers 200 and points back (reciprocal hreflang).
// Exit 1 on any problem; prints one line per problem. Output has URLs only, no secrets.
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SITE = opt('--site', 'https://nabd.plus').replace(/\/$/, '');
const PER = Number(opt('--per-sitemap', '3'));
const LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const problems = [];
const bad = (m) => { problems.push(m); console.log('PROBLEM ' + m); };
const get = async (u) => { try { return await fetchOnce(u); } catch (e) { return { status: 0, text: '', url: u }; } };
const fetchOnce = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'NabdPlus-discovery-check/1.0', accept: 'text/html,application/xml' }, redirect: 'follow', signal: AbortSignal.timeout(25000) }); return { status: r.status, text: await r.text(), url: r.url }; };
const locs = (xml, tag = 'loc') => [...xml.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g'))].map((m) => m[1].replace(/&amp;/g, '&'));
const altsOfEntry = (block) => Object.fromEntries([...block.matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((m) => [m[1], m[2].replace(/&amp;/g, '&')]));
const pageAlts = (html) => {
  const out = {};
  for (const m of html.matchAll(/<link\b[^>]*>/g)) {
    const t = m[0];
    if (!/rel="alternate"/i.test(t)) continue;
    const l = /hreflang="([^"]+)"/i.exec(t)?.[1]; const h = /href="([^"]+)"/.exec(t)?.[1];
    if (l && h) out[l] = h.replace(/&amp;/g, '&');
  }
  return out;
};
const canonicalOf = (html) => {
  for (const m of html.matchAll(/<link\b[^>]*>/g)) if (/rel="canonical"/.test(m[0])) return /href="([^"]+)"/.exec(m[0])?.[1];
  return null;
};
const index = await get(`${SITE}/sitemap.xml`);
if (index.status !== 200) { bad(`/sitemap.xml HTTP ${index.status}`); process.exit(1); }
const children = locs(index.text);
console.log(`sitemap index: ${children.length} child sitemaps`);
let pages = 0;
for (const child of children) {
  const sm = await get(child);
  if (sm.status !== 200) { bad(`${child} HTTP ${sm.status}`); continue; }
  const blocks = sm.text.split('<url>').slice(1).slice(0, PER);
  for (const b of blocks) {
    const loc = locs(b)[0];
    if (!loc) continue;
    const sAlts = altsOfEntry(b);
    const kind = child.replace(SITE, '');
    if (Object.keys(sAlts).length === 0) { // single-language entries are legal only for content that exists in one language
      console.log(`  note ${kind}: ${loc} has no alternates in the sitemap`);
    } else {
      for (const l of LANGS) if (!sAlts[l]) bad(`${kind}: ${loc} sitemap lacks hreflang ${l}`);
      if (!sAlts['x-default']) bad(`${kind}: ${loc} sitemap lacks x-default`);
      if (!Object.values(sAlts).includes(loc)) bad(`${kind}: ${loc} is not among its own alternates`);
    }
    const page = await get(loc); pages++;
    if (page.status !== 200) { bad(`${loc} HTTP ${page.status}`); continue; }
    const can = canonicalOf(page.text);
    if (can !== loc) bad(`${loc} canonical is ${can}`);
    const pAlts = pageAlts(page.text);
    if (Object.keys(sAlts).length) {
      for (const [l, h] of Object.entries(sAlts)) if (pAlts[l] !== h) bad(`${loc} page hreflang ${l}=${pAlts[l]} but sitemap says ${h}`);
      for (const l of Object.keys(pAlts)) if (!sAlts[l]) bad(`${loc} page has hreflang ${l} that the sitemap lacks`);
    }
    for (const l of LANGS) {
      const alt = pAlts[l];
      if (!alt || alt === loc) continue;
      const r = await get(alt); pages++;
      if (r.status !== 200) { bad(`${loc} alternate ${l} ${alt} HTTP ${r.status}`); continue; }
      const back = pageAlts(r.text);
      if (back[LANGS.find((x) => pAlts[x] === loc) ?? ''] !== loc) bad(`${alt} does not point back to ${loc}`);
      if (canonicalOf(r.text) !== alt) bad(`${alt} canonical is ${canonicalOf(r.text)}`);
    }
  }
}
console.log(`checked ${pages} pages; ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
