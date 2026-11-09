import { describe, expect, it, vi } from "vitest";
import { outcomeOfProbe, probeFile } from "./probe-file";

const res = (status: number, body?: unknown, type: ResponseType = "basic") => ({ status, type, json: async () => body, body: { cancel: async () => undefined } }) as unknown as Response;

describe("opening a stored file while it may still be scanned", () => {
  it("a 423 is pending, with the server's retry time, never an error", async () => {
    const doFetch = vi.fn(async () => res(423, { message: "file_pending_scan", retry_after_seconds: 45 }));
    expect(await probeFile("/api/patient/x", doFetch as never)).toEqual({ status: 423, body: { message: "file_pending_scan", retry_after_seconds: 45 } });
    expect(await outcomeOfProbe("/api/patient/x", doFetch as never)).toEqual({ state: "pending", retryAfterSeconds: 45 });
    expect(doFetch).toHaveBeenCalledWith("/api/patient/x", expect.objectContaining({ redirect: "manual", cache: "no-store" }));
  });
  it("a file that opens, or a redirect to its signed address, is ok", async () => {
    expect(await outcomeOfProbe("/a", (async () => res(200)) as never)).toEqual({ state: "ok" });
    expect(await outcomeOfProbe("/a", (async () => res(0, undefined, "opaqueredirect")) as never)).toEqual({ state: "ok" });
  });
  it("a file the scan failed is rejected", async () => {
    expect(await outcomeOfProbe("/a", (async () => res(400, { message: "file_infected" })) as never)).toEqual({ state: "rejected" });
  });
  it("any other answer, and a network error, are ordinary errors (the link then opens as before)", async () => {
    expect(await outcomeOfProbe("/a", (async () => res(404)) as never)).toEqual({ state: "error" });
    expect(await outcomeOfProbe("/a", (async () => { throw new Error("offline"); }) as never)).toEqual({ state: "error" });
  });
});
