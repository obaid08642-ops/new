import { callPatientApi } from "@/lib/api/upstream";
/** The live offer campaigns: a public read (issue 1550), the session is passed on when there is one. */
export function getOffers(accessToken?: string) { return callPatientApi("/home/offers", {}, accessToken); }
export function getOffer(accessToken: string, offerId: string) { return callPatientApi(`/offers/${encodeURIComponent(offerId)}`, {}, accessToken); }
export function getOfferProviders(accessToken: string, offerId: string) { return callPatientApi(`/promotions/offers/${encodeURIComponent(offerId)}/providers`, {}, accessToken); }
