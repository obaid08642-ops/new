import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

/**
 * The tones the offer screens draw, looked up from the handoff service map (§1) and never written as colour names:
 * pharmacy (the storefront and the conversation tiles), "good" (all items available, an open conversation), "warn"
 * (items missing), "info" (insurance), "cod" (cash on delivery).
 */
export const OFFER_TONES = {
  pharmacy: SERVICE_ICONS.pharmacy.tone,
  good: SERVICE_ICONS.lab.tone,
  warn: SERVICE_ICONS.map.tone,
  info: SERVICE_ICONS.insurance.tone,
  cod: SERVICE_ICONS.nursing.tone,
} as const;
