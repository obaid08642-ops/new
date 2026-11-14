// R12: the app id and the build version sent with every API request (the version is the one in app.json, the store build's stamp).
export const APP_ID = 'provider';

export const APP_VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../app.json')?.expo?.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();
