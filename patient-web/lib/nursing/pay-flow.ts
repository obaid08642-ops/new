/** How a home visit is paid, chosen on the hub and carried to the booking (decision 25: card or insurance, never cash). */
export type PayFlow = "card" | "insurance";

export function servicePayFlow(value: unknown): PayFlow {
  return value === "insurance" ? "insurance" : "card";
}
