/** The seller, VAT number, time, total and VAT inside a ZATCA phase-1 QR (base64 of tags 1 to 5, each tag-length-value in UTF-8). */
export type ZatcaPayload = { seller: string; vatNumber: string; issuedAt: string; total: number; vat: number };

const TAGS = { seller: 1, vatNumber: 2, issuedAt: 3, total: 4, vat: 5 } as const;

/** Decodes the TLV text the backend returns as `qr_base64`; null when it is not a well-formed phase-1 payload (the receipt then shows no seller block). */
export function decodeZatcaTlv(base64: unknown): ZatcaPayload | null {
  if (typeof base64 !== "string" || base64.trim() === "") return null;
  let bytes: Uint8Array;
  try {
    const binary = atob(base64.trim());
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  const values = new Map<number, string>();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let at = 0;
  while (at < bytes.length) {
    const tag = bytes[at];
    const length = bytes[at + 1];
    if (length === undefined || at + 2 + length > bytes.length) return null;
    try {
      values.set(tag, decoder.decode(bytes.slice(at + 2, at + 2 + length)));
    } catch {
      return null;
    }
    at += 2 + length;
  }
  const total = Number(values.get(TAGS.total));
  const vat = Number(values.get(TAGS.vat));
  const seller = values.get(TAGS.seller);
  const vatNumber = values.get(TAGS.vatNumber);
  const issuedAt = values.get(TAGS.issuedAt);
  if (!seller || !vatNumber || !issuedAt || !Number.isFinite(total) || !Number.isFinite(vat)) return null;
  return { seller, vatNumber, issuedAt, total, vat };
}
