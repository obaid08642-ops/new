import { readFileSync } from 'fs';
import { join } from 'path';
import { BH_ADDRESS_TEMPLATE, BH_CONFIG_V1, BH_LICENCE_TYPES, BH_MARKET, BH_ONBOARDING, BH_OPERATOR, bhIdentityPlugin, registerBhInternalTest } from './bh-internal-test';
import { marketClientConfig } from '../market-client-config';
import { currentIdentityPlugin, currentPhoneConfig, currentPhonePlugin, pluginsFor, PluginNotFoundError } from '../plugins/registry';
import { runWithMarketContext, MarketContext } from '../market-context';
import { licenceExpiryState, licenceTypesFor } from '../licences/licence-types';
import { onboardingFieldSet } from '../licences/onboarding-field-sets';
import { validateMarketConfig, CURRENCY_EXPONENTS } from '../market-config.validate';
import { MarketsService } from '../markets.service';
import { AuthService } from '../../auth/auth.service';
import { OtpAbuseGuard } from '../../../common/otp-abuse.service';
import { SA_CONFIG_V1 } from '../sa-market.seed';

registerBhInternalTest();

/** Nothing Saudi may be reachable for the BH test market: neither in its data, nor in what its code paths return. */
const SAUDI = /SAR|riyadh|\+966|966|\b997\b|scfhs|\bmoh\b|sfda|zatca|nafath|iqama|saudi|ksa|\bsa-|ر\.س|halala|\bSA\b/i;

