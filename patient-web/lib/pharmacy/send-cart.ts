import type { BroadcastRequest, createBroadcastAttempt } from "./broadcast";
import type { DeliveryAddress } from "./delivery-address";

/**
 * The "send the order" step of the local-first cart: the ONLY step that needs the backend. The cart is cleared (`onSent`)
 * only after the backend confirmed that the order was created and submitted. Every failure (no connection, a 5xx, a 4xx,
 * a lost session) leaves the cart exactly as it was: nothing is cleared and no line is removed, so the patient can retry.
 */
export type SendFailure = "session" | "forbidden" | "network" | "server" | "send";
export type SendOutcome = { status: "busy" } | { status: "sent"; orderId: string } | { status: "failed"; failure: SendFailure };

type Attempt = ReturnType<typeof createBroadcastAttempt>;

export async function sendCartRequest(
  attempt: Attempt,
  request: BroadcastRequest,
  address: DeliveryAddress & { lat: number; lng: number },
  onSent: () => void,
): Promise<SendOutcome> {
  let result;
  try {
    result = await attempt.run(request, address);
  } catch {
    return { status: "failed", failure: "network" };
  }
  if (!result) return { status: "busy" }; // another send is already in flight: nothing was sent
  if (result.ok) {
    onSent();
    return { status: "sent", orderId: result.orderId };
  }
  // No answer: a connection problem. A 5xx: the server answered with an error (journey 9: it is not "check your connection").
  // Either may or may not have been applied: the retry is the same request and will not create a second order.
  const failure: SendFailure = result.reason === "unauthenticated" ? "session" : result.status === 403 ? "forbidden"
    : result.status === undefined ? "network" : result.status >= 500 ? "server" : "send";
  return { status: "failed", failure };
}
