import { MODULE_KEYS, MODULE_ROUTES, isRouteHidden, moduleDisabledKey, moduleForRoute, parseDisabled, visibleItems } from './moduleSwitches';

describe('module switches table', () => {
  it('knows every backend key and gives each at least one route', () => {
    expect(MODULE_KEYS).toHaveLength(12);
    for (const key of MODULE_KEYS) expect(MODULE_ROUTES[key].length).toBeGreaterThan(0);
  });

  it('only an explicit false switches a module off; unknown keys and bad payloads are ignored', () => {
    expect([...parseDisabled({ modules: { loyalty: false, ai: true, pharmacy: 0, future_thing: false } })]).toEqual(['loyalty']);
    expect(parseDisabled(null).size).toBe(0);
    expect(parseDisabled({}).size).toBe(0);
    expect(parseDisabled({ modules: [false] }).size).toBe(0);
    expect(parseDisabled('x').size).toBe(0);
  });

  it('maps routes (with or without the tabs group, with a query) to their module', () => {
    expect(moduleForRoute('/(tabs)/pharmacy')).toBe('pharmacy');
    expect(moduleForRoute('/pharmacy/product-detail')).toBe('pharmacy');
    expect(moduleForRoute('/(tabs)/consultations')).toBe('consultations');
    expect(moduleForRoute('/consultations/appointments')).toBe('consultations');
    expect(moduleForRoute('/search?view=doctors&specialty=dentistry')).toBe('consultations');
    expect(moduleForRoute('/(tabs)/diagnostics')).toBe('labs_radiology');
    expect(moduleForRoute('/diagnostics/packages')).toBe('labs_radiology');
    expect(moduleForRoute('/ai?mode=symptoms')).toBe('ai');
    expect(moduleForRoute('/ai-assistant')).toBe('ai');
    expect(moduleForRoute('/health/family-hub')).toBe('family');
    expect(moduleForRoute('/profile/insurance')).toBe('insurance');
    expect(moduleForRoute('/loyalty/hub')).toBe('loyalty');
  });

  it('does not match look-alike prefixes or ungoverned routes', () => {
    expect(moduleForRoute('/aid')).toBeNull();
    expect(moduleForRoute('/pharmacyx')).toBeNull();
    expect(moduleForRoute('/search')).toBeNull();
    expect(moduleForRoute('/search?view=pharmacy')).toBeNull();
    expect(moduleForRoute('/emergency')).toBeNull();
    expect(moduleForRoute('/map')).toBeNull();
    expect(moduleForRoute('/(tabs)/health')).toBeNull();
    expect(moduleForRoute('/(tabs)')).toBeNull();
    expect(moduleForRoute(undefined)).toBeNull();
  });

  it('hides only the entry points of switched-off modules', () => {
    const off = parseDisabled({ modules: { loyalty: false, nursing: false } });
    expect(isRouteHidden('/loyalty/hub', off)).toBe(true);
    expect(isRouteHidden('/(tabs)/nursing', off)).toBe(true);
    expect(isRouteHidden('/(tabs)/pharmacy', off)).toBe(false);
    const items = [{ r: '/(tabs)/pharmacy' }, { r: '/(tabs)/nursing' }, { r: '/map' }];
    expect(visibleItems(items, (i) => i.r, off).map((i) => i.r)).toEqual(['/(tabs)/pharmacy', '/map']);
    expect(visibleItems(items, (i) => i.r, parseDisabled(null))).toHaveLength(3);
  });

  it('reads the backend refusal module_disabled:<key> out of an apiFetch error', () => {
    expect(moduleDisabledKey(new Error('AUTH_ERROR_403: module_disabled:loyalty'))).toBe('loyalty');
    expect(moduleDisabledKey(new Error('module_disabled:brand_new'))).toBe('unknown');
    expect(moduleDisabledKey(new Error('AUTH_ERROR_403: Insufficient permissions'))).toBeNull();
    expect(moduleDisabledKey(undefined)).toBeNull();
  });
});
