import { describe, expect, it, vi } from "vitest";

const upstream = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: upstream.call }));
vi.mock("@/lib/api/response", () => ({ forwardApiResponse: async (r: Response) => r }));

import { POST } from "./route";

const post = (body: unknown) => POST(new Request("http://x/api/pharmacy/events", { method: "POST", body: JSON.stringify(body) }) as never);

describe("POST /api/pharmacy/events", () => {
  it("forwards a view with its session", async () => {
    upstream.call.mockResolvedValue(new Response("{}", { status: 200 }));
    await post({ event_type: "product_viewed", drug_id: "m1", session_id: "s1" });
    const [path, init] = upstream.call.mock.calls[0];
    expect(path).toBe("/medicines/events");
    expect(JSON.parse(init.body)).toEqual({ event_type: "product_viewed", drug_id: "m1", session_id: "s1" });
  });

  it("refuses the events the server records itself and bodies without a session", async () => {
    upstream.call.mockClear();
    for (const body of [
      { event_type: "purchase_completed", drug_id: "m1", session_id: "s1" },
      { event_type: "product_added_to_cart", drug_id: "m1", session_id: "s1" },
      { event_type: "product_viewed", drug_id: "m1" },
      { event_type: "product_viewed", session_id: "s1" },
    ]) expect((await post(body)).status).toBe(400);
    expect(upstream.call).not.toHaveBeenCalled();
  });
});
