import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG_CODES } from "./errors";
import { resolveErrorCopy, translatorsFromMessages, type Translate } from "./catalog";
import { ApiError } from "./errors";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

/**
 * P15.1 — "every error mapped to the error catalog, with a localized message and
 * a next step". The catalogue is the six `messages/<locale>.json` files, so the
 * proof that it is complete is that every code and every action resolves in all
 * six locales. This is also what keeps the six-locale parity contract honest for
 * the namespaces this work adds.
 */
function messagesFor(locale: (typeof LOCALES)[number]) {
  return JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8")) as Record<string, unknown>;
}

const passthrough = (key: string) => key;

describe("P15.1 — the client catalogue resolves in all six locales", () => {
  for (const locale of LOCALES) {
    it(`${locale}: every catalog code has a message and a next step`, () => {
      const { errors, network } = translatorsFromMessages(messagesFor(locale));
      for (const code of CATALOG_CODES) {
        const copy = resolveErrorCopy(errors, network, new ApiError(code, "retry", "raw"));
        expect(copy.message, `${locale} ${code} message`).not.toBe(`Errors.${code}.message`);
        expect(copy.message.length).toBeGreaterThan(0);
        expect(copy.nextStep.length).toBeGreaterThan(0);
      }
    });

    it(`${locale}: every transport failure has its own sentence`, () => {
      const { errors, network } = translatorsFromMessages(messagesFor(locale));
      const sentences = new Set<string>();
      for (const error of [
        new ApiError("SERVICE_UNAVAILABLE", "check_connection", "offline", { reason: "offline" }),
        new ApiError("SERVICE_UNAVAILABLE", "retry", "request_timeout", { reason: "timeout" }),
        new ApiError("SERVICE_UNAVAILABLE", "check_connection", "network_error", { reason: "network" }),
        new ApiError("SERVICE_UNAVAILABLE", "retry", "x", { reason: "status", status: 503 }),
      ]) {
        const copy = resolveErrorCopy(errors, network, error);
        expect(copy.message).not.toContain("Network.");
        sentences.add(copy.message);
      }
      // offline and network collapse onto one sentence; timeout and status must
      // not, otherwise a slow server reads as a dead connection.
      expect(sentences.size).toBe(3);
    });

    it(`${locale}: the next step is the actionable one the contract names`, () => {
      const { errors, network } = translatorsFromMessages(messagesFor(locale));
      const actions = ["retry", "check_connection", "contact_support", "sign_in", "wait"] as const;
      const seen = new Set<string>();
      for (const action of actions) {
        const copy = resolveErrorCopy(errors, network, new ApiError("SERVICE_UNAVAILABLE", action, "raw"));
        expect(copy.nextStep, `${locale} ${action}`).not.toBe(`Network.nextStep.${action}`);
        seen.add(copy.nextStep);
      }
      expect(seen.size).toBe(actions.length);
    });
  }

  it("uses the catalog message for a server failure and the transport sentence otherwise", () => {
    const { errors, network } = translatorsFromMessages(messagesFor("en"));
    const t: Translate = passthrough;

    const status = resolveErrorCopy(errors, network, new ApiError("RATE_LIMITED", "wait", "raw", { status: 429 }));
    expect(status.message).toBe(errors("RATE_LIMITED.message"));
    expect(status.nextStep).toBe(network("nextStep.wait"));

    const timeout = resolveErrorCopy(errors, network, new ApiError("SERVICE_UNAVAILABLE", "retry", "raw", { reason: "timeout" }));
    expect(timeout.message).toBe(network("timeout"));
  });

  it("falls back to the catalog for a non-ApiError and still offers a next step", () => {
    const { errors, network } = translatorsFromMessages(messagesFor("en"));
    const copy = resolveErrorCopy(errors, network, new TypeError("boom"));
    expect(copy.code).toBe("UNKNOWN_ERROR");
    expect(copy.action).toBe("contact_support");
    expect(copy.message).toBe(errors("UNKNOWN_ERROR.message"));
    expect(copy.nextStep).toBe(network("nextStep.contact_support"));
  });

  it("says nothing when the action is none, so a cancelled screen stays silent", () => {
    const { errors, network } = translatorsFromMessages(messagesFor("en"));
    expect(resolveErrorCopy(errors, network, new ApiError("UNKNOWN_ERROR", "none", "raw")).nextStep).toBe("");
  });

  it("surfaces the Next.js digest as the support reference", () => {
    const { errors, network } = translatorsFromMessages(messagesFor("en"));
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    expect(resolveErrorCopy(errors, network, error).reference).toBe("abc123");
  });
});
