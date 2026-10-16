// F68: stamps a per-response CSP nonce on cached public HTML (see lib/security/csp.ts for the why).
// Pure functions, no I/O, so they are unit-tested on their own (tests/nonce-transform.test.ts).
import { randomBytes } from "node:crypto";

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
