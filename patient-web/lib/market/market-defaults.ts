import { z } from "zod";

/** What the backend's GET /config/market answers (the client view of the server-resolved market). */
const schema = z.object({
  market_id: z.string().min(2),
  country: z.string().min(2),
  config_version: z.number(),
  currency: z.object({ code: z.string().regex(/^[A-Z]{3}$/), exponent: z.number().int().min(0).max(4) }),
  timezone: z.string().min(1),
  locales: z.object({ default: z.string(), enabled: z.array(z.string()) }),
  weekend: z.array(z.string()),
  phone: z.object({ default_dial: z.string(), national_number_pattern: z.string(), trunk_prefix: z.string(), national_length: z.number() }),
  emergency_numbers: z.object({ ambulance: z.string() }),
  address_template: z.object({ id: z.string(), fields: z.array(z.object({ key: z.string(), required: z.boolean(), pattern: z.string().optional() })), verification: z.string().nullable() }),
  operated_by: z.string().nullable(),
});
export type MarketClientConfig = z.infer<typeof schema>;

/**
 * The launch market, used when the backend cannot answer (the same behaviour the site always had: no outage turns a page into an error because of a time zone).
 * `market-config.test.ts` pins every value against what the Saudi site hard-wired before this file existed.
 */
export const SA_MARKET_DEFAULTS: MarketClientConfig = {
  market_id: "SA",
  country: "SA",
  config_version: 1,
  currency: { code: "SAR", exponent: 2 },
  timezone: "Asia/Riyadh",
  locales: { default: "ar", enabled: ["ar", "en", "ur", "hi", "bn", "fil"] },
  weekend: ["friday", "saturday"],
  phone: { default_dial: "+966", national_number_pattern: "^5\\d{8}$", trunk_prefix: "0", national_length: 9 },
  emergency_numbers: { ambulance: "997" },
  address_template: {
    id: "sa-short-address",
    fields: [
      { key: "short_address", required: false, pattern: "^[A-Za-z]{4}\\d{4}$" },
      { key: "city", required: true },
      { key: "district", required: true },
      { key: "street", required: true },
      { key: "building_number", required: false },
      { key: "postal_code", required: false },
      { key: "landmark", required: false },
    ],
    verification: "sa-national-address",
  },
  operated_by: null,
};

export function parseMarketConfig(raw: unknown): MarketClientConfig | null {
  const r = schema.safeParse(raw);
  return r.success ? r.data : null;
}

/** The calendar day (YYYY-MM-DD) of an instant in the market's own time zone. */
export function marketDay(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** The hour 0-23 of an instant in the market's own time zone. */
export function marketHour(timeZone: string, at: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(at));
}
