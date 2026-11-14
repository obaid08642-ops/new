import { type NextRequest } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";

/**
 * 17.3: the trending searches of the last seven days (GET /medicines/search/trending is @Public on the backend). The page
 * size is fixed here, not taken from the caller: the backend caches one answer for every size, so a caller's size would
 * be served to everyone. No session is sent: the answer is the same for everyone.
 */
export async function GET(request: NextRequest) {
  const upstream = await callPatientApi("/medicines/search/trending?limit=8", { signal: request.signal });
  return forwardApiResponse(upstream);
}
