// 17.3: the device's recent searches. Only real terms are kept, the newest is first, a repeat moves to the front, and a
// blocked storage or a corrupt value gives an empty list instead of an error.
import { describe, expect, it } from "vitest";
import { RECENT_SEARCHES_KEY, RECENT_SEARCHES_LIMIT, forgetRecentSearches, readRecentSearches, rememberSearch, writeRecentSearches } from "./recent-searches";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("rememberSearch", () => {
  it("puts the newest term first and moves a repeat to the front, ignoring case and spacing", () => {
    const once = rememberSearch([], "Paracetamol");
    const twice = rememberSearch(once, "  iron  ");
    expect(twice).toEqual(["iron", "Paracetamol"]);
    expect(rememberSearch(twice, "PARACETAMOL")).toEqual(["PARACETAMOL", "iron"]);
  });

  it("keeps only a term of at least two characters, and at most the limit", () => {
    expect(rememberSearch(["x"], "a")).toEqual(["x"]);
    const full = Array.from({ length: RECENT_SEARCHES_LIMIT }, (_, i) => `term${i}`);
    expect(rememberSearch(full, "newest")).toHaveLength(RECENT_SEARCHES_LIMIT);
    expect(rememberSearch(full, "newest")[0]).toBe("newest");
  });
});

describe("readRecentSearches and writeRecentSearches", () => {
  it("round-trips the list through the storage", () => {
    const storage = memoryStorage();
    writeRecentSearches(["iron", "dr"], storage);
    expect(storage.data.get(RECENT_SEARCHES_KEY)).toBe('["iron","dr"]');
    expect(readRecentSearches(storage)).toEqual(["iron", "dr"]);
  });

  it("gives an empty list for a corrupt value, a non-list or a blocked storage", () => {
    expect(readRecentSearches(memoryStorage({ [RECENT_SEARCHES_KEY]: "{not json" }))).toEqual([]);
    expect(readRecentSearches(memoryStorage({ [RECENT_SEARCHES_KEY]: '{"a":1}' }))).toEqual([]);
    expect(readRecentSearches(null)).toEqual([]);
  });

  it("drops entries that are not text of two characters", () => {
    const stored = JSON.stringify(["ok", 3, "x", "fine"]);
    expect(readRecentSearches(memoryStorage({ [RECENT_SEARCHES_KEY]: stored }))).toEqual(["ok", "fine"]);
  });

  it("removes the key when the list is emptied", () => {
    const storage = memoryStorage({ [RECENT_SEARCHES_KEY]: '["iron"]' });
    writeRecentSearches([], storage);
    expect(storage.data.has(RECENT_SEARCHES_KEY)).toBe(false);
  });
});

describe("forgetRecentSearches", () => {
  it("removes the stored list", () => {
    const storage = memoryStorage({ [RECENT_SEARCHES_KEY]: '["iron"]' });
    forgetRecentSearches(storage);
    expect(storage.data.has(RECENT_SEARCHES_KEY)).toBe(false);
  });
});
