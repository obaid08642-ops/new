import { describe, expect, it } from "vitest";
import { forwardedForHeaders } from "./client-ip";

const req = (headers: Record<string, string>) => new Request("https://nabd.plus/api/x", { headers });

describe("forwardedForHeaders", () => {
  it("forwards the chain as it arrived, so the backend's trusted-hop count picks the visitor", () => {
    expect(forwardedForHeaders(req({ "x-forwarded-for": "198.51.100.7, 172.70.0.1" }))).toEqual({ "x-forwarded-for": "198.51.100.7, 172.70.0.1" });
    expect(forwardedForHeaders(req({ "x-forwarded-for": "2001:db8::1, 172.70.0.1" }))).toEqual({ "x-forwarded-for": "2001:db8::1, 172.70.0.1" });
  });
  it("forwards nothing when there is no chain, and drops a value that is not one", () => {
    expect(forwardedForHeaders(req({}))).toEqual({});
    expect(forwardedForHeaders(req({ "x-forwarded-for": "" }))).toEqual({});
    expect(forwardedForHeaders(req({ "x-forwarded-for": "1.1.1.1; DROP TABLE" }))).toEqual({});
    expect(forwardedForHeaders(req({ "x-forwarded-for": "1".repeat(300) }))).toEqual({});
  });
  it("forwards only that header", () => {
    expect(Object.keys(forwardedForHeaders(req({ "x-forwarded-for": "1.1.1.1", cookie: "nabd_access=secret", authorization: "Bearer x", "x-real-ip": "2.2.2.2" })))).toEqual(["x-forwarded-for"]);
  });
});
