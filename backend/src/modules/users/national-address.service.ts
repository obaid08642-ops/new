/**
 * 19.7 — look a Saudi National Address short code up at Saudi Post (SPL).
 *   SPL_API_URL  the lookup URL with `{code}` (and optionally `{key}`) in it, e.g.
 *                https://example.spl/address-by-short-address?shortaddress={code}&api_key={key}
 *   SPL_API_KEY  the key substituted for `{key}`
 * Both are the owner's (a key from the SPL developer portal). Anything but a clear answer is `unavailable`.
 */
import { Injectable, Logger, Module } from '@nestjs/common';
import { externalFetch } from '../../common/external-call';
import { NationalAddress, normalizeShortAddress, parseNationalAddress } from '../../common/national-address';

export type NationalAddressLookup =
  | { outcome: 'found'; address: NationalAddress }
  | { outcome: 'not_found' }
  | { outcome: 'invalid' }
  | { outcome: 'unavailable' };

const LOOKUP_TIMEOUT_MS = 5000;

@Injectable()
export class NationalAddressService {
  private readonly logger = new Logger(NationalAddressService.name);

  configured(): boolean {
    return Boolean((process.env.SPL_API_URL || '').trim());
  }

  async lookup(raw: unknown): Promise<NationalAddressLookup> {
    const code = normalizeShortAddress(raw);
    if (!code) return { outcome: 'invalid' };
    const template = (process.env.SPL_API_URL || '').trim();
    if (!template) return { outcome: 'unavailable' };
    try {
      const url = template.replace('{code}', encodeURIComponent(code)).replace('{key}', encodeURIComponent(process.env.SPL_API_KEY || ''));
      const res = await externalFetch(url, { headers: { Accept: 'application/json' } }, LOOKUP_TIMEOUT_MS);
      if (res.status === 404) return { outcome: 'not_found' };
      if (!res.ok) return { outcome: 'unavailable' };
      const address = parseNationalAddress(await res.json(), code);
      return address ? { outcome: 'found', address } : { outcome: 'not_found' };
    } catch (e: any) {
      this.logger.warn(`SPL lookup failed: ${e?.message || e}`);
      return { outcome: 'unavailable' };
    }
  }
}

@Module({ providers: [NationalAddressService], exports: [NationalAddressService] })
export class NationalAddressModule {}
