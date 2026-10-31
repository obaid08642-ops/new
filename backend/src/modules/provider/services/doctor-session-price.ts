/**
 * The doctor-session capability (`provider_capabilities_doctor_sessions`) is where a doctor enters a price per consultation type,
 * but a consultation is booked and listed from the profile's `price_clinic` / `price_online` / `price_home`. When the admin
 * approves a session row, its price is projected onto the profile field of the booked service type, so the price the doctor
 * saved is the price the patient is shown and charged. `voice` and `chat` have no booked service type here and project nothing.
 */
const PROFILE_PRICE_FIELD: Record<string, 'price_clinic' | 'price_online' | 'price_home'> = {
  clinic: 'price_clinic',
  video: 'price_online',
  home: 'price_home',
};

export function doctorSessionPriceProjection(payload: any): { field: 'price_clinic' | 'price_online' | 'price_home'; price: number } | null {
  const field = PROFILE_PRICE_FIELD[String(payload?.consultation_type || '')];
  const price = Number(payload?.price);
  if (!field || payload?.available === false || !Number.isFinite(price) || price <= 0) return null;
  return { field, price: Math.round(price * 100) / 100 };
}

/**
 * The doctor's pricing settings (`settings_key: 'pricing'`: price_clinic / price_online / price_home and their active flags)
 * are shown back to the doctor from `provider_settings`, but a consultation is booked from the profile's price fields. On
 * approval the same values are written to the profile, so one request and one review set the booked price. A price that is
 * switched off or cleared becomes null (the booking then refuses the service type: no price configured). Other settings
 * payloads (pharmacy, lab, nursing keep their own price fields) project nothing.
 */
export function doctorPricingProjection(value: any): Record<string, number | boolean | null> | null {
  if (!value || typeof value !== 'object') return null;
  const out: Record<string, number | boolean | null> = {};
  for (const [field, active] of [['price_clinic', 'active_clinic'], ['price_online', 'active_online'], ['price_home', 'active_home']] as const) {
    if (!(field in value)) continue;
    const price = value[field] === null || value[field] === '' ? null : Number(value[field]);
    if (price !== null && !(Number.isFinite(price) && price > 0)) continue;
    const off = active in value && value[active] === false;
    out[field] = off ? null : price === null ? null : Math.round(price * 100) / 100;
    if (active in value) out[active] = value[active] === true;
  }
  return Object.keys(out).length ? out : null;
}
