// Issue 1544 (plan 17.3 "Instant suggestions"): what the search boxes show while the patient types. No React here:
// the rules (when to ask, the 200 ms wait, cancelling the previous request, the arrow keys, the kill switch) live in
// SuggestController so they are tested without a browser; components-next/search/search-suggest.tsx draws them.

/** The item types of GET /search/suggest (backend search-documents.ts SearchType). */
export type SuggestType = "medicine" | "doctor" | "specialty" | "lab_test" | "lab_package" | "radiology" | "nursing" | "article";

export interface Suggestion {
  id: string;
  type: SuggestType;
  name: string;
  /** The page the suggestion opens. */
  href: string;
}

export const SUGGEST_DEBOUNCE_MS = 200;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿ]/;

/** Arabic-script text (Arabic, Urdu) is suggested from its first letter, other scripts from two (the backend's rule). */
export function suggestMinLength(query: string): number {
  return ARABIC_SCRIPT.test(query) ? 1 : 2;
}

export function canSuggest(query: string): boolean {
  const q = query.trim();
  return q.length > 0 && Array.from(q).length >= suggestMinLength(q);
}

const enc = encodeURIComponent;

/**
 * The existing page of each type (the same routes as the search page's results): a medicine by its catalogue slug
 * (/p/<slug>; the legacy /medicines/<id> redirects there when a row has no slug), a doctor's profile, a specialty's
 * doctor list, a lab test, a lab package, a radiology service, a nursing service, an article by its slug.
 */
export function suggestionHref(locale: string, row: { id: string; type: SuggestType; slug: string | null; code: string | null }): string | null {
  switch (row.type) {
    case "medicine": return row.slug ? `/${locale}/p/${enc(row.slug)}` : `/${locale}/medicines/${enc(row.id)}`;
    case "doctor": return `/${locale}/consultations/doctors/${enc(row.id)}`;
    case "specialty": return row.code ? `/${locale}/consultations/doctors?specialty=${enc(row.code)}` : null;
    case "lab_test": return `/${locale}/diagnostics/test-detail?testId=${enc(row.id)}`;
    case "lab_package": return `/${locale}/diagnostics/packages/${enc(row.id)}`;
    case "radiology": return `/${locale}/diagnostics/radiology/${enc(row.id)}`;
    case "nursing": return `/${locale}/home-care/services/${enc(row.id)}`;
    case "article": return row.slug ? `/${locale}/articles/${enc(row.slug)}` : null;
  }
}

const TYPES: readonly string[] = ["medicine", "doctor", "specialty", "lab_test", "lab_package", "radiology", "nursing", "article"];
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** The answer of GET /search/suggest: `{ suggestions: [...] }`, or `{ suggestions: [], disabled: true }` when the kill switch is off. */
export function parseSuggestions(payload: unknown, locale: string): { items: Suggestion[]; disabled: boolean } {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(root.suggestions) ? root.suggestions : [];
  const items: Suggestion[] = [];
  const seen = new Set<string>();
  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const id = text(row.id);
    const name = text(row.name);
    const type = typeof row.type === "string" && TYPES.includes(row.type) ? (row.type as SuggestType) : null;
    if (!id || !name || !type || seen.has(`${type}:${id}`)) continue;
    const href = suggestionHref(locale, { id, type, slug: text(row.slug), code: text(row.code) });
    if (!href) continue;
    seen.add(`${type}:${id}`);
    items.push({ id, type, name, href });
  }
  return { items, disabled: root.disabled === true };
}

/** One character folded the way the backend's normalizeSearchText folds it (seo-search.module.ts). */
function fold(ch: string): string {
  if (/\s/.test(ch)) return " ";
  return ch
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "");
}

function foldText(value: string): string {
  return Array.from(value).map(fold).join("").replace(/ +/g, " ").trim();
}

export interface HighlightPart { text: string; match: boolean }

/**
 * The name split around the typed text, so the matched part is drawn in a <mark> (plain text nodes: nothing from the
 * server is rendered as HTML). The match is found the way the backend found it: ignoring case, Arabic diacritics and
 * letter variants (أ/إ/ا, ى/ي, ة/ه), at the start of a word first, then anywhere.
 */
export function highlightParts(name: string, query: string): HighlightPart[] {
  const q = foldText(query);
  if (!q) return [{ text: name, match: false }];
  const chars = Array.from(name);
  // folded text, and for each folded character the index of the original character it came from
  let folded = "";
  const from: number[] = [];
  chars.forEach((ch, i) => {
    const f = fold(ch);
    for (const c of Array.from(f)) {
      if (c === " " && (folded.length === 0 || folded.endsWith(" "))) continue;
      folded += c;
      from.push(i);
    }
  });
  let at = -1;
  for (let p = folded.indexOf(q); p !== -1; p = folded.indexOf(q, p + 1)) {
    if (p === 0 || folded[p - 1] === " ") { at = p; break; }
  }
  if (at === -1) at = folded.indexOf(q);
  if (at === -1) return [{ text: name, match: false }];
  const start = from[at];
  const end = at + q.length < from.length ? from[at + q.length] : chars.length;
  const parts: HighlightPart[] = [];
  if (start > 0) parts.push({ text: chars.slice(0, start).join(""), match: false });
  parts.push({ text: chars.slice(start, end).join(""), match: true });
  if (end < chars.length) parts.push({ text: chars.slice(end).join(""), match: false });
  return parts;
}

