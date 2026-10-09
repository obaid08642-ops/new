// ACCEPTANCE — D-31 harness (not a test file). Written by the reviewer before the work; the implementing agent makes the
// tests pass and may not edit it.
//
// A real DOM (jsdom, the copy installed for patient-app, because patient-web has no DOM test environment and the
// configs may not change) and the REAL react-dom client renderer. The ONLY faked thing is the network boundary:
// `fetch`, which records every request (method, path, Idempotency-Key, body) and answers with what the test says —
// a deferred promise for "slow 3G", a TypeError('Network request failed') for "connection lost", a JSON answer otherwise —
// and `navigator.onLine` + the `offline` event for "offline".
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JSDOM } = require(resolve(process.cwd(), "../patient-app/node_modules/jsdom")) as { JSDOM: new (html: string, options: Record<string, unknown>) => { window: Window & typeof globalThis } };

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const win = dom.window;
const g = globalThis as Record<string, unknown>;
for (const name of Object.getOwnPropertyNames(win)) {
  if (name.startsWith("_") || name in g) continue;
  Object.defineProperty(g, name, { configurable: true, get: () => (win as unknown as Record<string, unknown>)[name] });
}
for (const name of ["window", "document", "navigator", "location", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node", "Event", "MouseEvent", "KeyboardEvent", "CustomEvent", "StorageEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia"]) {
  const value = name === "window" ? win : (win as unknown as Record<string, unknown>)[name];
  Object.defineProperty(g, name, { configurable: true, writable: true, value: typeof value === "function" && /^[a-z]/.test(name) ? (value as (...a: unknown[]) => unknown).bind(win) : value });
}
if (typeof (win as unknown as Record<string, unknown>).matchMedia !== "function") {
  const mm = () => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false });
  Object.defineProperty(win, "matchMedia", { configurable: true, value: mm });
  g.matchMedia = mm;
}
if (typeof (win as unknown as Record<string, unknown>).PageTransitionEvent !== "function") (win as unknown as Record<string, unknown>).PageTransitionEvent = win.Event;
g.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------------------------------------------------------------------------------------------------ */
/* The network boundary                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

export type Call = { url: string; path: string; method: string; key: string | null; body: unknown };
export type Answer = Response | Promise<Response>;
export type Route = (call: Call, index: number) => Answer | undefined;

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
export const lost = (): Promise<Response> => Promise.reject(new TypeError("Network request failed"));

export function deferred<T = Response>() {
  let resolveFn!: (value: T) => void;
  let rejectFn!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolveFn = res;
    rejectFn = rej;
  });
  return { promise, resolve: resolveFn, reject: rejectFn };
}

/** Installs a recording `fetch`. `route` answers each call; an unanswered call gets a 404 so a stray request is visible. */
export function fakeNetwork(route: Route) {
  const calls: Call[] = [];
  const fetchImpl = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = String(init.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    const headers = new Headers(init.headers);
    let body: unknown = init.body ?? null;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { /* keep the raw string */ }
    }
    const call: Call = { url, path: url.replace(/^https?:\/\/[^/]+/, "").split("?")[0], method, key: headers.get("idempotency-key"), body };
    calls.push(call);
    const answer = route(call, calls.length - 1);
    return Promise.resolve(answer ?? json(404, { message: "not_in_test" }));
  };
  g.fetch = fetchImpl;
  (win as unknown as Record<string, unknown>).fetch = fetchImpl;
  return { calls, writes: (pattern: RegExp) => calls.filter((c) => c.method !== "GET" && pattern.test(c.path)), reads: (pattern: RegExp) => calls.filter((c) => c.method === "GET" && pattern.test(c.path)) };
}

export function setOnline(online: boolean) {
  Object.defineProperty(win.navigator, "onLine", { configurable: true, get: () => online });
  win.dispatchEvent(new win.Event(online ? "online" : "offline"));
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Rendering and user actions                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

type ReactDomClient = typeof import("react-dom/client");
type ReactModule = typeof import("react");

export async function mount(node: import("react").ReactNode) {
  const { createRoot } = (await import("react-dom/client")) as ReactDomClient;
  const { act } = (await import("react")) as ReactModule;
  const container = win.document.createElement("div");
  win.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(node); });
  await settle();
  return {
    container,
    async unmount() {
      await act(async () => { root.unmount(); });
      container.remove();
    },
  };
}

/** Lets pending promises (answered requests, effects) run, inside act. */
export async function settle(rounds = 5) {
  const { act } = (await import("react")) as ReactModule;
  for (let i = 0; i < rounds; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

export const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

export function buttons(container: Element, label: RegExp | string): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll("button")).filter((b) => (typeof label === "string" ? text(b) === label || b.getAttribute("aria-label") === label : label.test(text(b)) || label.test(b.getAttribute("aria-label") ?? ""))) as HTMLButtonElement[];
}

export function button(container: Element, label: RegExp | string): HTMLButtonElement {
  const found = buttons(container, label);
  if (!found.length) throw new Error(`no button ${String(label)} in: ${Array.from(container.querySelectorAll("button")).map((b) => JSON.stringify(text(b) || b.getAttribute("aria-label"))).join(", ")}`);
  return found[found.length - 1];
}

/** A user's tap: a disabled control cannot be tapped (the browser sends no click), an enabled one gets a real click. */
export async function tap(el: HTMLElement): Promise<"clicked" | "ignored-disabled"> {
  const { act } = (await import("react")) as ReactModule;
  if ((el as HTMLButtonElement).disabled) return "ignored-disabled";
  await act(async () => { el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true })); });
  return "clicked";
}

/** Types into a controlled input/textarea the way a browser does (native setter + input event). */
export async function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const { act } = (await import("react")) as ReactModule;
  const proto = el instanceof win.HTMLTextAreaElement ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  await act(async () => {
    setter?.call(el, value);
    el.dispatchEvent(new win.Event("input", { bubbles: true }));
    el.dispatchEvent(new win.Event("change", { bubbles: true }));
  });
}

export const isBusy = (el: HTMLButtonElement) => el.disabled || el.getAttribute("aria-busy") === "true" || el.getAttribute("aria-disabled") === "true";

/** The visible message a failure left (role=alert / role=status). */
export const messages = (container: Element) => Array.from(container.querySelectorAll('[role="alert"],[role="status"]')).map(text).filter(Boolean);

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export { win };
