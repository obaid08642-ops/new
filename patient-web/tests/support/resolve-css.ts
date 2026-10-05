import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * The web components are styled by class (packages/ui/components/components.css: the
 * patient-web CSP refuses style attributes). The contract tests were written against the
 * inline styles, so this helper puts the stylesheet's effect back into the markup they read:
 * every element gets a `style` attribute holding the declarations of the rules that match it,
 * cascaded by specificity then source order, serialised as React used to (`prop:value;…`).
 * An assertion like `toContain("height:56px")` therefore checks what the stylesheet actually
 * applies to that element, not a string in a source file.
 *
 * Scope: the selector subset the component sheets use — type, .class, [attr] and [attr="v"]
 * compounds joined by descendant or child combinators. Rules with a pseudo-class or
 * pseudo-element (:hover, :focus-within, ::placeholder) and at-rules (@media, @keyframes)
 * describe states and media a static render does not have, so they are skipped.
 */

function loadCss(file: string): string {
  return readFileSync(file, "utf8").replace(/^@import "([^"]+)";$/gm, (_, rel: string) => loadCss(join(dirname(file), rel)));
}

const SHEET = loadCss(resolve(process.cwd(), "../packages/ui/components/components.css"));

type Decl = [string, string];
type Rule = { selector: string; decls: Decl[]; order: number };

function parseRules(css: string): Rule[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  let i = 0;
  let order = 0;
  while (i < src.length) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const prelude = src.slice(i, open).trim();
    // find the matching close brace (at-rules nest)
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === "{") depth += 1;
      else if (src[j] === "}") depth -= 1;
      j += 1;
    }
    const body = src.slice(open + 1, j - 1);
    i = j;
    if (prelude.startsWith("@")) continue;
    const decls = body
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const k = d.indexOf(":");
        return [d.slice(0, k).trim(), d.slice(k + 1).trim().replace(/\s+/g, " ")] as Decl;
      });
    for (const selector of prelude.split(",").map((s) => s.trim())) rules.push({ selector, decls, order: order++ });
  }
  return rules;
}

const RULES = parseRules(SHEET);

type El = { tag: string; attrs: Record<string, string>; parent: El | null; start: number; end: number };

/** Tokenise renderToStaticMarkup output into an element tree (it is well-formed by construction). */
function parseHtml(html: string): El[] {
  const els: El[] = [];
  const stack: El[] = [];
  // HTML void elements; React closes SVG children explicitly (<path></path>), so they are not void.
  const VOID = new Set(["input", "img", "br", "hr", "meta", "link", "source", "area", "col", "wbr"]);
  const re = /<\/?([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [whole, tag, attrText, selfClose] = m;
    if (whole.startsWith("</")) {
      if (stack[stack.length - 1]?.tag === tag.toLowerCase()) stack.pop();
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of attrText.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] ?? "";
    const el: El = { tag: tag.toLowerCase(), attrs, parent: stack[stack.length - 1] ?? null, start: m.index, end: m.index + whole.length };
    els.push(el);
    if (!selfClose && !VOID.has(el.tag)) stack.push(el);
  }
  return els;
}

type Compound = { tag?: string; classes: string[]; attrs: Array<[string, string | undefined]> };

function parseCompound(text: string): Compound | null {
  if (/:/.test(text)) return null;
  const c: Compound = { classes: [], attrs: [] };
  const re = /([a-zA-Z][\w-]*)|\.([\w-]+)|\[([\w-]+)(?:="?([^"\]]*)"?)?\]|(\*)/g;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(text))) {
    if (m.index !== consumed) return null;
    consumed = m.index + m[0].length;
    if (m[1]) c.tag = m[1].toLowerCase();
    else if (m[2]) c.classes.push(m[2]);
    else if (m[3]) c.attrs.push([m[3], m[4]]);
  }
  return consumed === text.length ? c : null;
}

function matchesCompound(el: El, c: Compound): boolean {
  if (c.tag && c.tag !== el.tag) return false;
  const cls = (el.attrs.class ?? "").split(/\s+/);
  if (!c.classes.every((k) => cls.includes(k))) return false;
  return c.attrs.every(([k, v]) => k in el.attrs && (v === undefined || el.attrs[k] === v));
}

type Selector = { parts: Compound[]; combinators: string[]; specificity: number };

function parseSelector(text: string): Selector | null {
  const tokens = text.replace(/\s*>\s*/g, " > ").split(/\s+/).filter(Boolean);
  const parts: Compound[] = [];
  const combinators: string[] = [];
  for (const t of tokens) {
    if (t === ">") {
      combinators[parts.length - 1] = ">";
      continue;
    }
    const c = parseCompound(t);
    if (!c) return null;
    if (parts.length) combinators[parts.length - 1] ??= " ";
    parts.push(c);
  }
  const specificity = parts.reduce((s, p) => s + (p.classes.length + p.attrs.length) * 100 + (p.tag ? 1 : 0), 0);
  return { parts, combinators, specificity };
}

function matches(el: El, sel: Selector, idx = sel.parts.length - 1): boolean {
  if (!matchesCompound(el, sel.parts[idx])) return false;
  if (idx === 0) return true;
  const comb = sel.combinators[idx - 1];
  if (comb === ">") return !!el.parent && matches(el.parent, sel, idx - 1);
  for (let p = el.parent; p; p = p.parent) if (matches(p, sel, idx - 1)) return true;
  return false;
}

const COMPILED = RULES.map((r) => ({ ...r, sel: parseSelector(r.selector) })).filter((r) => r.sel) as Array<Rule & { sel: Selector }>;

/** The markup with each element's cascaded component-sheet declarations as its style attribute. */
export function withResolvedStyles(html: string): string {
  const els = parseHtml(html);
  // Custom properties the sheet defines (the tone classes' --nabd-tone-*) inherit like any
  // custom property and are substituted, so a tone assertion sees the token it resolves to.
  const custom = new Map<El, Map<string, string>>();
  let out = "";
  let cursor = 0;
  for (const el of els) {
    const hits = COMPILED.filter((r) => matches(el, r.sel)).sort((a, b) => a.sel.specificity - b.sel.specificity || a.order - b.order);
    const vars = new Map(el.parent ? custom.get(el.parent) : undefined);
    const decls = new Map<string, string>();
    for (const r of hits) for (const [k, v] of r.decls) {
      if (k.startsWith("--")) vars.set(k, v);
      else { decls.delete(k); decls.set(k, v); }
    }
    custom.set(el, vars);
    if (!decls.size) continue;
    const sub = (v: string) => v.replace(/var\((--nabd-tone-[\w-]+)\)/g, (m, name: string) => vars.get(name) ?? m);
    const style = [...decls].map(([k, v]) => `${k}:${sub(v)}`).join(";");
    const tagEnd = html.lastIndexOf(">", el.end - 1);
    const insertAt = html[tagEnd - 1] === "/" ? tagEnd - 1 : tagEnd;
    out += html.slice(cursor, insertAt) + ` style="${style}"`;
    cursor = insertAt;
  }
  return out + html.slice(cursor);
}

/** The component sheet text, for source-level checks (no raw hex, token colours only). */
export const COMPONENT_CSS = SHEET;
