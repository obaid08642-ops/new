import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), requirePatientAccess: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
import OrdersPage from "./page";
import OrderDetailPage from "./[orderId]/page";
const serverToken = "server-only-order-token";
const orderId = "91047ef2-ad36-422a-a184-629693e7c729";
describe("orders SSR boundary and visual card", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders the order card through BFF without embedding the session token", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: orderId, reference: "Order-123", status: "CONFIRMED" }] }), { status: 200 })); const html = renderToStaticMarkup(await OrdersPage({ params: Promise.resolve({ locale: "ar" }) })); expect(state.callPatientApi).toHaveBeenCalledWith("/patient/pharmacy/orders", {}, serverToken); expect(html).toContain("Order-123"); expect(html).toContain(`/ar/orders/${orderId}`); expect(html).not.toContain(serverToken); }); });

describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, address, price, or token", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ data: { id: orderId, reference: "Order-123", status: "CONFIRMED", patient_name: "private-customer", delivery_address: "private-address", total_price: 500 } }), { status: 200 })); const html = renderToStaticMarkup(await OrderDetailPage({ params: Promise.resolve({ locale: "en", orderId }) })); expect(state.callPatientApi).toHaveBeenCalledWith(`/patient/pharmacy/orders/${orderId}`, {}, serverToken); expect(html).toContain("Order-123"); expect(html).toContain("CONFIRMED"); expect(html).toContain('href="/en/orders"'); for (const secret of [serverToken, "private-customer", "private-address", "500"]) expect(html).not.toContain(secret); }); });
