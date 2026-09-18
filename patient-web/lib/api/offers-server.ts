import { callPatientApi } from "@/lib/api/upstream";
export function getOffers(accessToken: string) { return callPatientApi("/home/offers", {}, accessToken); }
export function getOffer(accessToken: string, offerId: string) { return callPatientApi(`/offers/${encodeURIComponent(offerId)}`, {}, accessToken); }
export function getOfferProviders(accessToken: string, offerId: string) { return callPatientApi(`/promotions/offers/${encodeURIComponent(offerId)}/providers`, {}, accessToken); }
