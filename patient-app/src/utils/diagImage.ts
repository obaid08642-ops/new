import { optimizedImageUri } from './optimizedImage';

/**
 * The picture of a test or scan: its OWN image (`image_url` of the lab / radiology service, the field the catalogue and the carousel
 * send) first, sized with the shared optimizer. `undefined` = no image, the caller draws the category art / glyph instead
 * (and also when the file fails to load).
 */
export function resolveDiagImage(image: string | null | undefined, widthDp: number): string | undefined {
  const url = typeof image === 'string' ? image.trim() : '';
  if (!url || !/^https:\/\//.test(url)) return undefined;
  return optimizedImageUri(url, widthDp);
}
