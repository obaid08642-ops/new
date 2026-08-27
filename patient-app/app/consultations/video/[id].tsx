// @ts-nocheck
// Legacy route — the real LiveKit video room is /consultations/video-call.
// This file previously rendered a "VideoCall - s64" placeholder stub.
import { Redirect, useLocalSearchParams } from "expo-router";
export default function R() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: "/consultations/video-call", params: { sessionId: params.id } }} />;
}
