import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Dictionary = Record<string, unknown>;
const languageFiles = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Dictionary).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

function keysFor(locale: (typeof languageFiles)[number]) {
  const raw = readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8");
  return flatten(JSON.parse(raw)).sort();
}

describe("six-locale translation contract", () => {
  it("keeps the complete message-key tree aligned with Arabic", () => {
    const arabicKeys = keysFor("ar");
    for (const locale of languageFiles.slice(1)) expect(keysFor(locale)).toEqual(arabicKeys);
  });

  it("includes the settings session-disclosure key in every language", () => {
    for (const locale of languageFiles) expect(keysFor(locale)).toContain("Settings.sessionsSummary");
  });
});
