/**
 * The bytes of a stored passkey public key. The schema stores a Buffer, but a
 * `.lean()` read returns a BSON Binary, and `new Uint8Array(binary)` is empty,
 * so the WebAuthn verifier got no key at all. Accept every shape Mongo hands back.
 */
export function passkeyPublicKeyBytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  const inner = (value as { buffer?: unknown } | null | undefined)?.buffer;
  if (inner instanceof Uint8Array) return new Uint8Array(inner);
  return new Uint8Array(0);
}
