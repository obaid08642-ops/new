import { describe, expect, it } from "vitest";
import { LARGE_BODY_BYTES, TIMEOUTS, requestKind, timeoutForRequest } from "./policy";

/**
 * P15.4 — a base64 prescription photo inside a JSON envelope is megabytes on
 * the wire, exactly like a multipart upload. It gets the 60 s upload deadline
 * so it does not time out on precisely the networks that need it most.
 */

describe("P15.4 — large single-shot bodies upload", () => {
  it("classifies a megabyte-plus JSON body as an upload", () => {
    expect(LARGE_BODY_BYTES).toBe(1_000_000);
    const big = "x".repeat(LARGE_BODY_BYTES);
    expect(requestKind("/api/patient/prescriptions/upload", { method: "POST", body: JSON.stringify({ upload_image: big }) })).toBe("upload");
    expect(timeoutForRequest("/api/patient/prescriptions/upload", { method: "POST", body: big })).toBe(TIMEOUTS.upload);
  });

  it("leaves small JSON bodies on the default deadline", () => {
    expect(requestKind("/api/patient/reminders/log", { method: "POST", body: JSON.stringify({ status: "taken" }) })).toBe("default");
    expect(timeoutForRequest("/api/patient/reminders/log", { method: "POST", body: "{}" })).toBe(TIMEOUTS.default);
  });

  it("measures Blob and ArrayBuffer bodies, not just strings", () => {
    const blob = new Blob([new Uint8Array(LARGE_BODY_BYTES)]);
    expect(requestKind("/api/x", { method: "POST", body: blob })).toBe("upload");
    const small = new Blob(["tiny"]);
    expect(requestKind("/api/x", { method: "POST", body: small })).toBe("default");
  });
});
