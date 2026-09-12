import { Redirect, useLocalSearchParams } from "expo-router";

/** Merged into pharmacy/broadcast-status (J1 journey compression) — cancel ported there.
 *  Deep-link-safe redirect: waiting-for-pharmacy?orderId=X → broadcast-status?requestId=X. */
export default function WaitingForPharmacyRedirect() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Array.isArray(orderId) ? orderId[0] : orderId;
  return <Redirect href={{ pathname: "/pharmacy/broadcast-status", params: id ? { requestId: id } : {} }} />;
}
