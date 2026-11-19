import { MarketConfig } from '../market-config.types';
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
  return { phone: buildPhonePlugin(config.phone), identity, address };
}

/** The launch market's plugins, for code paths that have no market context yet (same meaning as `common/market-defaults.ts`). */
export const SA_PLUGINS: MarketPlugins = pluginsFor(SA_MARKET_ID, SA_CONFIG_V1);
