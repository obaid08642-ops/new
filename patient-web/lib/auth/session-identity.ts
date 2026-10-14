"use client";

import { useEffect, useState } from "react";
import { readSessionHintFromDocument } from "@/lib/auth/session-hint";

/**
 * Who is signed in, asked ONCE per page load from GET /api/auth/session (always 200: not being signed in is an answer).
 * The answer is kept in memory only (a module variable, never storage), so every component that needs it shares one
 * request. "unknown" means the probe could not be answered (backend down, bad reply): it is not cached, and a caller
 * must treat it as "change nothing". Sign-in and sign-out flows call `announceSignedIn()` / `announceSignedOut()` so the
 * answer is asked again (or reset) without a reload. Small and dependency-free on purpose: other client code reuses it.
 */
export type SessionIdentity =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "user"; id: string; isGuest: boolean }
  | { status: "unknown" };

export const SIGNED_IN_EVENT = "nabd:signed-in";
export const SIGNED_OUT_EVENT = "nabd:signed-out";

type Settled = Exclude<SessionIdentity, { status: "loading" }>;

let cached: Settled | null = null;
let inflight: Promise<Settled> | null = null;
let epoch = 0;

/** The readable hint cookie (lib/auth/session-hint) answers without a request; null means "ask the server" (older session, cookies cleared). */
function answerFromHint(): Settled | null {
  const hint = readSessionHintFromDocument();
  if (!hint) return null;
  return hint.kind === "anonymous" ? { status: "anonymous" } : { status: "user", id: hint.id, isGuest: hint.isGuest };
}

async function probe(): Promise<Settled> {
  const hinted = answerFromHint();
  if (hinted) return hinted;
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return { status: "unknown" };
    const body: unknown = await response.json().catch(() => null);
    if (!body || typeof body !== "object") return { status: "unknown" };
    const { authenticated, user } = body as { authenticated?: unknown; user?: { id?: unknown; is_guest?: unknown } | null };
    if (authenticated !== true) return authenticated === false ? { status: "anonymous" } : { status: "unknown" };
    const rawId = user?.id;
    const id = typeof rawId === "string" ? rawId : typeof rawId === "number" ? String(rawId) : "";
    return id ? { status: "user", id, isGuest: user?.is_guest === true } : { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
}

/** The shared answer: from memory when it is already known, otherwise one request that every caller waits on. */
export function getSessionIdentity(): Promise<Settled> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  const mine = epoch;
  const pending: Promise<Settled> = probe().then((answer) => {
    if (mine === epoch && answer.status !== "unknown") cached = answer;
    if (inflight === pending) inflight = null;
    return answer;
  });
  inflight = pending;
  return pending;
}

function reset(next: Settled | null) {
  epoch += 1;
  cached = next;
  inflight = null;
}

function dispatch(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

/** A sign-in flow succeeded (password, 2FA, OTP, social, guest): the next answer is asked again. */
export function announceSignedIn(): void {
  reset(null);
  dispatch(SIGNED_IN_EVENT);
}

/** Every sign-out button calls this once the logout request has finished (or failed): nobody is signed in on this device now. */
export function announceSignedOut(): void {
  reset({ status: "anonymous" });
  dispatch(SIGNED_OUT_EVENT);
}

/** Tests only: forget everything this module remembers. */
export function resetSessionIdentityForTests(): void {
  reset(null);
}

export function useSessionIdentity(): SessionIdentity {
  const [identity, setIdentity] = useState<SessionIdentity>({ status: "loading" });

  useEffect(() => {
    let live = true;
    let generation = 0;
    // an answer that was asked before a sign-in or sign-out event is stale and must not be shown
    const ask = () => {
      const mine = ++generation;
      void getSessionIdentity().then((answer) => {
        if (live && mine === generation) setIdentity(answer);
      });
    };
    const onSignedOut = () => {
      generation += 1;
      setIdentity({ status: "anonymous" });
    };
    ask();
    window.addEventListener(SIGNED_IN_EVENT, ask);
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => {
      live = false;
      window.removeEventListener(SIGNED_IN_EVENT, ask);
      window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
    };
  }, []);

  return identity;
}
