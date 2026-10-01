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
 * Runs before first paint. Inline in <head> because a theme that resolves after
 * paint is a flash of the wrong theme on every navigation — the single most
 * visible way a dark mode can be broken.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var s=null;try{s=window.localStorage.getItem(k);}catch(e){}
var t=(s==="light"||s==="dark")?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
var d=document.documentElement;
d.setAttribute("data-theme",t);
d.classList.toggle("dark",t==="dark");
d.style.colorScheme=t;
}catch(e){}})();`;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
