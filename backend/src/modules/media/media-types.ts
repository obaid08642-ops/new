/**
 * Q98 (Round 11): the client-declared Content-Type was stored and served back,
 * so an HTML file named report.pdf came back from the bucket as text/html.
 * One table per allowed extension: the mime types a client may declare, the
 * canonical type that is stored and served, and the file's magic bytes.
 */
type Magic = (b: Buffer) => boolean;

const starts = (...bytes: number[]): Magic => (b) => b.length >= bytes.length && bytes.every((x, i) => b[i] === x);
const ascii = (s: string, at = 0): Magic => (b) => b.length >= at + s.length && b.toString('latin1', at, at + s.length) === s;
const riff = (form: string): Magic => (b) => ascii('RIFF')(b) && ascii(form, 8)(b);
const zip = starts(0x50, 0x4b, 0x03, 0x04);
const ole = starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
const mp3: Magic = (b) => ascii('ID3')(b) || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0);

interface MediaType { mimes: string[]; canonical: string; magic: Magic }

export const MEDIA_TYPES: Record<string, MediaType> = {
  jpg: { mimes: ['image/jpeg', 'image/jpg'], canonical: 'image/jpeg', magic: starts(0xff, 0xd8, 0xff) },
  jpeg: { mimes: ['image/jpeg', 'image/jpg'], canonical: 'image/jpeg', magic: starts(0xff, 0xd8, 0xff) },
  png: { mimes: ['image/png'], canonical: 'image/png', magic: starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) },
  gif: { mimes: ['image/gif'], canonical: 'image/gif', magic: ascii('GIF8') },
  webp: { mimes: ['image/webp'], canonical: 'image/webp', magic: riff('WEBP') },
  pdf: { mimes: ['application/pdf'], canonical: 'application/pdf', magic: ascii('%PDF-') },
  mp3: { mimes: ['audio/mpeg', 'audio/mp3'], canonical: 'audio/mpeg', magic: mp3 },
  m4a: { mimes: ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac'], canonical: 'audio/mp4', magic: ascii('ftyp', 4) },
  wav: { mimes: ['audio/wav', 'audio/x-wav', 'audio/wave'], canonical: 'audio/wav', magic: riff('WAVE') },
  doc: { mimes: ['application/msword'], canonical: 'application/msword', magic: ole },
  xls: { mimes: ['application/vnd.ms-excel'], canonical: 'application/vnd.ms-excel', magic: ole },
  docx: {
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    canonical: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: zip,
  },
  xlsx: {
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    canonical: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    magic: zip,
  },
};

export const extensionOf = (name: string): string => (String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '');

/**
 * Returns the canonical type to store, or the reason the file is refused:
 * unknown extension, a declared type that does not belong to it, or bytes that
 * are not that kind of file.
 */
export function verifyUpload(name: string, declaredMime: string, head: Buffer): { ok: true; mime: string } | { ok: false; reason: string } {
  const type = MEDIA_TYPES[extensionOf(name)];
  if (!type) return { ok: false, reason: 'unsupported_media_extension' };
  const declared = String(declaredMime || '').toLowerCase().split(';')[0].trim();
  if (!type.mimes.includes(declared)) return { ok: false, reason: 'mimetype_does_not_match_extension' };
  if (!type.magic(head)) return { ok: false, reason: 'file_content_does_not_match_type' };
  return { ok: true, mime: type.canonical };
}

/** Canonical type for a stored key (served on download, never the stored claim). */
export function canonicalMimeFor(name: string): string {
  return MEDIA_TYPES[extensionOf(name)]?.canonical ?? 'application/octet-stream';
}
