// P20.6 public status page + uptime checks: a Cloudflare Worker at status.nabd.plus, independent of the origin server.
//
// - Vantage points. The worker's own cron (every 5 minutes) probes the site and the API from Cloudflare's edge. Other vantage
//   points report to POST /ingest with an HMAC signature: the GitHub Actions uptime workflow (a different network and
//   region, .github/workflows/uptime.yml) and, in 20.7, the synthetic journeys. Each vantage is named in the page's count.
// - Status of a component = what its fresh vantages (reported in the last 15 minutes) say: all ok -> working; some -> degraded
//   (one vantage's own network trouble is not an outage); none ok -> down; nothing fresh -> no recent data. A slow answer or
//   the edge serving a saved copy (x-nabd-edge: ERROR-STALE / UNAVAILABLE) is "degraded", not "working".
// - History: per day and component, ok/total checks for 90 days; incidents open when a component is down and close when it is
//   working again. All of it lives in one KV key written once per report (576 writes a day with two vantages; the Free plan
//   allows 1,000), so the history survives and there is no database to run.
// - Page: no JavaScript, six languages (patient-web/messages "StatusPage"), colours from the design tokens, a strict CSP.
// Fail-safe: a probe or storage error never breaks the page; with no state the page says "No checks yet".
import tokens from "../../../packages/design-tokens/tokens.json" with { type: "json" };
import ar from "../../../patient-web/messages/ar.json" with { type: "json" };
import en from "../../../patient-web/messages/en.json" with { type: "json" };
import ur from "../../../patient-web/messages/ur.json" with { type: "json" };
import hi from "../../../patient-web/messages/hi.json" with { type: "json" };
import bn from "../../../patient-web/messages/bn.json" with { type: "json" };
import fil from "../../../patient-web/messages/fil.json" with { type: "json" };

const MESSAGES = { ar, en, ur, hi, bn, fil };
const LOCALES = Object.keys(MESSAGES);
const RTL = new Set(["ar", "ur"]);
const FRESH_MS = 15 * 60_000;
const SLOW_MS = 3000;
const KEEP_DAYS = 90;
const MAX_INCIDENTS = 30;
const enc = new TextEncoder();

/** What the cron probes. `expect` is the HTTP status that means working. */
export const TARGETS = [
  { component: "website", url: "https://nabd.plus/ar", expect: 200 },
  { component: "api", url: "https://api.nabd.plus/api/v1/health/readiness", expect: 200 },
];
/** Components the page knows a name for (patient-web messages: StatusPage.component<Name>); any other id is shown as it is. */
export const KNOWN = { website: "componentWebsite", api: "componentApi", search: "componentSearch", product: "componentProduct", cart: "componentCart", doctors: "componentDoctors", login: "componentLogin" };

// ---------------------------------------------------------------------------------------------------- the state (pure)
export const emptyState = () => ({ v: 1, updated: 0, vantages: {}, days: {}, incidents: [] });
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Fold one vantage's report into the state: latest result per component, the day's counters, incidents. Pure; returns a new state. */
export function applyReport(prev, vantage, results, now) {
  const s = JSON.parse(JSON.stringify(prev || emptyState()));
  s.updated = now;
  const v = (s.vantages[vantage] = { at: now, results: {} });
  const day = (s.days[dayOf(now)] ||= {});
  for (const r of results) {
    v.results[r.component] = { ok: !!r.ok, ms: Math.round(r.ms || 0), degraded: !!r.degraded };
    const c = (day[r.component] ||= [0, 0]);
    c[1] += 1;
    if (r.ok) c[0] += 1;
  }
  for (const d of Object.keys(s.days)) if (now - Date.parse(d) > KEEP_DAYS * 86_400_000) delete s.days[d];
  // incidents follow the computed status
  for (const component of Object.keys(v.results)) {
    const st = componentStatus(s, component, now);
    const open = s.incidents.find((i) => i.component === component && !i.to);
    if (st === "down" && !open) s.incidents.unshift({ component, from: now, to: null });
    else if (st === "up" && open) open.to = now;
  }
  s.incidents = s.incidents.slice(0, MAX_INCIDENTS);
  return s;
}

