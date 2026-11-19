import { SA_CONFIG_V1 } from '../modules/markets/sa-market.seed';

/**
 * The single source for values that used to be literals ('SAR', 'Asia/Riyadh', 15 %, 997, +966).
 * Today they come from the Saudi market row (`modules/markets/sa-market.seed.ts`, golden-tested against the
 * stored config). Step 3 makes callers pass a MarketContext and read `MarketsService.getConfig(market)` instead;
 * until then every market-less code path means "the platform's launch market", exactly as before.
 * Never write these literals elsewhere: `market-literals.ratchet.spec.ts` counts them and may only go down.
 */
export const DEFAULT_CURRENCY = SA_CONFIG_V1.currency.code;
export const DEFAULT_TIMEZONE = SA_CONFIG_V1.timezone;
export const DEFAULT_VAT_PERCENT_VALUE = SA_CONFIG_V1.tax.vat_percent;
export const DEFAULT_VAT_RATE = SA_CONFIG_V1.tax.vat_percent / 100;
export const DEFAULT_EMERGENCY_NUMBER = SA_CONFIG_V1.emergency_numbers.ambulance;
export const DEFAULT_PHONE_DIAL = SA_CONFIG_V1.phone.default_dial;
