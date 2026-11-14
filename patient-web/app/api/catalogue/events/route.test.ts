import { describe, expect, it, vi } from "vitest";

const upstream = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: upstream.call }));
vi.mock("@/lib/api/response", () => ({ forwardApiResponse: async (r: Response) => r }));

import { POST } from "./route";

const post = (body: unknown) => POST(new Request("http://x/api/catalogue/events", { method: "POST", body: JSON.stringify(body) }) as never);
const ok = { vertical: "lab", service_id: "64a1b2c3d4e5f60718293a4b", event: "view", session_id: "s1" };

describe("POST /api/catalogue/events", () => {
  it("forwards a view to the public ranking endpoint", async () => {
    upstream.call.mockResolvedValue(new Response("{}", { status: 200 }));
    await post(ok);
    const [path, init] = upstream.call.mock.calls[0];
    expect(path).toBe("/catalogue/ranking/events");
    expect(JSON.parse(init.body)).toEqual(ok);
  });

  it("refuses cart_add and order, unknown verticals, bad ids and a missing session", async () => {
    upstream.call.mockClear();
    for (const body of [{ ...ok, event: "cart_add" }, { ...ok, event: "order" }, { ...ok, vertical: "pharmacy" }, { ...ok, service_id: "x" }, { ...ok, session_id: "" }])
      expect((await post(body)).status).toBe(400);
    expect(upstream.call).not.toHaveBeenCalled();
  });
});
