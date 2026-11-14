import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ labs: vi.fn(), radiology: vi.fn() }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.labs }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.radiology }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("@/tests/helpers/intl");
  return { getTranslations: async (arg: { locale: string; namespace: string }) => createTranslator("en", arg.namespace) };
});
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en" }));
import { GET } from "./route";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const call = (qs: string) => GET(new Request(`http://localhost/api/diagnostics/catalog?${qs}`));

beforeEach(() => { state.labs.mockReset(); state.radiology.mockReset(); });

describe("GET /api/diagnostics/catalog (Show more of the hub)", () => {
  it("asks the next scan page with its category, sort and search, and answers drawn rows", async () => {
    state.radiology.mockResolvedValue(json({ data: [{ id: "s9", name_en: "Knee MRI", price: 400, category: "mri", rating: 4.5, rating_count: 3 }], total: 25, page: 2, limit: 20, total_pages: 2 }));
    const res = await call("kind=radiology&page=2&locale=en&cat=mri&sort=rating&q=knee");
    expect(state.radiology).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 20, category: "mri", highestRated: "true", search: "knee" }));
    const body = await res.json();
    expect(body).toMatchObject({ page: 2, hasMore: false, total: 25 });
    expect(body.rows[0]).toMatchObject({ id: "s9", art: "mri", title: "Knee MRI", rating: "Rating 4.5 (3)" });
  });
  it("tests: the chip is not sent to the server (a client filter), the sort is, and the plain array also parses", async () => {
    state.labs.mockResolvedValue(json(Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, name_en: `Test ${i}`, category: "hormones" }))));
    const res = await call("kind=lab&page=3&locale=en&cat=hormones&sort=price");
    expect(state.labs).toHaveBeenCalledWith(expect.not.objectContaining({ category: expect.anything() }));
    expect(state.labs).toHaveBeenCalledWith(expect.objectContaining({ page: 3, lowestPrice: true }));
    const body = await res.json();
    expect(body.rows).toHaveLength(20);
    expect(body.rows[0].art).toBe("hormones");
    expect(body.hasMore).toBe(true);
  });
  it("rejects a bad page or locale and reports an unavailable catalogue", async () => {
    expect((await call("kind=lab&page=0&locale=en")).status).toBe(400);
    expect((await call("kind=lab&page=1&locale=xx")).status).toBe(400);
    state.labs.mockResolvedValue(json({}, 503));
    expect((await call("kind=lab&page=1&locale=en")).status).toBe(502);
  });
});
