// Instant search suggestions, the same rules as the website (patient-web/lib/search/suggest.ts, issue 1544 / #1654):
// when to ask (the minimum length), the 200 ms wait, cancelling the wait and the request in flight when a newer letter
// is typed, the kill switch, and the highlight of the matched part. No React here, so it is tested without a device.

/** The item types of GET /search/suggest (backend search-documents.ts SearchType). */
export type SuggestType = 'medicine' | 'doctor' | 'specialty' | 'lab_test' | 'lab_package' | 'radiology' | 'nursing' | 'article';

export interface Suggestion {
  id: string;
  type: SuggestType;
  name: string;
  slug: string | null;
  code: string | null;
}

export const SUGGEST_DEBOUNCE_MS = 250;

/** Which results a screen's suggestions are limited to (the same scopes as the website; the backend filters on them). */
export interface SuggestScope {
  section?: 'pharmacy' | 'consultations' | 'labs' | 'nursing';
  types?: readonly SuggestType[];
}

/** pharmacy = medicines only, labs = lab tests and packages, radiology = scans, nursing = nursing services, consultations = doctors and specialties. */
export const SUGGEST_SCOPES = {
  pharmacy: { section: 'pharmacy' },
  labs: { section: 'labs', types: ['lab_test', 'lab_package'] },
  radiology: { section: 'labs', types: ['radiology'] },
  nursing: { section: 'nursing' },
  consultations: { section: 'consultations' },
} as const satisfies Record<string, SuggestScope>;

/** The query string of the scope (empty for the home screen's unscoped search). */
export function suggestScopeQuery(scope?: SuggestScope): string {
  let out = '';
  if (scope?.section) out += `&section=${encodeURIComponent(scope.section)}`;
  if (scope?.types?.length) out += `&types=${encodeURIComponent(scope.types.join(','))}`;
  return out;
}
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const TYPES: readonly string[] = ['medicine', 'doctor', 'specialty', 'lab_test', 'lab_package', 'radiology', 'nursing', 'article'];

/** Arabic-script text (Arabic, Urdu) is suggested from its first letter, other scripts from two (the backend's rule). */
export function suggestMinLength(query: string): number {
  return ARABIC_SCRIPT.test(query) ? 1 : 2;
}

export function canSuggest(query: string): boolean {
  const q = query.trim();
  return q.length > 0 && Array.from(q).length >= suggestMinLength(q);
}

/** The same typed text the web sends: at most 60 characters. */
export function suggestQueryText(query: string): string {
  return Array.from(query.trim()).slice(0, 60).join('');
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** The answer of GET /search/suggest: `{ suggestions: [...] }`, or `{ suggestions: [], disabled: true }` when the kill switch is off. */
export function parseSuggestions(payload: unknown): { items: Suggestion[]; disabled: boolean } {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
  const rows = Array.isArray(root.suggestions) ? root.suggestions : [];
  const items: Suggestion[] = [];
  const seen = new Set<string>();
  for (const value of rows) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const id = text(row.id);
    const name = text(row.name);
    const type = typeof row.type === 'string' && TYPES.includes(row.type) ? (row.type as SuggestType) : null;
    if (!id || !name || !type || seen.has(`${type}:${id}`)) continue;
    seen.add(`${type}:${id}`);
    items.push({ id, type, name, slug: text(row.slug), code: text(row.code) });
  }
  return { items, disabled: root.disabled === true };
}

/** A route the app can open for a suggestion, or null when the app has no screen for it. */
export interface SuggestRoute {
  pathname: string;
  params: Record<string, string>;
}

/**
 * The app screen of each type (the same content as the website's page for it). Radiology opens the lab test screen in
 * its radiology mode. A medicine opens its catalogue page by slug, else the medicine screen by id.
 */
export function suggestionRoute(item: Suggestion): SuggestRoute | null {
  switch (item.type) {
    case 'medicine':
      return item.slug ? { pathname: '/p/[slug]', params: { slug: item.slug } } : { pathname: '/medicine/[slug]', params: { slug: item.id } };
    case 'doctor':
      return { pathname: '/consultations/doctor-profile', params: { doctorId: item.id } };
    case 'specialty':
      return item.code ? { pathname: '/search', params: { view: 'doctors', specialty: item.code } } : null;
    case 'lab_test':
      return { pathname: '/diagnostics/test-detail', params: { id: item.id } };
    case 'radiology':
      return { pathname: '/diagnostics/test-detail', params: { id: item.id, type: 'radiology' } };
    case 'lab_package':
      return { pathname: '/diagnostics/package-detail', params: { id: item.id } };
    case 'nursing':
      return { pathname: '/nursing/service-details', params: { serviceId: item.id } };
    case 'article':
      return item.slug ? { pathname: '/articles/[slug]', params: { slug: item.slug } } : null;
  }
}

