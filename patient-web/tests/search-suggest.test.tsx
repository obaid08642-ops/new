import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let activeLocale = "en";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", async () => {
  const helpers = await import("./helpers/intl");
  return { useTranslations: (namespace?: string) => helpers.createTranslator(activeLocale, namespace), useLocale: () => activeLocale };
});

import {
  SUGGEST_DEBOUNCE_MS, SuggestController, canSuggest, highlightParts, parseSuggestions, suggestionHref,
  type SuggestState,
} from "@/lib/search/suggest";
import { SearchSuggest } from "@/components-next/search/search-suggest";
import { createTranslator } from "./helpers/intl";

/** A fetch answer whose body is read in microtasks (a real Response body stream needs the event loop, frozen by fake timers). */
const answer = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const bruf = { suggestions: [
  { id: "m1", type: "medicine", name: "بروف 600", slug: "bruf-600", code: null },
  { id: "m2", type: "medicine", name: "بروفينال 400", slug: "brufinal-400", code: null },
  { id: "s1", type: "specialty", name: "برامج", slug: null, code: "nutrition" },
] };

/** A controller on a fake fetch: each call is recorded with its abort signal and answered when the test says so. */
function harness(locale = "ar") {
  const calls: Array<{ url: string; signal: AbortSignal; resolve: (r: Response) => void; reject: (e: unknown) => void }> = [];
  const states: SuggestState[] = [];
  const controller = new SuggestController({
    locale,
    fetcher: (url, init) => new Promise<Response>((resolve, reject) => {
      calls.push({ url, signal: init.signal, resolve, reject });
      init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }),
    onChange: (s) => states.push(s),
  });
  return { controller, calls, states };
}

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

describe("issue 1544: when suggestions are asked", () => {
  it("starts from the first Arabic letter and from two letters in other scripts", () => {
    expect(canSuggest("ب")).toBe(true);
    expect(canSuggest("پ")).toBe(true);
    expect(canSuggest("b")).toBe(false);
    expect(canSuggest("br")).toBe(true);
    expect(canSuggest("ब")).toBe(false);
    expect(canSuggest("   ")).toBe(false);
  });
});

describe("issue 1544: debounce and abort", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("waits about 200 ms after the last letter, then asks once for the latest text", async () => {
    const { controller, calls } = harness();
    controller.input("ب");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS - 50);
    controller.input("بر");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS - 1);
    expect(calls).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`/api/search/suggest?q=${encodeURIComponent("بر")}&locale=ar`);
  });

  it("a new letter aborts the request in flight, and its late answer never replaces the newer one", async () => {
    const { controller, calls } = harness();
    controller.input("بر");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    controller.input("بروف");
    expect(calls[0].signal.aborted).toBe(true);
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    calls[1].resolve(answer({ suggestions: [bruf.suggestions[0]] }));
    await flush();
    calls[0].resolve(answer(bruf));
    await flush();
    expect(controller.current.status).toBe("ready");
    expect(controller.current.query).toBe("بروف");
    expect(controller.current.items.map((i) => i.id)).toEqual(["m1"]);
  });

  it("an empty answer is the empty state, a failed one the error state, and retry asks again", async () => {
    const { controller, calls } = harness("en");
    controller.input("zz");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    calls[0].resolve(answer({ suggestions: [] }));
    await flush();
    expect(controller.current).toMatchObject({ status: "ready", items: [], open: true });
    controller.input("zzz");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    calls[1].resolve(answer({ message: "down" }, 503));
    await flush();
    expect(controller.current).toMatchObject({ status: "error", open: true });
    controller.retry();
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    expect(calls).toHaveLength(3);
    expect(calls[2].url).toContain("q=zzz");
  });

  it("clearing the text closes the dropdown and cancels the wait", () => {
    const { controller, calls } = harness();
    controller.input("بر");
    controller.input("");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS * 2);
    expect(calls).toHaveLength(0);
    expect(controller.current).toMatchObject({ status: "idle", open: false });
  });

  it("the kill switch (disabled: true) turns the dropdown off for good: closed, and no more requests", async () => {
    const { controller, calls } = harness();
    controller.input("بر");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    calls[0].resolve(answer({ suggestions: [], disabled: true }));
    await flush();
    expect(controller.current).toMatchObject({ status: "off", open: false });
    controller.input("بروف");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    expect(calls).toHaveLength(1);
    expect(controller.key("ArrowDown")).toEqual({ kind: "none" });
  });
});

describe("issue 1544: keyboard", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  async function ready() {
    const h = harness();
    h.controller.input("بر");
    vi.advanceTimersByTime(SUGGEST_DEBOUNCE_MS);
    h.calls[0].resolve(answer(bruf));
    await flush();
    return h.controller;
  }

  it("ArrowDown/ArrowUp move (and wrap), Enter opens the highlighted suggestion's page", async () => {
    const c = await ready();
    expect(c.current.active).toBe(-1);
    expect(c.key("ArrowDown")).toEqual({ kind: "handled" });
    expect(c.current.active).toBe(0);
    c.key("ArrowDown");
    expect(c.current.active).toBe(1);
    c.key("ArrowDown");
    c.key("ArrowDown");
    expect(c.current.active).toBe(0);
    c.key("ArrowUp");
    expect(c.current.active).toBe(2);
    c.key("ArrowUp");
    expect(c.key("Enter")).toEqual({ kind: "open", href: "/ar/p/brufinal-400" });
    expect(c.current.open).toBe(false);
  });

  it("Enter with nothing highlighted lets the field submit (the full results page)", async () => {
    const c = await ready();
    expect(c.key("Enter")).toEqual({ kind: "none" });
  });

  it("Esc closes, and a second Esc is the field's own", async () => {
    const c = await ready();
    c.key("ArrowDown");
    expect(c.key("Escape")).toEqual({ kind: "handled" });
    expect(c.current).toMatchObject({ open: false, active: -1 });
    expect(c.key("Escape")).toEqual({ kind: "none" });
    c.reopen();
    expect(c.current.open).toBe(true);
  });
});

