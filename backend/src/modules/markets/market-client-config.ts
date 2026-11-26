import { MarketContext } from './market-context';
import { AddressTemplate } from './plugins/address-template';
import { pluginsFor } from './plugins/registry';

/** What a client may know about its market. A subset of MarketConfig: no tax scheme, gateway or internal ids. */
export interface MarketClientConfig {
  market_id: string;
  country: string;
  config_version: number;
  currency: { code: string; exponent: number };
  timezone: string;
  locales: { default: string; enabled: string[] };
  weekend: string[];
  phone: { default_dial: string; national_number_pattern: string; trunk_prefix: string; national_length: number };
  emergency_numbers: { ambulance: string };
  address_template: AddressTemplate;
  /** Text for "operated by <name>"; null = no partner line. The logo and identity never vary. */
  operated_by: string | null;
}

/** Pure: the client view of a resolved MarketContext. */
export function marketClientConfig(ctx: MarketContext): MarketClientConfig {
  const c = ctx.config;
  return {
    market_id: ctx.market_id,
    country: ctx.country,
    config_version: ctx.config_version,
    currency: { code: c.currency.code, exponent: c.currency.exponent },
    timezone: c.timezone,
    locales: { default: c.locales.default, enabled: [...c.locales.enabled] },
    weekend: [...c.calendar.weekend],
    phone: { default_dial: c.phone.default_dial, national_number_pattern: c.phone.national_number_pattern, trunk_prefix: c.phone.trunk_prefix, national_length: c.phone.national_length },
    emergency_numbers: { ...c.emergency_numbers },
    address_template: pluginsFor(ctx.market_id, c).address,
    operated_by: c.branding.operated_by,
  };
}
