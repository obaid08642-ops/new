// ACCEPTANCE — D-31 rule checks shared by the web tests (not a test file). Written by the reviewer before the work; the
// implementing agent makes the tests pass and may not edit it.
import { expect } from "vitest";
import type { Call } from "./harness";

/**
 * Rule A2: after a request that got NO answer (it may have reached the server), the next attempt either
 *  - sends the SAME Idempotency-Key as the lost one, or
 *  - asks the server for the result (a GET on a status/result path) instead of creating a new one.
 */
export function expectRetryIsSafe(label: string, calls: Call[], write: RegExp, statusCheck: RegExp = /status|verify|result|transactions?\//) {
  const writes = calls.filter((c) => c.method !== "GET" && write.test(c.path));
  expect(writes.length, `${label}: the first attempt was never sent`).toBeGreaterThanOrEqual(1);
  const lostAt = calls.indexOf(writes[0]);
  const askedForResult = calls.slice(lostAt + 1).some((c) => c.method === "GET" && statusCheck.test(c.path));
  if (writes.length < 2) {
    expect(askedForResult, `${label}: the retry sent nothing and asked the server nothing (no second ${write} and no status GET)`).toBe(true);
    return;
  }
  const [first, second] = writes;
  if (askedForResult && calls.indexOf(second) > calls.findIndex((c, i) => i > lostAt && c.method === "GET" && statusCheck.test(c.path))) return;
  expect(first.key, `${label}: the lost request carried no Idempotency-Key`).toBeTruthy();
  expect(second.key, `${label}: two different keys sent after a lost connection: ${first.key} vs ${second.key}`).toBe(first.key);
}

/** Rule A1: two taps while the first request is in flight reach the network once. */
export function expectOneWrite(label: string, calls: Call[], write: RegExp) {
  const writes = calls.filter((c) => c.method !== "GET" && write.test(c.path));
  expect(writes.length, `${label}: ${writes.length} requests to ${write} after two taps (keys: ${writes.map((w) => w.key).join(" , ")})`).toBe(1);
}
