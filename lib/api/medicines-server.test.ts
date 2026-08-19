import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));

import { getPatientMedicine, getPatientMedicines } from "./medicines-server";

describe("medicine server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());

  it("forwards only bounded read paths with the server access token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);

    await getPatientMedicines("server-token", { q: "query", page: 1 });
    await getPatientMedicine("server-token", "91047ef2-ad36-422a-a184-629693e7c729");

    expect(callPatientApi).toHaveBeenNthCalledWith(1, "/medicines?limit=24&page=1&q=query", {}, "server-token");
    expect(callPatientApi).toHaveBeenNthCalledWith(2, "/medicines/91047ef2-ad36-422a-a184-629693e7c729/details", {}, "server-token");
  });
});
