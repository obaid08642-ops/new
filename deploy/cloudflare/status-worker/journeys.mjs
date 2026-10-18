// P20.7 synthetic journeys in production: what a patient does, run every 10 minutes by the status worker's cron, without paying.
//   home -> search -> open a product -> sign in as the test patient -> add to cart -> (remove it again) -> list doctor slots
// Each journey reports to the status page (vantage "journeys"). A journey that fails on two runs in a row alerts the owner
// (Telegram and e-mail, from the worker itself, so it works while the API is down); a recovery is announced once.
//
// The test patient is a real, clearly named account (docs/ops/synthetic-journeys.md); its identifier and password are worker
// secrets and appear in no log, no status page and no message. Without them the sign-in and cart journeys are skipped (not
// failed). The journeys never touch checkout or payment: the only write is one cart line, removed in the same run.
const API = "https://api.nabd.plus/api/v1";
const SITE = "https://nabd.plus";

export const JOURNEY_IDS = ["home", "search", "product", "login", "cart", "doctors"];

const HEADERS = { accept: "application/json", "user-agent": "nabd-synthetic/1" };
const timeout = () => AbortSignal.timeout(10_000);

async function call(fetchImpl, method, url, { token, body, idempotent } = {}) {
  const headers = { ...HEADERS };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (idempotent) headers["idempotency-key"] = crypto.randomUUID();
  const res = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual", signal: timeout() });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, text, json };
}
const list = (j) => (Array.isArray(j) ? j : j?.data || j?.items || j?.doctors || j?.results || []);
const fail = (detail) => ({ ok: false, detail });
const pass = (detail = "") => ({ ok: true, detail });
const tomorrow = (now) => new Date(now + 86_400_000).toISOString().slice(0, 10);

/** The journeys, in order. Each gets the shared context and returns { ok, detail } (detail never holds a secret). */
const STEPS = {
  async home({ fetchImpl }) {
    const r = await call(fetchImpl, "GET", `${SITE}/ar?__synthetic=1`);
    if (r.status !== 200) return fail(`http ${r.status}`);
    return /<html/i.test(r.text) && r.text.length > 5000 ? pass() : fail("the page is empty");
  },
  async search({ fetchImpl, env, ctx }) {
    const term = env.SYNTH_SEARCH_TERM || "بنادول";
    const r = await call(fetchImpl, "GET", `${API}/search/suggest?q=${encodeURIComponent(term)}&locale=ar`);
    if (r.status !== 200) return fail(`http ${r.status}`);
    const rows = list(r.json?.suggestions ? { items: r.json.suggestions } : r.json);
    if (!rows.length) return fail("no suggestion for the test term");
    ctx.medicine = rows.find((s) => s.type === "medicine" && s.slug && s.id) || null;
    return pass();
  },
  async product({ fetchImpl, ctx }) {
    if (!ctx.medicine) return fail("search found no medicine to open");
    const page = await call(fetchImpl, "GET", `${SITE}/ar/p/${encodeURIComponent(ctx.medicine.slug)}?__synthetic=1`);
    if (page.status !== 200) return fail(`page http ${page.status}`);
    const api = await call(fetchImpl, "GET", `${API}/medicines/${encodeURIComponent(ctx.medicine.id)}`);
    return api.status === 200 ? pass() : fail(`api http ${api.status}`);
  },
  async login({ fetchImpl, env, ctx }) {
    if (!env.SYNTH_IDENTIFIER || !env.SYNTH_PASSWORD) return null;     // not configured: skipped
    const r = await call(fetchImpl, "POST", `${API}/auth/login`, { body: { identifier: env.SYNTH_IDENTIFIER, password: env.SYNTH_PASSWORD } });
    const token = r.json?.token || r.json?.access_token || r.json?.accessToken;
    if (r.status >= 300 || !token) return fail(`http ${r.status}${r.json?.requires_2fa ? " (the test account asks for 2FA)" : ""}`);
    ctx.token = token;
    const me = await call(fetchImpl, "GET", `${API}/users/me`, { token });
    return me.status === 200 ? pass() : fail(`profile http ${me.status}`);
  },
  async cart({ fetchImpl, env, ctx }) {
    if (!env.SYNTH_IDENTIFIER || !env.SYNTH_PASSWORD) return null;
    if (!ctx.token) return fail("not signed in");
    if (!ctx.medicine) return fail("search found no medicine to add");
    const add = await call(fetchImpl, "POST", `${API}/cart/items`, { token: ctx.token, body: { medicine_id: ctx.medicine.id, quantity: 1 }, idempotent: true });
    if (add.status >= 300) return fail(`add http ${add.status}`);
    const line = findLine(add.json, ctx.medicine.id);
    let verdict;
    try {
      const cart = await call(fetchImpl, "GET", `${API}/cart`, { token: ctx.token });
      verdict = cart.status === 200 && findLine(cart.json, ctx.medicine.id) ? pass() : fail(`the line is not in the cart (http ${cart.status})`);
    } catch { verdict = fail("reading the cart failed"); }
    // always put the cart back as it was, whatever the check said
    const lineId = line || (await call(fetchImpl, "GET", `${API}/cart`, { token: ctx.token }).then((c) => findLine(c.json, ctx.medicine.id)).catch(() => null));
    if (lineId) {
      const del = await call(fetchImpl, "DELETE", `${API}/cart/items/${encodeURIComponent(lineId)}`, { token: ctx.token, idempotent: true }).catch(() => ({ status: 0 }));
      if (del.status >= 300 && verdict.ok) verdict = fail(`could not remove the test line (http ${del.status})`);
    }
    return verdict;
  },
  async doctors({ fetchImpl, now }) {
    const l = await call(fetchImpl, "GET", `${API}/care/doctors?limit=5`);
    if (l.status !== 200) return fail(`list http ${l.status}`);
    const doctor = list(l.json).find((d) => d && (d.id || d._id));
    if (!doctor) return fail("no doctor is listed");
    const s = await call(fetchImpl, "GET", `${API}/care/doctors/${encodeURIComponent(doctor.id || doctor._id)}/slots?date=${tomorrow(now)}&service_type=video`);
    if (s.status !== 200) return fail(`slots http ${s.status}`);
    return Array.isArray(s.json?.slots) ? pass() : fail("the slots answer has no list");
  },
};

