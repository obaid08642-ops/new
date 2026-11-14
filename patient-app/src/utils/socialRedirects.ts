/**
 * Snapchat Login Kit accepts HTTPS redirect URIs only, so the app cannot give it `nabdplus://`. The app sends Snapchat to an HTTPS
 * bridge page on the site, which reads `code` and `state` and hands them to `nabdplus://login/app-callback` (patient-web
 * app/[locale]/login/app-callback). The authorize request and the backend exchange both use the HTTPS address, which must be on
 * the backend's SOCIAL_REDIRECT_URIS allow-list; the in-app browser session ends when it reaches the `nabdplus://` return URL.
 */
export const SNAPCHAT_REDIRECT_URI = 'https://nabd.plus/en/login/app-callback';
export const SNAPCHAT_RETURN_URL = 'nabdplus://login/app-callback';

/** display_name for the name, external_id for the account id the backend signs in by (its /me query asks for both). */
export const SNAPCHAT_SCOPES = [
  'https://auth.snapchat.com/oauth2/api/user.display_name',
  'https://auth.snapchat.com/oauth2/api/user.external_id',
];
