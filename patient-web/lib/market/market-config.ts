import { patientApiUrl } from "@/lib/api/upstream";
import { publicReadSignal } from "@/lib/api/public-timeout";
import { parseMarketConfig, SA_MARKET_DEFAULTS, type MarketClientConfig } from "@/lib/market/market-defaults";

export type { MarketClientConfig };

/**
 * Server-side read of the market for this site (no X-Market hint yet: the backend answers its launch market). Goes through the Next data cache for 60 s; any failure,
 * a non-2xx answer or a malformed body returns the launch-market defaults, so rendering never depends on this call.
 */
export async function getMarketConfig(): Promise<MarketClientConfig> {
  try {
    const res = await fetch(patientApiUrl("/config/market"), { headers: { Accept: "application/json" }, next: { revalidate: 60 }, signal: publicReadSignal() });
    if (!res.ok) return SA_MARKET_DEFAULTS;
    return parseMarketConfig(await res.json().catch(() => null)) ?? SA_MARKET_DEFAULTS;
  } catch {
    return SA_MARKET_DEFAULTS;
  }
}
