import { callPatientApi } from "@/lib/api/upstream";

export function getPatientWishlist(accessToken: string) {
  return callPatientApi("/users/me/wishlist", {}, accessToken);
}
