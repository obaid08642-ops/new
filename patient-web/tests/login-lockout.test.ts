import { describe, expect, it } from "vitest";
import { afterFailure, LOCK_MS, minutesLeft } from "@/lib/auth/login-lockout";

describe("login lockout", () => {
  it("locks for five minutes on the fifth failure", () => {
    let state = { fails: 0, lockedUntil: 0 };
    for (let i = 0; i < 4; i += 1) state = afterFailure(state, 1000);
    expect(state.lockedUntil).toBe(0);
    state = afterFailure(state, 1000);
    expect(state.lockedUntil).toBe(1000 + LOCK_MS);
    expect(minutesLeft(state, 1000)).toBe(5);
  });
  it("is not locked once the time has passed", () => {
    expect(minutesLeft({ fails: 0, lockedUntil: 1000 }, 2000)).toBe(0);
  });
});
