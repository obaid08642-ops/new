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
