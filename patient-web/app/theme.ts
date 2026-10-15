/**
 * Theme resolution (12.A3).
 *
 * ONE theme, TWO hooks, and they have to move together.
 *
 * The token layer themes itself from an attribute:
 *
 *     tokens.css   ->  [data-theme="dark"] { ... }
 *     globals.css  ->  every alias is a var(), so it follows
 *
 * But 64 page-level rules across three CSS modules were written against a CLASS:
 *
 *     :global(.dark) .categoryCard { background: #132235 }
 *
 * Nothing in the app ever set that class. So the moment the tokens flipped to
 * dark, the text went light while the panels stayed light, and 63 rendered
 * strings measured between 1.07:1 and 4.5:1 — most of the "Browse by Category"
 * heading family, the diagnostics header, the map filters, the login card.
 *
 * The fix is not to delete those rules and not to convert them one by one. The
 * fix is to make the mechanism singular: the theme is applied as BOTH
 * `data-theme="dark"` and `.dark`, so the token layer and the page layer can
 * never disagree. Any new code should read the attribute; the class exists
 * because dead overrides are worse than a redundant hook.
 */

export const THEME_STORAGE_KEY = "nabd.theme";
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * The cookie that carries an explicit choice to the server (owner decision 43 a, issue 427): the nonce server writes the
 * theme on <html> before the page leaves it (server/nonce-transform.mjs, stampTheme), so a returning visitor's first paint
 * is already in their theme and the script below no longer has to run before the content. Same name as the storage key.
 */
export const THEME_COOKIE = THEME_STORAGE_KEY;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The fallback for a page the server did not theme (no cookie yet, `next dev`, an edge copy): it resolves the theme from
 * the stored choice, the cookie or the system, sets both hooks, and copies a stored choice into the cookie so the next page
 * comes themed from the server. It sits at the END of the body: the content is parsed and painted without waiting for it.
 * The CSP allows exactly this script by its hash (lib/security/csp.ts, THEME_SCRIPT_HASH).
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var s=null;try{s=window.localStorage.getItem(k);}catch(e){}
var m=document.cookie.match(/(?:^|; )nabd\\.theme=(light|dark)(?:;|$)/);var c=m?m[1]:null;
var t=(s==="light"||s==="dark")?s:(c?c:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
var d=document.documentElement;
d.setAttribute("data-theme",t);
d.classList.toggle("dark",t==="dark");
d.style.colorScheme=t;
if((s==="light"||s==="dark")&&c!==s){document.cookie=k+"="+s+"; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax";}
}catch(e){}})();`;

/** Applies a theme to the page: both hooks and the colour scheme, always together. */
export function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/**
 * Keeps the visitor's choice on this device: in storage for the script, and in the cookie for the server. `system` removes
 * both, so the system's setting is followed again.
 */
export function saveThemeChoice(choice: Theme | "system"): void {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* no storage (private mode): the cookie below still carries the choice */
  }
  document.cookie = choice === "system"
    ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
    : `${THEME_COOKIE}=${choice}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
