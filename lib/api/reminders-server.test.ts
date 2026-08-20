import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
import { getPatientMedicationReminders } from "./reminders-server";

describe("medication reminder server boundary", () => {
  beforeEach(() => callPatientApi.mockReset());
  it("uses the active reminder list path and server token", async () => {
    const response = new Response(null, { status: 200 });
    callPatientApi.mockResolvedValue(response);
    await getPatientMedicationReminders("server-token");
    expect(callPatientApi).toHaveBeenCalledWith("/health/reminders", {}, "server-token");
  });
});
