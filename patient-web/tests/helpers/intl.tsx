import { createElement, Fragment, type ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Values = Record<string, unknown>;
type Dictionary = Record<string, unknown>;

const cache = new Map<string, Dictionary>();
export function messagesFor(locale: string): Dictionary {
  let data = cache.get(locale);
  if (!data) {
    data = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8")) as Dictionary;
    cache.set(locale, data);
  }
  return data;
}

function lookup(locale: string, namespace: string | undefined, key: string): string {
  let node: unknown = messagesFor(locale);
  for (const part of [...(namespace ? namespace.split(".") : []), ...key.split(".")]) {
    node = node && typeof node === "object" ? (node as Dictionary)[part] : undefined;
  }
  if (typeof node !== "string") throw new Error(`missing message ${namespace ? `${namespace}.` : ""}${key} (${locale})`);
  return node;
}

/** `{count, plural, one {# centre} other {# centres}}` for the page's locale (the `=N`, zero/one/two/few/many/other selectors and `#`). */
function plurals(message: string, values: Values, locale: string): string {
  let out = "";
  for (let i = 0; i < message.length; i += 1) {
    const head = /^\{(\w+), plural,/.exec(message.slice(i));
    if (!head) { out += message[i]; continue; }
    let depth = 0;
    let end = i;
    for (; end < message.length; end += 1) {
      if (message[end] === "{") depth += 1;
      if (message[end] === "}") { depth -= 1; if (depth === 0) break; }
    }
    const body = message.slice(i + head[0].length, end);
    const options = new Map<string, string>();
    for (let j = 0; j < body.length;) {
      const sel = /^\s*(=?\w+)\s*\{/.exec(body.slice(j));
      if (!sel) break;
      let d = 0;
      let k = j + sel[0].length - 1;
      for (; k < body.length; k += 1) {
        if (body[k] === "{") d += 1;
        if (body[k] === "}") { d -= 1; if (d === 0) break; }
      }
      options.set(sel[1], body.slice(j + sel[0].length, k));
      j = k + 1;
    }
    const n = Number(values[head[1]] ?? 0);
    const chosen = options.get(`=${n}`) ?? options.get(new Intl.PluralRules(locale).select(n)) ?? options.get("other") ?? "";
    out += chosen.replace(/#/g, new Intl.NumberFormat(locale).format(n));
    i = end;
  }
  return out;
}

function fill(message: string, values: Values, locale = "en") {
  return plurals(message, values, locale).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

/** The real message files with just enough ICU for tests: {placeholders} and rich <tag>chunks</tag>. */
export function createTranslator(locale: string, namespace?: string) {
  const t = (key: string, values: Values = {}) => fill(lookup(locale, namespace, key), values, locale);
  t.rich = (key: string, values: Record<string, unknown> = {}): ReactNode => {
    const message = fill(lookup(locale, namespace, key), values, locale);
    const parts: ReactNode[] = [];
    const pattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let last = 0;
    let index = 0;
    for (let match = pattern.exec(message); match; match = pattern.exec(message)) {
      if (match.index > last) parts.push(message.slice(last, match.index));
      const render = values[match[1]];
      parts.push(typeof render === "function" ? createElement(Fragment, { key: index++ }, (render as (chunks: ReactNode) => ReactNode)(match[2])) : match[2]);
      last = match.index + match[0].length;
    }
    if (last < message.length) parts.push(message.slice(last));
    return createElement(Fragment, null, ...parts);
  };
  t.has = (key: string) => { try { lookup(locale, namespace, key); return true; } catch { return false; } };
  return t;
}

/** Factory for vi.mock("next-intl", ...): useTranslations reads the real messages of `locale` (en by default). */
export function nextIntlMock(locale = "en") {
  return { useTranslations: (namespace?: string) => createTranslator(locale, namespace), useLocale: () => locale };
}
