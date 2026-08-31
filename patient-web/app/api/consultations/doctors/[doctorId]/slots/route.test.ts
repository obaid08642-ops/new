import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => undefined })) }));

import { GET } from "./route";

describe("consultation slots BFF", () => {
  it("rejects an invalid date", async () => {
    const res = await GET(new Request("https://nabd.plus/api/consultations/doctors/dr-1/slots?date=bad&service_type=clinic"), { params: Promise.resolve({ doctorId: "dr-1" }) });
    expect(res.status).toBe(400);
  });
  it("requires a patient session", async () => {
    const res = await GET(new Request("https://nabd.plus/api/consultations/doctors/dr-1/slots?date=2026-09-01&service_type=video"), { params: Promise.resolve({ doctorId: "dr-1" }) });
    expect(res.status).toBe(401);
  });
});
