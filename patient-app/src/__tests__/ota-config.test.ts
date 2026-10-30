/**
 * Over-the-air updates (docs/ops/OTA_UPDATES.md): an update must never reach a binary with different native code,
 * must never block launch, and each build profile must read the channel its updates are published to. The EAS project
 * id comes from the environment, so updates are off when there is none.
 */
import fs from 'fs';
import path from 'path';

const APPS = ['patient-app', 'provider-app'];
// The Expo SDK each app is on.
const EXPO_UPDATES: Record<string, RegExp> = { 'patient-app': /^~58\./, 'provider-app': /^~58\./ };
const root = path.resolve(__dirname, '../../..');
const read = (app: string, file: string) => JSON.parse(fs.readFileSync(path.join(root, app, file), 'utf8'));
const configFor = (app: string, env: Record<string, string | undefined>) => {
  const saved = process.env.EAS_PROJECT_ID;
  if (env.EAS_PROJECT_ID === undefined) delete process.env.EAS_PROJECT_ID; else process.env.EAS_PROJECT_ID = env.EAS_PROJECT_ID;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const factory = require(path.join(root, app, 'app.config.js'));
    return factory({ config: read(app, 'app.json').expo });
  } finally {
    if (saved === undefined) delete process.env.EAS_PROJECT_ID; else process.env.EAS_PROJECT_ID = saved;
  }
};

describe.each(APPS)('OTA updates: %s', (app) => {
  it('ties an update to the native code and never blocks launch', () => {
    const expo = read(app, 'app.json').expo;
    expect(expo.runtimeVersion).toEqual({ policy: 'fingerprint' });
    expect(expo.updates).toMatchObject({ checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 });
  });

  it('depends on expo-updates', () => {
    expect(read(app, 'package.json').dependencies['expo-updates']).toMatch(EXPO_UPDATES[app]);
  });

  it('maps the preview and production build profiles to their channels', () => {
    const build = read(app, 'eas.json').build;
    expect(build.preview.channel).toBe('preview');
    expect(build.production.channel).toBe('production');
  });

  it('points at the owner\'s EAS project from the environment, and is off without one', () => {
    const on = configFor(app, { EAS_PROJECT_ID: 'abc-123' });
    expect(on.updates.url).toBe('https://u.expo.dev/abc-123');
    expect(on.extra.eas.projectId).toBe('abc-123');
    expect(on.updates.enabled).not.toBe(false);
    const off = configFor(app, { EAS_PROJECT_ID: undefined });
    expect(off.updates.enabled).toBe(false);
    expect(off.updates.url).toBeUndefined();
  });
});
