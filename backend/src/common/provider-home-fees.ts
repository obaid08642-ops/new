/**
 * The home fees of a visit: the provider's own fee when they set one (registration), else the platform default. One rule for the
 * consultation home visit and transport and the lab home collection, so the figure the patient is shown is the one charged.
 */
const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null);

/** The home-visit fee of a doctor: their own `home_visit_fee`, else the platform's. */
export const homeVisitFee = (profile: any, platformDefault: number): number => positive(profile?.home_visit_fee) ?? platformDefault;

/** The transport surcharge of a home visit: none when the doctor said they charge none (`home_transport_fee` false), their own `home_transport_price` when set, else the platform's. */
export const transportFee = (profile: any, platformDefault: number): number => {
  if (profile?.home_transport_fee === false) return 0;
  return positive(profile?.home_transport_price) ?? platformDefault;
};

/** The home-collection fee of a lab: its own `home_collection_fee`, else the platform's. */
export const homeCollectionFee = (profile: any, platformDefault: number): number => positive(profile?.home_collection_fee) ?? platformDefault;

/** The fee lines of a consultation booking: the platform's service fee always, the home-visit and transport lines for a home visit only. */
export function consultationFees(
  profile: any,
  serviceType: string,
  platform: { service_fee: number; home_visit_fee: number; transportation_fee: number },
): { service_fee: number; home_visit_fee: number; transportation_fee: number } {
  const home = serviceType === 'home';
  return {
    service_fee: platform.service_fee,
    home_visit_fee: home ? homeVisitFee(profile, platform.home_visit_fee) : 0,
    transportation_fee: home ? transportFee(profile, platform.transportation_fee) : 0,
  };
}
