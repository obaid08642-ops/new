import { API_BASE_URL } from '../constants';

/**
 * 2-app#13: an image address from the API as the app can load it. The server writes a stored file as its own public route
 * (`/api/v1/care/doctors/:id/media/:mediaId`), which is relative to the API's origin; a full https address is kept.
 */
export function apiMediaUri(uri: string | null | undefined, base: string = API_BASE_URL): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith('/api/')) return `${base.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')}${uri}`;
  return /^https?:\/\//i.test(uri) ? uri : undefined;
}
