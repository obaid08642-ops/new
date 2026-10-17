import { callPatientApi } from "@/lib/api/upstream";
import { forwardApiResponse } from "@/lib/api/response";

/**
 * Issue 1550: the facilities of the public map (/map). GET /providers/map is @Public on the backend: the published facilities
 * only (the provider pages' public discovery filter), with their public name, city, rating and stored position, never a
 * personal field. It used to go through the patient proxy, which answers 401 to a guest, so a guest saw an empty map. No
 * credential and no query is passed on: the answer is the same for everyone.
 */
export async function GET() {
  return forwardApiResponse(await callPatientApi("/providers/map"));
}