const bh: MarketContext = { market_id: 'BH', country: 'BH', operator_id: BH_OPERATOR.id, currency: 'BHD', timezone: 'Asia/Bahrain', config_version: 1, source: 'header', config: BH_CONFIG_V1 };
const types = ['doctor', 'pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'home_care', 'nursing'];

describe('BH internal test market is a valid, non-Saudi, 3-decimal market made of data only', () => {
  it('is internal_test, never live, and its config is valid with fils (exponent 3)', () => {
    expect(BH_MARKET.status).toBe('internal_test');
    expect(validateMarketConfig(BH_CONFIG_V1)).toEqual([]);
    expect(BH_CONFIG_V1.currency).toEqual({ code: 'BHD', exponent: 3 });
    expect(CURRENCY_EXPONENTS.BHD).toBe(3);
  });

  it('LINT: no Saudi literal in any data reachable for BH (config, client view, plugins, address, licences, onboarding, operator)', () => {
    const reachable = {
      config: BH_CONFIG_V1,
      market: BH_MARKET,
      operator: BH_OPERATOR,
      client: marketClientConfig(bh),
      address: BH_ADDRESS_TEMPLATE,
      licences: types.map((t) => licenceTypesFor('BH', t)),
      onboarding: types.map((t) => onboardingFieldSet('BH', t)),
      pluginIds: [pluginsFor('BH', BH_CONFIG_V1).identity.type_id, pluginsFor('BH', BH_CONFIG_V1).address.id],
    };
    const json = JSON.stringify(reachable);
    const hit = json.match(SAUDI);
    expect(hit && `Saudi literal reachable for BH: ${hit[0]}`).toBeNull();
  });

  it('LINT: the BH source file itself holds no Saudi literal', () => {
    const src = readFileSync(join(__dirname, 'bh-internal-test.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); // the header comment names Saudi on purpose
    const hit = src.match(SAUDI);
    expect(hit && `Saudi literal in bh-internal-test.ts: ${hit[0]}`).toBeNull();
  });

  it('every provider type has an onboarding set and licence types; none is the SA one', () => {
    for (const t of types) {
      expect(onboardingFieldSet('BH', t)).not.toBeNull();
      expect(licenceTypesFor('BH', t).length).toBeGreaterThan(0);
      expect(licenceTypesFor('BH', t).every((l) => l.jurisdiction === 'BH')).toBe(true);
    }
    expect(BH_ONBOARDING).toHaveLength(8);
    expect(BH_LICENCE_TYPES.every((l) => l.id.startsWith('bh-test-'))).toBe(true);
  });
});

describe('BH code paths never fall back to Saudi behaviour', () => {
  it('phone: BH numbers canonicalise to +973; Saudi-looking input is NOT turned into +966', () => {
    runWithMarketContext(bh, () => {
      expect(currentPhoneConfig().default_dial).toBe('+973');
      expect(AuthService.normalizePhone('36123456')).toBe('+97336123456');
      expect(AuthService.normalizePhone('+973 3612 3456')).toBe('+97336123456');
      expect(AuthService.normalizePhone('97336123456')).toBe('+97336123456');
      expect(AuthService.normalizePhone('0501234567')).toBe('0501234567'); // Saudi trunk form: unchanged, not +966
      expect(AuthService.normalizePhone('501234567')).toBe('501234567');
      expect(currentPhonePlugin().canonicalise('00973 36123456')).toBe('+97336123456');
    });
  });
  it('SA phone behaviour is unchanged outside a BH request', () => {
    expect(AuthService.normalizePhone('0501234567')).toBe('+966501234567');
    runWithMarketContext({ ...bh, market_id: 'SA', country: 'SA', config: SA_CONFIG_V1 }, () => expect(AuthService.normalizePhone('0501234567')).toBe('+966501234567'));
  });
  it('OTP abuse guard: a BH number stays +973 and a Saudi trunk-zero number is not mapped to +966', () => {
    const svc = new OtpAbuseGuard({} as never);
    runWithMarketContext(bh, () => {
      expect(svc.toE164('0097336123456')).toBe('+97336123456');
      expect(svc.toE164('+97336123456')).toBe('+97336123456');
      expect(String(svc.toE164('0501234567'))).not.toMatch(/^\+966/); // null here: a Saudi trunk-zero number is not a Bahrain number
    });
  });
  it('identity: BH uses its own personal-number rule; a Saudi national ID shape is rejected', () => {
    runWithMarketContext(bh, () => {
      expect(currentIdentityPlugin().type_id).toBe('bh-test-personal-number');
      expect(currentIdentityPlugin().normalise('123456789')).toBe('123456789');
      expect(currentIdentityPlugin().normalise('1089582300')).toBeNull(); // 10 digits (SA shape)
    });
  });
  it('a market with no registered identity plugin throws instead of using the Saudi rule', () => {
    runWithMarketContext({ ...bh, market_id: 'QQ' }, () => expect(() => currentIdentityPlugin()).toThrow(PluginNotFoundError));
  });
  it('a non-SA market with a phone config missing national_length is refused, never defaulted to Saudi values', () => {
    const broken = { ...BH_CONFIG_V1, phone: { default_dial: '+973', national_number_pattern: '^3\\d{7}$', trunk_prefix: '' } } as never;
    runWithMarketContext({ ...bh, config: broken }, () => expect(() => currentPhoneConfig()).toThrow('market_phone_config_invalid:BH'));
  });
  it('an older stored SA config (no national_length) still gives the Saudi phone rules', () => {
    const stored = { ...SA_CONFIG_V1, phone: { default_dial: '+966', national_number_pattern: '^5\\d{8}$', trunk_prefix: '0' } } as never;
    runWithMarketContext({ ...bh, market_id: 'SA', country: 'SA', config: stored }, () => expect(AuthService.normalizePhone('0501234567')).toBe('+966501234567'));
  });
  it('licence expiry runs on the Bahrain calendar day', () => {
    expect(licenceExpiryState('2026-12-01', new Date('2026-12-01T20:59:59Z'), BH_CONFIG_V1.timezone).state).toBe('valid');
    expect(licenceExpiryState('2026-12-01', new Date('2026-12-01T21:00:00Z'), BH_CONFIG_V1.timezone).state).toBe('expired');
  });
});

describe('seeding the internal test market', () => {
  const make = () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const m = (name: string) => ({ updateOne: jest.fn(async (_f: unknown, u: Record<string, unknown>) => { calls.push([name, u]); }) });
    return { svc: new MarketsService(m('markets') as never, m('operators') as never, m('configs') as never), calls };
  };
  it('writes BH with $setOnInsert only and status internal_test', async () => {
    const { svc, calls } = make();
    await svc.seedInternalTestMarkets();
    expect(calls.map((c) => c[0]).sort()).toEqual(['configs', 'markets', 'operators']);
    for (const [, u] of calls) expect(Object.keys(u)).toEqual(['$setOnInsert']);
    expect((calls.find((c) => c[0] === 'markets')![1].$setOnInsert as { status: string }).status).toBe('internal_test');
  });
  it('is NOT seeded at module init unless MARKETS_INTERNAL_TEST=yes (production never serves BH)', async () => {
    const { svc, calls } = make();
    const prev = process.env.MARKETS_INTERNAL_TEST;
    delete process.env.MARKETS_INTERNAL_TEST;
    await svc.onModuleInit();
    expect(calls.some((c) => JSON.stringify(c[1]).includes('"BH"'))).toBe(false);
    process.env.MARKETS_INTERNAL_TEST = 'yes';
    await svc.onModuleInit();
    expect(calls.some((c) => JSON.stringify(c[1]).includes('"BH"'))).toBe(true);
    if (prev === undefined) delete process.env.MARKETS_INTERNAL_TEST; else process.env.MARKETS_INTERNAL_TEST = prev;
  });
  it('an unseeded BH is not found (no fallback to SA)', async () => {
    const svc = new MarketsService({ findOne: () => ({ lean: async () => null }) } as never, {} as never, {} as never);
    await expect(svc.getMarket('BH')).rejects.toThrow('market_not_found');
  });
});