/** up | degraded | down | unknown for a component, from the vantages that reported in the last 15 minutes. */
export function componentStatus(state, component, now) {
  const fresh = Object.values(state.vantages || {}).filter((v) => now - v.at <= FRESH_MS && v.results[component]).map((v) => v.results[component]);
  if (!fresh.length) return "unknown";
  const ok = fresh.filter((r) => r.ok);
  if (!ok.length) return "down";
  if (ok.length < fresh.length || ok.some((r) => r.degraded || r.ms > SLOW_MS)) return "degraded";
  return "up";
}

export function components(state) {
  const ids = new Set();
  for (const v of Object.values(state.vantages || {})) for (const c of Object.keys(v.results)) ids.add(c);
  return [...ids].sort((a, b) => (a === "website" ? -1 : b === "website" ? 1 : a === "api" ? -1 : b === "api" ? 1 : a.localeCompare(b)));
}

export function overall(state, now) {
  const all = components(state).map((c) => componentStatus(state, c, now));
  if (!all.length || all.every((s) => s === "unknown")) return "unknown";
  if (all.includes("down")) return "down";
  if (all.includes("degraded")) return "degraded";
  return "up";
}

/** Percentage of ok checks over the last `days` days (two decimals), or null with no checks. */
export function uptime(state, component, days, now) {
  let ok = 0; let total = 0;
  for (const [d, comps] of Object.entries(state.days || {})) {
    if (now - Date.parse(d) > days * 86_400_000) continue;
    const c = comps[component]; if (c) { ok += c[0]; total += c[1]; }
  }
  return total ? Math.floor((ok / total) * 10_000) / 100 : null;
}

export function vantageCount(state, now) {
  return Object.values(state.vantages || {}).filter((v) => now - v.at <= FRESH_MS).length;
}

