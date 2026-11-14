import { describe, expect, it } from "vitest";
import { iceServersFrom } from "./ice-servers";

describe("iceServersFrom", () => {
  it("keeps stun/turn/turns entries with their short-lived credentials", () => {
    expect(iceServersFrom([{ urls: ["turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "c" }, { urls: ["stun:s:3478"] }])).toEqual([
      { urls: ["turns:turn.cloudflare.com:443?transport=tcp"], username: "u", credential: "c" },
      { urls: ["stun:s:3478"] },
    ]);
  });
  it("drops anything else", () => {
    expect(iceServersFrom(undefined)).toEqual([]);
    expect(iceServersFrom([null, 5, { urls: ["http://x"] }, { urls: "turn:x" }, { urls: [] }])).toEqual([]);
  });
});
