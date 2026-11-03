import { APP_HEADERS, APP_ID, APP_VERSION } from './appVersion';

describe('appVersion', () => {
  it('is the version in app.json, sent with the patient app id', () => {
    const app = require('../../app.json');
    expect(APP_VERSION).toBe(app.expo.version);
    expect(APP_ID).toBe('patient');
    expect(APP_HEADERS).toEqual({ 'X-App-Id': 'patient', 'X-App-Version': app.expo.version });
    expect(APP_VERSION).toMatch(/^\d+(\.\d+){1,3}$/);
  });
});
