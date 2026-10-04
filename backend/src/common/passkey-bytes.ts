/**
 * The bytes of a stored passkey public key. The schema stores a Buffer, but a
 * `.lean()` read returns a BSON Binary, and `new Uint8Array(binary)` is empty,
 * so the WebAuthn verifier got no key at all. Accept every shape Mongo hands back.
 */
export function passkeyPublicKeyBytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  // BSON Binary: `buffer` may have spare capacity; `position` is the length written.
  const bin = value as { buffer?: unknown; position?: unknown } | null | undefined;
  const inner = bin?.buffer;
  if (inner instanceof Uint8Array) {
    const len = typeof bin?.position === 'number' ? Math.min(bin.position, inner.length) : inner.length;
    return new Uint8Array(inner.subarray(0, len));
  }
  return new Uint8Array(0);
}