/** The cart line holding `medicineId` in a cart answer (several shapes: lines[] or items[], line_id / id). */
function findLine(json, medicineId) {
  const cart = json?.cart || json;
  const lines = cart?.lines || cart?.items || [];
  const hit = lines.find((l) => [l.service_id, l.medicine_id, l.product_id, l?.meta?.medicine_id].map(String).includes(String(medicineId)));
  return hit ? hit.line_id || hit.id || hit._id || null : null;
}

/**
 * Run every journey once (a failing one is retried once at once, so a single dropped request is not a failure).
 * Returns [{ component, ok, ms, detail }] for the journeys that ran.
 */
export async function runJourneys(env, { fetchImpl = fetch, now = Date.now() } = {}) {
  const ctx = {};
  const out = [];
  for (const id of JOURNEY_IDS) {
    const started = Date.now();
    const attempt = async () => {
      try { return await STEPS[id]({ fetchImpl, env, ctx, now }); } catch (e) { return fail(e && e.name === "TimeoutError" ? "timeout" : "error"); }
    };
    let r = await attempt();
    if (r && !r.ok && id !== "cart") r = (await attempt()) || r;       // the cart journey writes, it is not repeated blindly
    if (r === null) continue;                                          // skipped
    out.push({ component: id, ok: r.ok, ms: Date.now() - started, degraded: false, detail: r.detail });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- alerts
/** Count consecutive failures per journey; returns the new counters and the notices to send (down on the 2nd failure, recovered once). Pure. */
export function journeyNotices(prev, results) {
  const next = { ...(prev || {}) };
  const notices = [];
  for (const r of results) {
    const cur = next[r.component] || { fails: 0, alerted: false };
    if (r.ok) {
      if (cur.alerted) notices.push({ component: r.component, type: "recovered" });
      next[r.component] = { fails: 0, alerted: false };
    } else {
      const fails = cur.fails + 1;
      const alert = fails >= 2 && !cur.alerted;
      if (alert) notices.push({ component: r.component, type: "down", detail: r.detail });
      next[r.component] = { fails, alerted: cur.alerted || alert };
    }
  }
  return { journeys: next, notices };
}

/** Telegram and e-mail (Resend), each only if its secrets are set. Never throws; returns what went out. */
export async function notify(env, subject, text, fetchImpl = fetch) {
  const out = { telegram: false, email: false };
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ALERT_CHAT_ID) {
    try {
      const r = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, signal: timeout(), body: JSON.stringify({ chat_id: env.TELEGRAM_ALERT_CHAT_ID, text: `${subject}\n${text}`.slice(0, 3800), disable_web_page_preview: true }) });
      out.telegram = r.ok;
    } catch { /* never log: the URL holds the token */ }
  }
  if (env.RESEND_API_KEY && env.OPS_ALERT_EMAIL && env.MAIL_FROM) {
    try {
      const r = await fetchImpl("https://api.resend.com/emails", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${env.RESEND_API_KEY}` }, signal: timeout(), body: JSON.stringify({ from: env.MAIL_FROM, to: [env.OPS_ALERT_EMAIL], subject, text }) });
      out.email = r.ok;
    } catch { /* ignore */ }
  }
  return out;
}

export function noticeText(n, statusUrl = "https://status.nabd.plus") {
  const name = n.component;
  return n.type === "down"
    ? { subject: `[Nabd+ journey FAILED] ${name}`, text: `The synthetic journey "${name}" failed on two runs in a row${n.detail ? ` (${n.detail})` : ""}.\nA patient may not be able to do this right now.\nStatus: ${statusUrl}\nRunbook: https://github.com/obaid08642-ops/new/blob/main/docs/ops/synthetic-journeys.md` }
    : { subject: `[Nabd+ journey RECOVERED] ${name}`, text: `The synthetic journey "${name}" passes again.\nStatus: ${statusUrl}` };
}
