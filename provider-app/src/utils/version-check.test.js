const { isVersionBlocked, pickAppConfig } = require('./version-check');

describe('provider app version gate (R6-5)', () => {
  it('blocks older versions and passes equal or newer ones', () => {
    expect(isVersionBlocked('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBlocked('1.0.0', '1.0.0')).toBe(false);
    expect(isVersionBlocked('1.2.0', '1.0.9')).toBe(false);
  });

  it('fails open on missing or unparsable values', () => {
    expect(isVersionBlocked('1.0.0', undefined)).toBe(false);
    expect(isVersionBlocked('abc', '1.0.0')).toBe(false);
  });

  it('picks the provider config with maintenance defaulting to false', () => {
    expect(pickAppConfig({ app_versions: { apps: { provider: { maintenance: true } } } }, 'provider'))
      .toEqual(expect.objectContaining({ maintenance: true }));
    expect(pickAppConfig(null, 'provider')).toEqual(expect.objectContaining({ maintenance: false }));
  });
});
