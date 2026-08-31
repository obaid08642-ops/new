import { Redirect, useLocalSearchParams } from "expo-router";

/** @deprecated Merged into virtual-waiting-room (Phase 2.1). Kept as a safe redirect for deep links. */
export default function WaitingRoomRedirect() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  return <Redirect href={id ? `/consultations/virtual-waiting-room?id=${id}` : "/consultations/virtual-waiting-room"} />;
}