/** One character folded the way the backend's normalizeSearchText folds it (seo-search.module.ts). */
function fold(ch: string): string {
  if (/\s/.test(ch)) return ' ';
  return ch
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىی]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[̀-ͯ]/g, '');
}

function foldText(value: string): string {
  return Array.from(value).map(fold).join('').replace(/ +/g, ' ').trim();
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * The name split around the typed text, so the matched part can be drawn bold. The match is found the way the backend
 * found it: ignoring case, Arabic diacritics and letter variants, at the start of a word first, then anywhere.
 */
export function highlightParts(name: string, query: string): HighlightPart[] {
  const q = foldText(query);
  if (!q) return [{ text: name, match: false }];
  const chars = Array.from(name);
  let folded = '';
  const from: number[] = [];
  chars.forEach((ch, i) => {
    for (const c of Array.from(fold(ch))) {
      if (c === ' ' && (folded.length === 0 || folded.endsWith(' '))) continue;
      folded += c;
      from.push(i);
    }
  });
  let at = -1;
  for (let p = folded.indexOf(q); p !== -1; p = folded.indexOf(q, p + 1)) {
    if (p === 0 || folded[p - 1] === ' ') {
      at = p;
      break;
    }
  }
  if (at === -1) at = folded.indexOf(q);
  if (at === -1) return [{ text: name, match: false }];
  const start = from[at];
  const end = at + q.length < from.length ? from[at + q.length] : chars.length;
  const parts: HighlightPart[] = [];
  if (start > 0) parts.push({ text: chars.slice(0, start).join(''), match: false });
  parts.push({ text: chars.slice(start, end).join(''), match: true });
  if (end < chars.length) parts.push({ text: chars.slice(end).join(''), match: false });
  return parts;
}

export type SuggestStatus = 'idle' | 'loading' | 'ready' | 'error' | 'off';

export interface SuggestState {
  status: SuggestStatus;
  /** The text the shown answer is for. */
  query: string;
  items: Suggestion[];
  /** The highlighted option (-1: none). */
  active: number;
  /** Whether the list is drawn. */
  open: boolean;
}

export const INITIAL_SUGGEST_STATE: SuggestState = { status: 'idle', query: '', items: [], active: -1, open: false };

export interface SuggestDeps {
  /** The API base URL (the app's BASE_URL, which already ends in /api/v1). */
  baseUrl: string;
  locale: string;
  scope?: SuggestScope;
  fetcher: (url: string, init: { signal: AbortSignal }) => Promise<Response>;
  onChange: (state: SuggestState) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/**
 * The list's rules. `input` is called on every change of the field: the request waits SUGGEST_DEBOUNCE_MS, a newer
 * letter cancels the wait and aborts the request in flight (an older answer can never replace a newer one), and an
 * answer with `disabled: true` (the "search suggestions" kill switch) turns the list off on this screen.
 */
export class SuggestController {
  private state: SuggestState = INITIAL_SUGGEST_STATE;
  private timer: unknown = null;
  private request: AbortController | null = null;
  private typed = '';
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
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
    if (this.request) {
      this.request.abort();
      this.request = null;
    }
  }

  input(value: string) {
    this.typed = value;
    if (this.state.status === 'off') return;
    this.cancel();
    const q = value.trim();
    if (!canSuggest(q)) {
      this.set({ status: 'idle', query: q, items: [], active: -1, open: false });
      return;
    }
    this.set({ status: 'loading', query: q, active: -1, open: true });
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.load(q);
    }, SUGGEST_DEBOUNCE_MS);
  }

  retry() {
    this.input(this.typed);
  }

  private async load(q: string) {
    const request = new AbortController();
    this.request = request;
    try {
      const response = await this.deps.fetcher(
        `${this.deps.baseUrl}/search/suggest?q=${encodeURIComponent(suggestQueryText(q))}&locale=${encodeURIComponent(this.deps.locale)}${suggestScopeQuery(this.deps.scope)}`,
        { signal: request.signal },
      );
      if (!response.ok) throw new Error('suggest_unavailable');
      const { items, disabled } = parseSuggestions(await response.json());
      if (request.signal.aborted) return;
      this.request = null;
      if (disabled) {
        this.set({ status: 'off', items: [], active: -1, open: false });
        return;
      }
      this.set({ status: 'ready', query: q, items, active: -1, open: true });
    } catch {
      if (request.signal.aborted) return;
      this.request = null;
      this.set({ status: 'error', query: q, items: [], active: -1, open: false });
    }
  }

  close() {
    if (this.state.open || this.state.active !== -1) this.set({ open: false, active: -1 });
  }

  dispose() {
    this.cancel();
  }
}
