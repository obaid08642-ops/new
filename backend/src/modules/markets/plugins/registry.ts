import { MarketConfig, PhoneConfig } from '../market-config.types';
import { currentMarketContext } from '../market-context';
import { SA_CONFIG_V1, SA_MARKET_ID } from '../sa-market.seed';
import { buildPhonePlugin, PhonePlugin } from './phone.plugin';
import { IdentityPlugin, saIdentityPlugin } from './identity.plugin';
import { AddressTemplate, SA_ADDRESS_TEMPLATE } from './address-template';

export interface MarketPlugins { phone: PhonePlugin; identity: IdentityPlugin; address: AddressTemplate }

export class PluginNotFoundError extends Error {
  constructor(market: string, kind: string) { super(`plugin_not_found:${market}:${kind}`); this.name = 'PluginNotFoundError'; }
}

const identities = new Map<string, IdentityPlugin>([[SA_MARKET_ID, saIdentityPlugin]]);
const addresses = new Map<string, AddressTemplate>([[SA_MARKET_ID, SA_ADDRESS_TEMPLATE]]);

/** Adding a market = registering its identity plugin and address template (data) next to its config. No Saudi fallback: an unknown market throws. */
export function registerIdentityPlugin(market: string, p: IdentityPlugin): void { identities.set(market, p); }
export function registerAddressTemplate(market: string, t: AddressTemplate): void { addresses.set(market, t); }

export function pluginsFor(market: string, config: MarketConfig): MarketPlugins {
  const identity = identities.get(market); if (!identity) throw new PluginNotFoundError(market, 'identity');
  const address = addresses.get(market); if (!address) throw new PluginNotFoundError(market, 'address');
  return { phone: buildPhonePlugin(phoneConfigFor(market, config.phone)), identity, address };
}

/** The launch market's plugins, for code paths that have no market context yet (same meaning as `common/market-defaults.ts`). */
export const SA_PLUGINS: MarketPlugins = pluginsFor(SA_MARKET_ID, SA_CONFIG_V1);

/**
 * The stored SA config v1 predates `phone.national_length`. For SA only, a missing field is filled from the seed so Saudi phone handling cannot change because of an older
 * stored row (publish SA v2 to retire this). Any other market with an incomplete phone config is refused, never defaulted to Saudi values.
 */
export function phoneConfigFor(market: string, cfg: PhoneConfig): PhoneConfig {
  if (Number.isInteger(cfg?.national_length)) return cfg;
  if (market === SA_MARKET_ID) return { ...SA_CONFIG_V1.phone, ...cfg, national_length: SA_CONFIG_V1.phone.national_length };
  throw new Error(`market_phone_config_invalid:${market}`);
}

/** The phone config of the request's market (SA outside a request, and for an older stored SA row). */
export function currentPhoneConfig(): PhoneConfig {
  const ctx = currentMarketContext();
  return ctx ? phoneConfigFor(ctx.market_id, ctx.config.phone) : SA_CONFIG_V1.phone;
}

const phoneCache = new Map<string, PhonePlugin>();
/** The phone plugin of the request's market (SA outside a request): what `AuthService.normalizePhone` uses. Cached per market + config version. */
export function currentPhonePlugin(): PhonePlugin {
  const ctx = currentMarketContext();
  if (!ctx) return SA_PLUGINS.phone;
  const key = `${ctx.market_id}:${ctx.config_version}`;
  let p = phoneCache.get(key);
  if (!p) { p = buildPhonePlugin(phoneConfigFor(ctx.market_id, ctx.config.phone)); phoneCache.set(key, p); }
  return p;
}

/** The identity plugin of the request's market (SA outside a request). An unregistered market throws: never a Saudi rule for another market. */
export function currentIdentityPlugin(): IdentityPlugin {
  const ctx = currentMarketContext();
  if (!ctx) return SA_PLUGINS.identity;
  const p = identities.get(ctx.market_id);
  if (!p) throw new PluginNotFoundError(ctx.market_id, 'identity');
  return p;
}
