import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "nabd_access" ? { value: "token" } : undefined) }) }));

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rule";
import { POST as reset } from "@/app/api/auth/password/reset/route";
import { POST as change } from "@/app/api/settings/password/route";

function json(body: unknown) { return new Request("https://web.test/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
const pw = (n: number) => "a1".repeat(n).slice(0, n);

describe("password minimum shared by the forms, the routes and the backend", () => {
  beforeEach(() => state.callPatientApi.mockReset());
  it("is 8", () => expect(MIN_PASSWORD_LENGTH).toBe(8));
  it("reset route forwards an 8 and a 9 character password and rejects 7", async () => {
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 201 }));
    expect((await reset(json({ reset_token: "t", new_password: pw(8) }))).status).toBe(201);
    expect((await reset(json({ reset_token: "t", new_password: pw(9) }))).status).toBe(201);
    expect((await reset(json({ reset_token: "t", new_password: pw(7) }))).status).toBe(400);
    expect(state.callPatientApi).toHaveBeenCalledTimes(2);
  });
  it("change-password route forwards 8 and rejects 7", async () => {
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 201 }));
    expect((await change(json({ current_password: "old", new_password: pw(8) }))).status).toBe(200);
    expect((await change(json({ current_password: "old", new_password: pw(7) }))).status).toBe(400);
    expect(state.callPatientApi).toHaveBeenCalledTimes(1);
  });
});
