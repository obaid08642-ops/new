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

function fill(message: string, values: Values) {
  return message.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
}

/** The real message files with just enough ICU for tests: {placeholders} and rich <tag>chunks</tag>. */
export function createTranslator(locale: string, namespace?: string) {
  const t = (key: string, values: Values = {}) => fill(lookup(locale, namespace, key), values);
  t.rich = (key: string, values: Record<string, unknown> = {}): ReactNode => {
    const message = fill(lookup(locale, namespace, key), values);
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
