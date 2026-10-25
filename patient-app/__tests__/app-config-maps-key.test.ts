import appConfig from '../app.config';
import { mapIsAvailable, mapsUrl } from '../src/utils/mapAvailability';

const base = { name: 'x', slug: 'x', android: { package: 'com.patient.nabd' } } as never;

describe('Android Google Maps key comes from the build environment only', () => {
  const saved = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  afterEach(() => { if (saved === undefined) delete process.env.GOOGLE_MAPS_ANDROID_API_KEY; else process.env.GOOGLE_MAPS_ANDROID_API_KEY = saved; });

  it('writes the key into android.config.googleMaps when the secret is set', () => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = ' test-key ';
    const out = appConfig({ config: base } as never) as { android: { package: string; config: { googleMaps: { apiKey: string } } } };
    expect(out.android.config.googleMaps.apiKey).toBe('test-key');
    expect(out.android.package).toBe('com.patient.nabd');
  });
  it('writes nothing without the secret (and the app then mounts no native map)', () => {
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    const out = appConfig({ config: base } as never) as { android: { config?: unknown } };
    expect(out.android.config).toBeUndefined();
  });
});

describe('mapIsAvailable', () => {
  it('iOS always (Apple Maps); Android only with a key', () => {
    expect(mapIsAvailable('ios', undefined)).toBe(true);
    expect(mapIsAvailable('android', undefined)).toBe(false);
    expect(mapIsAvailable('android', '   ')).toBe(false);
    expect(mapIsAvailable('android', 'AIza-test')).toBe(true);
  });
  it('"open in Maps" is a geo: intent on Android and Apple Maps on iOS', () => {
    expect(mapsUrl(24.7, 46.6, 'Clinic A', 'android')).toBe('geo:0,0?q=24.7,46.6(Clinic%20A)');
    expect(mapsUrl(24.7, 46.6, 'Clinic A', 'ios')).toBe('maps:0,0?q=Clinic%20A@24.7,46.6');
  });
});
