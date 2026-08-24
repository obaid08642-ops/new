import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
import { getPatientFamilyMembers } from "./family-server";

describe("family server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the current-patient family list path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientFamilyMembers("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/family/members", {}, "server-token");
  });
});
