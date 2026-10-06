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

/**
 * Puts the nonce on the page: Next writes the placeholder it read from the proxy's policy on the tags it renders,
 * so every placeholder becomes the nonce, then every <script>/<style> opening tag that still has none gets one.
 */
export function stampTags(html, nonce) {
  return html
    .split(CSP_NONCE_PLACEHOLDER).join(nonce)
    .replace(OPEN_TAG, (tag, name, attrs) => (/\snonce\s*=/i.test(attrs) ? tag : `<${name} nonce="${nonce}"${attrs}>`));
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
