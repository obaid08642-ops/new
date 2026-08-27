import { describe, expect, it } from "vitest";
import { parseRefreshedTokens, refreshRequestBody } from "./refresh";

describe("refresh contract", () => {
  it("uses the backend refresh_token key and accepts only a complete rotated token pair", () => {
    expect(JSON.parse(refreshRequestBody("refresh-value"))).toEqual({ refresh_token: "refresh-value" });
    expect(parseRefreshedTokens({ accessToken: "access", refreshToken: "refresh" })).toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(parseRefreshedTokens({ accessToken: "access" })).toBeNull();
  });
});