export type SuggestStatus = "idle" | "loading" | "ready" | "error" | "off";

export interface SuggestState {
  status: SuggestStatus;
  /** The text the shown answer is for. */
  query: string;
  items: Suggestion[];
  /** The highlighted option (-1: none). */
  active: number;
  /** Whether the dropdown is drawn. */
  open: boolean;
}

export interface SuggestDeps {
  locale: string;
  fetcher: (url: string, init: { signal: AbortSignal }) => Promise<Response>;
  onChange: (state: SuggestState) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/** What a key press asks the component to do. */
export type SuggestKeyResult = { kind: "none" } | { kind: "handled" } | { kind: "open"; href: string };

export const INITIAL_SUGGEST_STATE: SuggestState = { status: "idle", query: "", items: [], active: -1, open: false };

/**
 * The dropdown's rules. `input` is called on every change of the field: the request waits SUGGEST_DEBOUNCE_MS, a newer
 * letter cancels the wait and aborts the request in flight (an older answer can never replace a newer one), and an
 * answer with `disabled: true` (the "search suggestions" kill switch) turns the dropdown off for good on this page.
 */
export class SuggestController {
  private state: SuggestState = INITIAL_SUGGEST_STATE;
  private timer: unknown = null;
  private request: AbortController | null = null;
  private typed = "";
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  constructor(private readonly deps: SuggestDeps) {
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  get current(): SuggestState {
    return this.state;
  }

  private set(next: Partial<SuggestState>) {
    this.state = { ...this.state, ...next };
    this.deps.onChange(this.state);
  }

  private cancel() {
    if (this.timer !== null) { this.clearTimer(this.timer); this.timer = null; }
    if (this.request) { this.request.abort(); this.request = null; }
  }

  input(value: string) {
    this.typed = value;
    if (this.state.status === "off") return;
    this.cancel();
    const q = value.trim();
    if (!canSuggest(q)) { this.set({ status: "idle", query: q, items: [], active: -1, open: false }); return; }
    this.set({ status: "loading", query: q, active: -1, open: true });
    this.timer = this.setTimer(() => { this.timer = null; void this.load(q); }, SUGGEST_DEBOUNCE_MS);
  }

  retry() {
    this.input(this.typed);
  }

  private async load(q: string) {
    const request = new AbortController();
    this.request = request;
    try {
      const response = await this.deps.fetcher(`/api/search/suggest?q=${encodeURIComponent(q)}&locale=${encodeURIComponent(this.deps.locale)}`, { signal: request.signal });
      if (!response.ok) throw new Error("suggest_unavailable");
      const { items, disabled } = parseSuggestions(await response.json(), this.deps.locale);
      if (request.signal.aborted) return;
      this.request = null;
      if (disabled) { this.set({ status: "off", items: [], active: -1, open: false }); return; }
      this.set({ status: "ready", query: q, items, active: -1, open: true });
    } catch {
      if (request.signal.aborted) return;
      this.request = null;
      this.set({ status: "error", query: q, items: [], active: -1, open: true });
    }
  }

  /** Focus back in the field: the last answer shows again. */
  reopen() {
    if (this.state.status !== "off" && this.state.status !== "idle" && !this.state.open) this.set({ open: true });
  }

  close() {
    if (this.state.open || this.state.active !== -1) this.set({ open: false, active: -1 });
  }

  /** The pointer is on an option. */
  hover(index: number) {
    if (index !== this.state.active && index >= 0 && index < this.state.items.length) this.set({ active: index });
  }

  key(key: string): SuggestKeyResult {
    const { status, items, active, open } = this.state;
    if (status === "off") return { kind: "none" };
    if (key === "Escape") {
      if (!open) return { kind: "none" };
      this.close();
      return { kind: "handled" };
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      if (status !== "ready" || items.length === 0) return { kind: "none" };
      const step = key === "ArrowDown" ? 1 : -1;
      const next = !open ? (step === 1 ? 0 : items.length - 1) : active === -1 ? (step === 1 ? 0 : items.length - 1) : (active + step + items.length) % items.length;
      this.set({ open: true, active: next });
      return { kind: "handled" };
    }
    if (key === "Enter") {
      // no highlighted option: the field's own submit (the full results page) goes ahead
      if (!open || active < 0 || !items[active]) { this.close(); return { kind: "none" }; }
      const href = items[active].href;
      this.close();
      return { kind: "open", href };
    }
    return { kind: "none" };
  }

  dispose() {
    this.cancel();
  }
}
