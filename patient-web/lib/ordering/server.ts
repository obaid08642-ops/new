import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { pointFromAddresses, type Point } from "./context";
import { ordersOf, type MedicalOrder } from "@/lib/medical-orders/medical-orders";

/** The signed-in patient's access token, or null (no redirect: the caller decides what a signed-out visitor sees). */
export async function optionalToken(locale: string): Promise<string | null> {
  try {
    return await requirePatientAccess(locale);
  } catch {
    return null;
  }
}

/** The point of the default saved address (GET /users/me/addresses), or null when the patient has no address with coordinates. */
export async function patientPoint(token: string): Promise<Point | null> {
  const res = await callPatientApi("/users/me/addresses", { cache: "no-store" }, token).catch(() => null);
  return res?.ok ? pointFromAddresses(await res.json().catch(() => null)) : null;
}

export const kindOf = (v: unknown): "lab" | "radiology" | "nursing" => (v === "radiology" || v === "nursing" ? v : "lab");

/** The patient's active medical orders (GET /medical-orders/mine?active=1), or null when the read fails (the screen then says so; it never guesses). */
export async function activeMedicalOrders(token: string): Promise<MedicalOrder[] | null> {
  const res = await callPatientApi("/medical-orders/mine?active=1", { cache: "no-store" }, token).catch(() => null);
  return res?.ok ? ordersOf(await res.json().catch(() => null)).filter((o) => !o.expired) : null;
}
