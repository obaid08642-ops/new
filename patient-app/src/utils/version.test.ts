import { isVersionBlocked, pickAppConfig } from './version';

describe('app version gate (R6-5)', () => {
  it('blocks older versions and passes equal or newer ones', () => {
    expect(isVersionBlocked('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBlocked('1.0.0', '1.0.0')).toBe(false);
    expect(isVersionBlocked('1.2.0', '1.0.9')).toBe(false);
    expect(isVersionBlocked('2.0', '1.9.9')).toBe(false);
  });

  it('fails open on missing or unparsable values', () => {
    expect(isVersionBlocked('1.0.0', undefined)).toBe(false);
    expect(isVersionBlocked('1.0.0', '')).toBe(false);
    expect(isVersionBlocked('abc', '1.0.0')).toBe(false);
    expect(isVersionBlocked('1.0.0', 'latest')).toBe(false);
  });

  it('picks the per-app config with maintenance defaulting to false', () => {
    expect(pickAppConfig({ app_versions: { apps: { patient: { min_version: '1.0.1', maintenance: true } } } }, 'patient'))
      .toEqual(expect.objectContaining({ min_version: '1.0.1', maintenance: true }));
    expect(pickAppConfig(null, 'patient')).toEqual(expect.objectContaining({ maintenance: false }));
  });
});
