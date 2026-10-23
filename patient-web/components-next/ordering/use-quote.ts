"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OrderingApiError, requestQuote } from "@/lib/ordering/client";
import { orderingErrorKey, type Quote, type QuoteRequest } from "@/lib/ordering/quote";

export type QuoteState = { status: "idle" } | { status: "loading" } | { status: "ready"; quote: Quote } | { status: "error"; errorKey: string };

/** Asks POST /ordering/quote whenever the request changes (and on `reload`); a newer request cancels the older one. `null` = nothing to ask. */
export function useQuote(request: QuoteRequest | null) {
  const [state, setState] = useState<QuoteState>({ status: "idle" });
  const [tick, setTick] = useState(0);
  const key = request ? JSON.stringify(request) : "";
  const latest = useRef(request);
  latest.current = request;

  useEffect(() => {
    const req = latest.current;
    if (!req) { setState({ status: "idle" }); return; }
    const ctl = new AbortController();
    setState({ status: "loading" });
    requestQuote(req, ctl.signal)
      .then((quote) => { if (!ctl.signal.aborted) setState({ status: "ready", quote }); })
      .catch((e: unknown) => {
        if (ctl.signal.aborted) return;
        setState({ status: "error", errorKey: e instanceof OrderingApiError ? (e.code === "network" ? "errNetwork" : orderingErrorKey(e.code)) : "errGeneric" });
      });
    return () => ctl.abort();
  }, [key, tick]);

  return { state, reload: useCallback(() => setTick((n) => n + 1), []) };
}
