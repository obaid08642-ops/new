// F68: stamps a per-response CSP nonce on cached public HTML (see lib/security/csp.ts for the why).
// Pure functions, no I/O, so they are unit-tested on their own (tests/nonce-transform.test.ts).
import { createHash, randomBytes } from "node:crypto";

export const CSP_NONCE_PLACEHOLDER = "nabdCspNoncePlaceholder0000";
export const CSP_INJECT_HEADER = "x-nabd-csp-inject";
export const UNAVAILABLE_FALLBACK_HEADER = "x-nabd-unavailable";

export function freshNonce() {
  return randomBytes(18).toString("base64");
}

/** The policy the proxy wrote with the placeholder, now holding the real nonce. */
export function policyWithNonce(policy, nonce) {
  return String(policy || "").split(CSP_NONCE_PLACEHOLDER).join(nonce);
}

// An opening <script …> or <style …> tag (case-insensitive), up to its closing ">".
const OPEN_TAG = /<(script|style)(?=[\s>/])([^>]*)>/gi;

// A <link ... as="script"> (a preload of a script): under script-src with a nonce and 'strict-dynamic' the browser refuses it
// without one. Next stamps these itself while it renders a request, but a page prerendered at build time (the unavailable
// page) was rendered with no policy to read, so they are stamped here.
const SCRIPT_PRELOAD = /<link(?=[\s/>])([^>]*\sas\s*=\s*["']?script[^>]*)>/gi;

/**
 * Puts the nonce on the page: Next writes the placeholder it read from the proxy's policy on the tags it renders,
 * so every placeholder becomes the nonce, then every <script>/<style> opening tag that still has none gets one.
 */
export function stampTags(html, nonce) {
  return html
    .split(CSP_NONCE_PLACEHOLDER).join(nonce)
    .replace(OPEN_TAG, (tag, name, attrs) => (/\snonce\s*=/i.test(attrs) ? tag : `<${name} nonce="${nonce}"${attrs}>`))
    .replace(SCRIPT_PRELOAD, (tag, attrs) => (/\snonce\s*=/i.test(attrs) ? tag : `<link nonce="${nonce}"${attrs}>`));
}

/**
 * Streaming version: chunks may split a tag ("<scr" | "ipt>") or the placeholder. Everything up to the last "<"
 * that might start an unfinished tag, and short of a possible partial placeholder, is emitted; the rest waits.
 */
export function createStamper(nonce) {
  let carry = "";
  const keep = CSP_NONCE_PLACEHOLDER.length - 1;
  return {
    push(chunk) {
      const text = carry + chunk;
      const lastOpen = text.lastIndexOf("<");
      let cut = lastOpen !== -1 && text.indexOf(">", lastOpen) === -1 ? lastOpen : text.length;
      cut = Math.max(0, Math.min(cut, text.length - keep));
      // Never cut inside a tag: move back to its "<" when the tag's ">" lies past the cut.
      const lt = cut > 0 ? text.lastIndexOf("<", cut - 1) : -1;
      if (lt !== -1 && text.indexOf(">", lt) >= cut) cut = lt;
      carry = text.slice(cut);
      return stampTags(text.slice(0, cut), nonce);
    },
    end() {
      const rest = carry;
      carry = "";
      return stampTags(rest, nonce);
    },
  };
}

// Owner decision 43 a (issue 427): the theme a visitor chose travels in this cookie (app/theme.ts, saveThemeChoice), and the
// server writes it on <html>, so the first paint is already in that theme and the page's theme script can sit after the
// content. Same name as the storage key.
export const THEME_COOKIE = "nabd.theme";

/** "light" or "dark" when the request's Cookie header carries an explicit choice, otherwise null (the script decides). */
export function themeFromCookie(cookieHeader) {
  const header = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : String(cookieHeader || "");
  const match = /(?:^|;\s*)nabd\.theme=(light|dark)(?=;|$)/.exec(header);
  return match ? match[1] : null;
}

const HTML_OPEN = /<html(?=[\s>])([^>]*)>/i;

/** Both theme hooks and the colour scheme on the page's <html> tag (app/theme.ts says why both), unless it has a theme. */
export function stampTheme(html, theme) {
  if (theme !== "light" && theme !== "dark") return html;
  return html.replace(HTML_OPEN, (tag, attrs) => (/\sdata-theme\s*=/i.test(attrs)
    ? tag
    : `<html data-theme="${theme}"${theme === "dark" ? ' class="dark"' : ""} style="color-scheme:${theme}"${attrs}>`));
}

/**
 * Streaming version: holds the start of the document until the <html> tag is complete (it is in the first bytes), stamps
 * it, then lets everything through. A document with no <html> tag in its first 16 KB passes unchanged.
 */
export function createThemeStamper(theme) {
  let held = "";
  let done = theme !== "light" && theme !== "dark";
  return {
    push(chunk) {
      if (done) return chunk;
      held += chunk;
      if (HTML_OPEN.test(held) || held.length > 16384) {
        done = true;
        const out = stampTheme(held, theme);
        held = "";
        return out;
      }
      return "";
    },
    end() {
      const rest = held;
      held = "";
      if (done) return rest;
      done = true;
      return stampTheme(rest, theme);
    },
  };
}

// ── Owner decision 2026-10-16: a copy a shared cache keeps never carries a nonce (no nonce is ever shared or reused). ──
// A guest's copy of a public page goes out with a hash-based policy instead: script-src lists the sha256 of every inline
// <script> of THAT copy plus 'strict-dynamic', and nothing else may run inline. The hashes cannot be fixed at build time:
// Next's inline flight scripts (`self.__next_f.push(…)`) hold the page's data and change with every ISR revalidation
// (measured on a production build: the build's prerendered HTML and the served copy of the same page differ), so they are
// computed here, from the exact bytes of the copy being sent, and travel in the same response the edge keeps.
// Under 'strict-dynamic' a parser-inserted <script src> needs a nonce or a matching hash; an external file has no inline body
// to hash (and hashes for external scripts are not supported in every browser), so the page's <script src> tags are replaced
// by one inline, hashed loader that inserts the same scripts, with the same attributes and in the same order; scripts a
// trusted script inserts are allowed by 'strict-dynamic'. The <link rel=preload as=script> hints are dropped (a hint without
// a nonce is refused under 'strict-dynamic'); the loader requests the same files at once.

const NONCE_ATTR = /\snonce\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const NONCE_BEARING_TAG = /<(script|style|link)(?=[\s>/])[^>]*>/gi;
const SCRIPT_BLOCK = /<script(?=[\s>])([^>]*)>([\s\S]*?)<\/script[^>]*>/gi;
const STYLE_BLOCK = /<style(?=[\s>])[^>]*>([\s\S]*?)<\/style\s*>/gi;
const SCRIPT_HINT = /<link(?=[\s/>])[^>]*\b(?:as\s*=\s*["']?script\b|rel\s*=\s*["']?modulepreload\b)[^>]*>/gi;
const ATTRIBUTE = /([^\s"'=<>/`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const ENTITIES = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", "#39": "'", "#x27": "'" };

const decodeEntities = (value) => value.replace(/&(amp|quot|apos|lt|gt|#39|#x27);/gi, (_m, name) => ENTITIES[name.toLowerCase()]);

/** 'sha256-…' of the exact text, as a CSP hash source. */
export function sha256Source(text) {
  return `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
}

/** The attributes of an opening tag as name → value (a boolean attribute is ""), without nonce. */
export function tagAttributes(attrs) {
  const out = {};
  for (const m of String(attrs).matchAll(ATTRIBUTE)) {
    const name = m[1].toLowerCase();
    if (name === "nonce") continue;
    out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

/** The inline loader that stands in for the page's <script src> tags (see above). JSON is escaped so it can never close the tag. */
export function scriptLoader(scripts) {
  const list = JSON.stringify(scripts).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `(function(){var d=document,c=d.currentScript,l=${list};for(var i=0;i<l.length;i++){var e=d.createElement("script"),a=l[i];for(var k in a)e.setAttribute(k,a[k]);if(!("async" in a))e.async=false;c.parentNode.insertBefore(e,c)}})()`;
}

/**
 * The copy of a page a shared cache may keep: no nonce anywhere (attributes and the placeholder Next wrote in its payload are
 * removed), the external scripts behind one hashed loader, and the hash of every inline <script> and <style> that is left.
 */
export function hashedPage(html) {
  let page = String(html)
    .replace(NONCE_BEARING_TAG, (tag) => tag.replace(NONCE_ATTR, ""))
    .split(CSP_NONCE_PLACEHOLDER).join("")
    .replace(SCRIPT_HINT, "");
  const external = [];
  let first = true;
  // Removing a block could join the text around it into a new tag, so the removal repeats until nothing changes; every
  // script left after it is either hashed below or makes the function throw.
  let before;
  do {
    before = page;
    page = page.replace(SCRIPT_BLOCK, (block, attrs, body) => {
      const attributes = tagAttributes(attrs);
      if (!("src" in attributes) || body.trim() !== "") return block;
      external.push(attributes);
      if (!first) return "";
      first = false;
      return "\u0000NABD_LOADER\u0000";
    });
  } while (page !== before);
  if (external.length) page = page.replace("\u0000NABD_LOADER\u0000", `<script>${scriptLoader(external)}</script>`);
  const scriptHashes = [];
  for (const m of page.matchAll(SCRIPT_BLOCK)) {
    if ("src" in tagAttributes(m[1])) throw new Error("hashedPage: an external script was left behind");
    const source = sha256Source(m[2]);
    if (!scriptHashes.includes(source)) scriptHashes.push(source);
  }
  const styleHashes = [];
  for (const m of page.matchAll(STYLE_BLOCK)) {
    const source = sha256Source(m[1]);
    if (!styleHashes.includes(source)) styleHashes.push(source);
  }
  return { html: page, scriptHashes, styleHashes };
}

/**
 * The proxy's policy for such a copy: every nonce source removed, the copy's hashes added, 'strict-dynamic' kept. A policy
 * that would allow 'unsafe-inline' scripts is refused (throws), never sent.
 */
export function policyWithHashes(policy, scriptHashes, styleHashes) {
  return String(policy || "").split(";").map((directive) => {
    const parts = directive.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    const [name, ...sources] = parts;
    const kept = sources.filter((s) => !/^'nonce-/i.test(s));
    if (name.toLowerCase() === "script-src") {
      if (kept.some((s) => s.toLowerCase() === "'unsafe-inline'")) throw new Error("policyWithHashes: 'unsafe-inline' for scripts");
      const all = [...kept, ...scriptHashes.filter((h) => !kept.includes(h))];
      if (!all.includes("'strict-dynamic'")) all.push("'strict-dynamic'");
      return [name, ...all].join(" ");
    }
    if (name.toLowerCase() === "style-src") return [name, ...kept, ...styleHashes.filter((h) => !kept.includes(h))].join(" ");
    return [name, ...sources].join(" ");
  }).filter(Boolean).join("; ");
}
