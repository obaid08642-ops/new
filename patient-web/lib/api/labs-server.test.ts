import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
vi.mock("@/lib/api/upstream", () => ({ patientApiUrl: (path: string) => `https://api.test${path}` }));

import { getPublicLabServices } from "./labs-server";

describe("labs server wrapper", () => {
  beforeEach(() => fetchMock.mockReset());
  it("forwards only documented public query parameters", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    await getPublicLabServices({ search: "cbc", category: "blood", homeOnly: true, lowestPrice: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/labs/services?category=blood&search=cbc&home_visit=true&lowest_price=true");
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.headers).not.toHaveProperty("Authorization");
  });
});