describe("issue 1544: links and highlight", () => {
  it("maps every type to its existing page", () => {
    const row = (type: Parameters<typeof suggestionHref>[1]["type"], extra: { slug?: string; code?: string } = {}) =>
      suggestionHref("en", { id: "x 1", type, slug: extra.slug ?? null, code: extra.code ?? null });
    expect(row("medicine", { slug: "bruf-600" })).toBe("/en/p/bruf-600");
    expect(row("medicine")).toBe("/en/medicines/x%201");
    expect(row("doctor")).toBe("/en/consultations/doctors/x%201");
    expect(row("specialty", { code: "dermatology" })).toBe("/en/consultations/doctors?specialty=dermatology");
    expect(row("lab_test")).toBe("/en/diagnostics/test-detail?testId=x%201");
    expect(row("lab_package")).toBe("/en/diagnostics/packages/x%201");
    expect(row("radiology")).toBe("/en/diagnostics/radiology/x%201");
    expect(row("nursing")).toBe("/en/home-care/services/x%201");
    expect(row("article", { slug: "sleep" })).toBe("/en/articles/sleep");
    expect(row("article")).toBeNull();
  });

  it("drops malformed rows and unknown types", () => {
    const { items, disabled } = parseSuggestions({ suggestions: [{ id: "a", type: "community", name: "x" }, { id: "", type: "doctor", name: "y" }, { id: "d", type: "doctor", name: "Dr Y" }, null] }, "en");
    expect(items).toEqual([{ id: "d", type: "doctor", name: "Dr Y", href: "/en/consultations/doctors/d" }]);
    expect(disabled).toBe(false);
  });

  it("marks the typed text, ignoring diacritics, hamza forms and case, word starts first", () => {
    expect(highlightParts("بروفينال 400", "بروف")).toEqual([{ text: "بروف", match: true }, { text: "ينال 400", match: false }]);
    expect(highlightParts("شراب بُروف", "بروف")).toEqual([{ text: "شراب ", match: false }, { text: "بُروف", match: true }]);
    expect(highlightParts("أدول", "اد")).toEqual([{ text: "أد", match: true }, { text: "ول", match: false }]);
    expect(highlightParts("Super Bruf", "BRU")).toEqual([{ text: "Super ", match: false }, { text: "Bru", match: true }, { text: "f", match: false }]);
    expect(highlightParts("Panadol", "zz")).toEqual([{ text: "Panadol", match: false }]);
  });
});

describe("issue 1544: the dropdown", () => {
  const field = (props: Record<string, unknown>) => <input {...props} readOnly />;
  const draw = (state: SuggestState, locale = "en") => {
    activeLocale = locale;
    try {
      const controller = new SuggestController({ locale, fetcher: async () => answer({}), onChange: () => undefined });
      return renderToStaticMarkup(<SearchSuggest state={state} controller={controller} renderField={field} allResultsHref={(q) => `/${locale}/search?q=${q}`} />);
    } finally { activeLocale = "en"; }
  };
  const items = parseSuggestions(bruf, "ar").items;

  it("is an ARIA combobox: listbox, options, the active descendant, and the matched part in a <mark>", () => {
    const html = draw({ status: "ready", query: "بروف", items, active: 1, open: true }, "ar");
    expect(html).toMatch(/role="combobox"/);
    expect(html).toMatch(/aria-expanded="true"/);
    const list = html.match(/<ul id="([^"]+)" role="listbox"/);
    expect(list).not.toBeNull();
    expect(html).toContain(`aria-controls="${list![1]}"`);
    const active = html.match(/aria-activedescendant="([^"]+)"/);
    expect(html).toMatch(new RegExp(`id="${active![1]}" role="option" aria-selected="true"[^>]*href="/ar/p/brufinal-400"`));
    expect((html.match(/role="option"/g) || []).length).toBe(3);
    expect(html).toContain("<mark");
    expect(html).toMatch(/<mark[^>]*>بروف<\/mark>ينال 400/);
    expect(html).toContain(createTranslator("ar", "Search")("kindMedicine"));
    expect(html).toContain(createTranslator("ar", "SearchSuggest")("seeAll", { query: "بروف" }));
  });

  it("never draws server text as HTML", () => {
    const evil = parseSuggestions({ suggestions: [{ id: "x", type: "doctor", name: "<img src=x onerror=alert(1)>" }] }, "en").items;
    const html = draw({ status: "ready", query: "<img", items: evil, active: -1, open: true });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("shows the empty and error states from the locale files in every language", () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const t = createTranslator(locale, "SearchSuggest");
      expect(draw({ status: "ready", query: "zz", items: [], active: -1, open: true }, locale)).toContain(t("empty", { query: "zz" }));
      const error = draw({ status: "error", query: "zz", items: [], active: -1, open: true }, locale);
      expect(error).toContain(t("error"));
      expect(error).toContain(t("retry"));
    }
  });

  it("with the kill switch off, nothing is shown: collapsed, no options, the popup hidden", () => {
    const html = draw({ status: "off", query: "بر", items, active: 0, open: true }, "ar");
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).not.toMatch(/role="option"/);
    expect(html).not.toContain("aria-activedescendant");
    expect(html).toMatch(/<div class="[^"]*" hidden="">/);
  });
});
