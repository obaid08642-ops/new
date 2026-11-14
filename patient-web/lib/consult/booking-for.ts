/** Who the next consultation booking is for (the app keeps this in memory; the web keeps the opaque member reference in a short cookie). */
export const BOOKING_FOR_COOKIE = "nabd_booking_for";
export const BOOKING_FOR_MAX_AGE = 60 * 60;
export const isMemberRef = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
