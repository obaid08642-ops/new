import { describe, expect, it, vi } from "vitest";
import { alreadyAsked, interestBody, loadInterestState, submitInterest, type InterestBody } from "@/lib/catalogue-interest";
import { isUnoffered } from "@/lib/api/offers";

const offer = (providersCount: number) => ({ providersCount, premisesAvailable: false, homeAvailable: false, insuranceAccepted: false });
const reply = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("no providers yet", () => {
  it("is decided by the offer summary the screens already have: 0 providers is unoffered, no summary is unknown", () => {
    expect(isUnoffered(offer(0))).toBe(true);
    expect(isUnoffered(offer(2))).toBe(false);
    expect(isUnoffered(undefined)).toBe(false);
  });
});

describe("the interest request is typed like the backend DTO", () => {
  it("accepts lab, radiology and nursing with an id of 1 to 128 characters and refuses the rest", () => {
    expect(interestBody("lab", "cbc")).toEqual({ service_type: "lab", service_id: "cbc" });
    expect(interestBody("nursing", " svc-1 ")).toEqual({ service_type: "nursing", service_id: "svc-1" });
    expect(interestBody("pharmacy", "x")).toBeNull();
    expect(interestBody("lab", "")).toBeNull();
    expect(interestBody("lab", "x".repeat(129))).toBeNull();
  });
  it("posts the DTO body to /api/patient/catalogue-interest and reports done", async () => {
    const doFetch = reply(201, { ok: true, interested: true });
    expect(await submitInterest("radiology", "mri-1", doFetch)).toBe("done");
    const [url, init] = (doFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/patient/catalogue-interest");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)) satisfies InterestBody).toEqual({ service_type: "radiology", service_id: "mri-1" });
  });
  it("maps 401 to guest, other errors and network failures to failed, and sends nothing for an invalid body", async () => {
    expect(await submitInterest("lab", "cbc", reply(401))).toBe("guest");
    expect(await submitInterest("lab", "cbc", reply(500))).toBe("failed");
    expect(await submitInterest("lab", "cbc", vi.fn(async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBe("failed");
    const never = reply(200);
    expect(await submitInterest("lab", "", never)).toBe("invalid");
    expect(never).not.toHaveBeenCalled();
  });
});

describe("the state after a reload comes from GET /catalogue-interest/mine", () => {
  const mine = [{ service_type: "lab", service_id: "rare", created_at: "x", notified_at: null }];
  it("is asked when the service is listed, ready when not, guest on 401, ready when the list cannot be read", async () => {
    expect(alreadyAsked(mine, "lab", "rare")).toBe(true);
    expect(alreadyAsked(mine, "radiology", "rare")).toBe(false);
    expect(await loadInterestState("lab", "rare", reply(200, mine))).toBe("asked");
    expect(await loadInterestState("lab", "other", reply(200, mine))).toBe("ready");
    expect(await loadInterestState("lab", "rare", reply(401))).toBe("guest");
    expect(await loadInterestState("lab", "rare", reply(500))).toBe("ready");
  });
});
