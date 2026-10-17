// P14.19 waiting room for extreme spikes (campaign launches, Ramadan offers): a Cloudflare Worker in front of the web
// checkout entry pages only (owner decision recorded in deploy/SCALING.md: no Business-plan Waiting Room; a Worker
// queue in front of checkout when a campaign needs one).
//
// - Off unless WAITING_ROOM=on. Guarded: GET document requests to /{locale}/cart/checkout and /{locale}/pharmacy/payment.
//   Everything else passes untouched, above all the payment result pages (a patient back from the gateway is never
//   queued) and the API (load shedding, P14.17, protects it).
// - Admission is a rate: ADMIT_PER_MINUTE visitors per minute, a BURST of them at once. One Durable Object (Room)
//   keeps the FIFO: a visitor beyond the rate gets a ticket and a waiting page (HTTP 200, position, refreshes itself
//   every 15 s); when the rate reaches their ticket they are admitted. Nobody gets an error because of the spike.
// - Admitted visitors carry a signed cookie (nabd_wr, ADMIT_MINUTES valid) and pass every guarded page until it
//   expires; the ticket cookie is signed too, so a position cannot be forged.
// - Fail open: no secret, no Durable Object, or any error -> the request goes to the origin as if the room were off.
// Texts come from patient-web/messages/<locale>.json ("WaitingRoom"), colours from @nabd/design-tokens.
import tokens from "../../../packages/design-tokens/tokens.json" with { type: "json" };
import ar from "../../../patient-web/messages/ar.json" with { type: "json" };
import en from "../../../patient-web/messages/en.json" with { type: "json" };
import ur from "../../../patient-web/messages/ur.json" with { type: "json" };
import hi from "../../../patient-web/messages/hi.json" with { type: "json" };
import bn from "../../../patient-web/messages/bn.json" with { type: "json" };
import fil from "../../../patient-web/messages/fil.json" with { type: "json" };

const MESSAGES = { ar, en, ur, hi, bn, fil };
const RTL = new Set(["ar", "ur"]);
export const GUARDED = /^\/(ar|en|ur|hi|bn|fil)\/(cart\/checkout|pharmacy\/payment)\/?$/;
export const ADMIT_COOKIE = "nabd_wr";
export const TICKET_COOKIE = "nabd_wr_ticket";

// ---------------------------------------------------------------------------------------------------- the queue
/**
 * The room's arithmetic, pure (the Durable Object stores it). Credit accrues at `perMinute`; while visitors wait it all
 * goes to the queue (tickets between `served` and `issued`, in order), so the rate is kept however rarely they refresh.
 * With nobody waiting, unused credit is capped at `burst`: that many may walk straight in at once.
 */
export function roomStep(state, now, cfg) {
  const s = state ? { ...state } : { issued: 0, served: 0, credit: cfg.burst, at: now };
  s.credit += (Math.max(0, now - s.at) / 60_000) * cfg.perMinute;
  s.at = now;
  const move = Math.min(s.issued - s.served, Math.floor(s.credit));
  s.served += move;
  s.credit -= move;
  if (s.issued === s.served) s.credit = Math.min(s.credit, cfg.burst);
  return s;
}

export function arrive(state, now, cfg) {
  const s = roomStep(state, now, cfg);
  if (s.issued === s.served && s.credit >= 1) {
    s.credit -= 1;
    return { state: s, admitted: true };
  }
  s.issued += 1;
  return { state: s, admitted: false, ticket: s.issued, position: s.issued - s.served };
}

export function poll(state, now, cfg, ticket) {
  // a ticket the room never issued (its state was reset, or the cookie is from another room): queue again
  if (!state || ticket > state.issued) return arrive(state, now, cfg);
  const s = roomStep(state, now, cfg);
  if (ticket <= s.served) return { state: s, admitted: true };
  return { state: s, admitted: false, ticket, position: ticket - s.served };
}

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.cfg = config(env);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const now = Date.now();
    const state = await this.ctx.storage.get("room");
    const ticket = Number(url.searchParams.get("ticket") || 0);
    const r = url.pathname === "/poll" && ticket > 0 ? poll(state, now, this.cfg, ticket) : arrive(state, now, this.cfg);
    await this.ctx.storage.put("room", r.state);
    return Response.json({ admitted: r.admitted, ticket: r.ticket ?? null, position: r.position ?? 0, perMinute: this.cfg.perMinute });
  }
}

export function config(env) {
  const perMinute = Math.max(1, Number(env.ADMIT_PER_MINUTE || 120));
  return { perMinute, burst: Math.max(1, Number(env.BURST || Math.ceil(perMinute / 2))), admitMinutes: Math.max(1, Number(env.ADMIT_MINUTES || 15)) };
}

// ---------------------------------------------------------------------------------------------------- signed cookies
const enc = new TextEncoder();
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signed(secret, value) {
  return `${value}.${await hmac(secret, value)}`;
}