// ---------------------------------------------------------------------------------------------------- probing
/** One probe. Never throws: a timeout or a network error is a failed check. */
export async function probe(target, fetchImpl = fetch) {
  const started = Date.now();
  try {
    const res = await fetchImpl(`${target.url}${target.url.includes("?") ? "&" : "?"}__status=1`, {
      headers: { "user-agent": "nabd-status/1", "cache-control": "no-cache" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const edge = res.headers.get("x-nabd-edge") || "";
    await res.arrayBuffer().catch(() => null);
    return { component: target.component, ok: res.status === target.expect, ms: Date.now() - started, degraded: /^(ERROR-STALE|UNAVAILABLE)$/.test(edge), code: res.status };
  } catch {
    return { component: target.component, ok: false, ms: Date.now() - started, degraded: false, code: 0 };
  }
}

// ---------------------------------------------------------------------------------------------------- signing
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const sign = hmacHex;

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i += 1) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const VANTAGE = /^[a-z0-9-]{1,24}$/;
const COMPONENT = /^[a-z0-9_-]{1,32}$/;
/** Validate an /ingest body; returns { vantage, results } or null. */
export function parseReport(text) {
  let b; try { b = JSON.parse(text); } catch { return null; }
  if (!b || typeof b.vantage !== "string" || !VANTAGE.test(b.vantage) || !Array.isArray(b.results) || b.results.length < 1 || b.results.length > 20) return null;
  const results = [];
  for (const r of b.results) {
    if (!r || typeof r.component !== "string" || !COMPONENT.test(r.component)) return null;
    results.push({ component: r.component, ok: r.ok === true, ms: Number.isFinite(r.ms) ? Math.min(Math.max(0, r.ms), 120_000) : 0, degraded: r.degraded === true });
  }
  return { vantage: b.vantage, results };
}

// ---------------------------------------------------------------------------------------------------- storage
async function load(env) {
  try { return (await env.STATUS.get("state", "json")) || emptyState(); } catch { return emptyState(); }
}
async function save(env, state) { await env.STATUS.put("state", JSON.stringify(state)); }

// ---------------------------------------------------------------------------------------------------- the page
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fill = (text, values) => String(text || "").replace(/\{(\w+)\}/g, (_, k) => (k in values ? String(values[k]) : `{${k}}`));

export function pageStyle() {
  const c = tokens.color; const s = c.status;
  return `body{margin:0;background:${c.bg.canvas.light};color:${c.text.primary.light};font-family:"Readex Pro",system-ui,sans-serif;line-height:1.6}`
    + `main{max-width:44rem;margin:0 auto;padding:1.5rem 1rem 3rem}h1{margin:.25rem 0}h2{font-size:1.1rem;margin:2rem 0 .5rem}p.sub,small,.muted{color:${c.text.secondary.light}}`
    + `.banner{border-radius:1.25rem;padding:1rem 1.25rem;font-weight:700;margin:1rem 0}.up{background:${s.success.bg.light};color:${s.success.fg.light}}.degraded{background:${s.warning.bg.light};color:${s.warning.fg.light}}`
    + `.down{background:${s.danger.bg.light};color:${s.danger.fg.light}}.unknown{background:${s.neutral.bg.light};color:${s.neutral.fg.light}}`
    + `ul{list-style:none;padding:0;margin:0}li.row{background:${c.bg.surface.light};border:1px solid ${c.border.subtle.light};border-radius:1rem;padding:.8rem 1rem;margin:.5rem 0;display:flex;flex-wrap:wrap;gap:.25rem 1rem;align-items:center;justify-content:space-between}`
    + `.pill{border-radius:999px;padding:.1rem .7rem;font-size:.85rem;font-weight:700}nav a{color:${c.text.link.light};margin-inline-end:.75rem}`
    + `@media (prefers-color-scheme:dark){body{background:${c.bg.canvas.dark};color:${c.text.primary.dark}}p.sub,small,.muted{color:${c.text.secondary.dark}}`
    + `.up{background:${s.success.bg.dark};color:${s.success.fg.dark}}.degraded{background:${s.warning.bg.dark};color:${s.warning.fg.dark}}.down{background:${s.danger.bg.dark};color:${s.danger.fg.dark}}.unknown{background:${s.neutral.bg.dark};color:${s.neutral.fg.dark}}`
    + `li.row{background:${c.bg.surface.dark};border-color:${c.border.subtle.dark}}nav a{color:${c.text.link.dark}}}`;
}

export function pickLocale(request) {
  const q = new URL(request.url).searchParams.get("lang");
  if (q && LOCALES.includes(q)) return q;
  for (const part of (request.headers.get("accept-language") || "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase().split("-")[0];
    const norm = tag === "tl" ? "fil" : tag;
    if (LOCALES.includes(norm)) return norm;
  }
  return "ar";
}

export function renderPage(state, locale, now) {
  const m = MESSAGES[locale].StatusPage;
  const nf = new Intl.NumberFormat(locale === "fil" ? "fil-PH" : locale, { maximumFractionDigits: 2 });
  const pct = (v) => (v === null ? "—" : `${nf.format(v)}%`);
  const dt = new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" });
  const all = overall(state, now);
  const headline = { up: m.allUp, degraded: m.someDegraded, down: m.someDown, unknown: m.noData }[all];
  const label = { up: m.statusUp, degraded: m.statusDegraded, down: m.statusDown, unknown: m.statusUnknown };
  const comps = components(state);
  const rows = comps.map((c) => {
    const st = componentStatus(state, c, now);
    const name = KNOWN[c] && m[KNOWN[c]] ? m[KNOWN[c]] : c;
    return `<li class="row"><span><strong>${esc(name)}</strong><br><small>${esc(fill(m.uptime30, { percent: pct(uptime(state, c, 30, now)) }))} · ${esc(fill(m.uptime90, { percent: pct(uptime(state, c, 90, now)) }))}</small></span><span class="pill ${st}">${esc(label[st])}</span></li>`;
  }).join("");
  const stale = comps.some((c) => Object.values(state.vantages).some((v) => v.results[c] && v.results[c].degraded && v.results[c].ok));
  const incidents = state.incidents.slice(0, 10).map((i) => {
    const name = KNOWN[i.component] && m[KNOWN[i.component]] ? m[KNOWN[i.component]] : i.component;
    const when = dt.format(new Date(i.from));
    const what = i.to ? fill(m.resolved, { minutes: nf.format(Math.max(1, Math.round((i.to - i.from) / 60_000))) }) : m.ongoing;
    return `<li class="row"><span><strong>${esc(name)}</strong><br><small>${esc(when)}</small></span><span class="pill ${i.to ? "up" : "down"}">${esc(what)}</span></li>`;
  }).join("");
  const nav = LOCALES.map((l) => (l === locale ? `<strong>${l}</strong>` : `<a href="?lang=${l}" hreflang="${l}">${l}</a>`)).join(" ");
  return `<!doctype html><html lang="${locale}" dir="${RTL.has(locale) ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<meta http-equiv="refresh" content="60"><title>${esc(m.title)}</title><style>${pageStyle()}</style></head><body><main>`
    + `<nav aria-label="${esc(m.language)}">${nav}</nav><h1>${esc(m.title)}</h1><p class="sub">${esc(m.subtitle)}</p>`
    + `<div class="banner ${all}" role="status">${esc(headline)}</div>${stale ? `<p class="muted">${esc(m.staleCopyNote)}</p>` : ""}`
    + `<ul>${rows}</ul><p class="muted">${esc(fill(m.vantages, { count: nf.format(vantageCount(state, now)) }))}${state.updated ? ` · ${esc(fill(m.lastChecked, { time: dt.format(new Date(state.updated)) }))}` : ""}</p>`
    + `<h2>${esc(m.incidentsTitle)}</h2>${incidents ? `<ul>${incidents}</ul>` : `<p class="muted">${esc(m.noIncidents)}</p>`}</main></body></html>`;
}

export function publicJson(state, now) {
  return {
    status: overall(state, now), updated: state.updated ? new Date(state.updated).toISOString() : null, vantages: vantageCount(state, now),
    components: components(state).map((id) => ({ id, status: componentStatus(state, id, now), uptime_30d: uptime(state, id, 30, now), uptime_90d: uptime(state, id, 90, now) })),
    incidents: state.incidents.slice(0, 10).map((i) => ({ component: i.component, from: new Date(i.from).toISOString(), to: i.to ? new Date(i.to).toISOString() : null })),
  };
}

let STYLE_HASH = null;
async function styleHash() {
  if (!STYLE_HASH) {
    const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(pageStyle())));
    STYLE_HASH = `sha256-${btoa(String.fromCharCode(...d))}`;
  }
  return STYLE_HASH;
}

// ---------------------------------------------------------------------------------------------------- the worker
export async function handle(request, env, now = Date.now()) {
  const url = new URL(request.url);
  if (url.pathname === "/ingest") {
    if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
    if (!env.INGEST_SECRET) return new Response("not configured", { status: 503 });
    const body = await request.text();
    if (body.length > 8192) return new Response("too large", { status: 413 });
    const given = request.headers.get("x-status-signature") || "";
    if (!safeEqual(given, await hmacHex(env.INGEST_SECRET, body))) return new Response("forbidden", { status: 403 });
    const report = parseReport(body);
    if (!report) return new Response("bad report", { status: 400 });
    await save(env, applyReport(await load(env), report.vantage, report.results, now));
    return new Response("ok", { status: 202 });
  }
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("method not allowed", { status: 405 });
  const state = await load(env);
  if (url.pathname === "/api/status.json") {
    return new Response(JSON.stringify(publicJson(state, now)), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=30", "access-control-allow-origin": "*" } });
  }
  if (url.pathname !== "/" ) return new Response("not found", { status: 404 });
  const locale = pickLocale(request);
  return new Response(renderPage(state, locale, now), {
    headers: {
      "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=30", vary: "accept-language",
      "content-security-policy": `default-src 'none'; style-src '${await styleHash()}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
    },
  });
}

/** The cron: probe from this edge, fold into the state. */
export async function runCron(env, now = Date.now(), fetchImpl = fetch) {
  const results = await Promise.all(TARGETS.map((t) => probe(t, fetchImpl)));
  await save(env, applyReport(await load(env), "cloudflare", results, now));
  return results;
}

export default {
  fetch: (request, env) => handle(request, env),
  scheduled: (_event, env, ctx) => ctx.waitUntil(runCron(env)),
};
