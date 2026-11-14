/** R12: the one place that knows which app and build this is. The version comes from app.json (what the store build is stamped with), not from a constant someone must remember to bump. */
export const APP_ID = 'patient';

export const APP_VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../app.json')?.expo?.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();

/** Sent with every API request so the server can enforce the admin-set minimum version (HTTP 426) and count traffic per build. */
export const APP_HEADERS: Record<string, string> = { 'X-App-Id': APP_ID, 'X-App-Version': APP_VERSION };