export async function verified(secret, cookieValue) {
  if (!cookieValue) return null;
  const i = cookieValue.lastIndexOf(".");
  if (i <= 0) return null;
  const value = cookieValue.slice(0, i);
  const expected = await hmac(secret, value);
  const got = cookieValue.slice(i + 1);
  if (expected.length !== got.length) return null;
  let diff = 0;
  for (let k = 0; k < expected.length; k++) diff |= expected.charCodeAt(k) ^ got.charCodeAt(k);
  return diff === 0 ? value : null;
}

function cookie(request, name) {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(request.headers.get("cookie") || "");
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// ---------------------------------------------------------------------------------------------------- the page
function interpolate(text, values) {
  return String(text || "").replace(/\{(\w+)\}/g, (_, k) => (k in values ? String(values[k]) : `{${k}}`));
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function waitingStyle() {
  const c = tokens.color;
  const action = c.action.primary.bg.light;
  return `body{margin:0;min-height:100vh;display:grid;place-items:center;background:${c.bg.canvas.light};color:${c.text.primary.light};font-family:"Readex Pro",system-ui,sans-serif}`
    + `main{max-width:28rem;margin:1rem;padding:2rem;background:${c.bg.surface.light};border-radius:1.25rem;text-align:center}`
    + `strong{display:block;font-size:2.5rem;color:${action};margin:1rem 0}p{color:${c.text.secondary.light};line-height:1.6}`
    + `@media (prefers-color-scheme:dark){body{background:${c.bg.canvas.dark};color:${c.text.primary.dark}}main{background:${c.bg.surface.dark}}p{color:${c.text.secondary.dark}}}`;
}

export function waitingPage(locale, position, perMinute, styleHash) {
  const m = (MESSAGES[locale] || MESSAGES.en).WaitingRoom;
  const minutes = Math.max(1, Math.ceil(position / perMinute));
  const nf = new Intl.NumberFormat(locale === "fil" ? "fil-PH" : locale);
  const html = `<!doctype html><html lang="${locale}" dir="${RTL.has(locale) ? "rtl" : "ltr"}"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="15">`
    + `<meta name="robots" content="noindex"><title>${esc(m.title)}</title><style>${waitingStyle()}</style></head>`
    + `<body><main><h1>${esc(m.title)}</h1><p>${esc(m.body)}</p>`
    + `<strong aria-label="${esc(interpolate(m.positionLabel, { position: nf.format(position) }))}">${esc(nf.format(position))}</strong>`
    + `<p>${esc(interpolate(m.estimate, { minutes: nf.format(minutes) }))}</p><p>${esc(m.keepOpen)}</p></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": `default-src 'none'; style-src '${styleHash}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      "x-nabd-waiting-room": "queued",
    },
  });
}

let STYLE_HASH = null;
async function styleHash() {
  if (!STYLE_HASH) {
    const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(waitingStyle())));
    STYLE_HASH = `sha256-${btoa(String.fromCharCode(...d))}`;
  }
  return STYLE_HASH;
}

// ---------------------------------------------------------------------------------------------------- the worker
export function guarded(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (!GUARDED.test(url.pathname) || url.searchParams.has("_rsc") || request.headers.get("rsc") === "1") return false;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

async function withAdmission(response, secret, cfg) {
  const out = new Response(response.body, response);
  const until = Date.now() + cfg.admitMinutes * 60_000;
  out.headers.append("set-cookie", setCookie(ADMIT_COOKIE, await signed(secret, `a:${until}`), cfg.admitMinutes * 60));
  out.headers.append("set-cookie", `${TICKET_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  out.headers.set("x-nabd-waiting-room", "admitted");
  return out;
}

export async function handle(request, env) {
  const pass = () => fetch(request);
  if (env.WAITING_ROOM !== "on" || !env.WAITING_ROOM_SECRET || !env.ROOM || !guarded(request)) return pass();
  const secret = env.WAITING_ROOM_SECRET;
  const cfg = config(env);
  try {
    const admit = await verified(secret, cookie(request, ADMIT_COOKIE));
    if (admit && Number(admit.slice(2)) > Date.now()) return pass();
    const ticketValue = await verified(secret, cookie(request, TICKET_COOKIE));
    const ticket = ticketValue ? Number(ticketValue.slice(2)) : 0;
    const room = env.ROOM.get(env.ROOM.idFromName("checkout"));
    const r = await (await room.fetch(`https://room/${ticket ? `poll?ticket=${ticket}` : "arrive"}`)).json();
    if (r.admitted) return withAdmission(await pass(), secret, cfg);
    const locale = new URL(request.url).pathname.split("/")[1];
    const page = waitingPage(locale, r.position, r.perMinute, await styleHash());
    page.headers.append("set-cookie", setCookie(TICKET_COOKIE, await signed(secret, `t:${r.ticket}`), 2 * 3600));
    return page;
  } catch {
    return pass();
  }
}

export default { fetch: (request, env) => handle(request, env) };
