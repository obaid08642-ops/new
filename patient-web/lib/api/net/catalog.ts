/**
 * P15.1 — the bridge from a catalog-mapped `ApiError` to localized text.
 *
 * Kept as a pure function of two translators so it is unit-testable in node
 * (there is no DOM and no next-intl provider in the test environment), and so
 * the same rules back the UI hook in `use-error-copy.ts`.
 *
 * Copy lives in `messages/<locale>.json`:
 *   - `Errors.<CODE>.message` / `.nextStep` — the 13.R5 catalogue;
 *   - `Network.*` — transport wording the backend catalogue cannot know about
 *     (a browser timeout never reached a server) and the actionable next steps.
 */

import { ApiError, isApiError, type CatalogCode, type FailureReason, type NextStepAction } from "./errors";

/** next-intl's `t` for one namespace. */
export type Translate = (key: string) => string;

export type ErrorCopy = {
  code: CatalogCode;
  action: NextStepAction;
  reason: FailureReason;
  message: string;
  nextStep: string;
  /** The error id to quote to support; empty when the server sent none. */
  reference: string;
};

/** The transport sentence that actually fits, keyed by failure reason. */
const REASON_KEY: Record<FailureReason, string> = {
  offline: "offline",
  network: "offline",
  timeout: "timeout",
  status: "serverError",
  unknown: "serverError",
};

function referenceOf(error: unknown): string {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.length <= 64 ? digest : "";
}

export function resolveErrorCopy(errors: Translate, network: Translate, error: unknown): ErrorCopy {
  const apiError: ApiError | null = isApiError(error) ? error : null;
  const code: CatalogCode = apiError?.code ?? "UNKNOWN_ERROR";
  const action: NextStepAction = apiError?.action ?? "contact_support";
  const reason: FailureReason = apiError?.reason ?? "unknown";

  const message =
    reason === "offline" || reason === "network" || reason === "timeout"
      ? network(REASON_KEY[reason])
      : errors(`${code}.message`);

  const nextStep = action === "none" ? "" : network(`nextStep.${action}`);

  return { code, action, reason, message, nextStep, reference: referenceOf(error) };
}

/**
 * Reads the `Errors`/`Network` message objects straight off a loaded dictionary.
 * Used by the parity test and by any non-React caller.
 */
export function translatorsFromMessages(
  messages: Record<string, unknown>,
): { errors: Translate; network: Translate } {
  const pick = (namespace: string): Translate => {
    const table = messages[namespace];
    if (!table || typeof table !== "object") return (key: string) => key;
    return (key: string) => {
      let cursor: unknown = table;
      for (const segment of key.split(".")) {
        if (!cursor || typeof cursor !== "object") return `${namespace}.${key}`;
        cursor = (cursor as Record<string, unknown>)[segment];
      }
      return typeof cursor === "string" ? cursor : `${namespace}.${key}`;
    };
  };
  return { errors: pick("Errors"), network: pick("Network") };
}
