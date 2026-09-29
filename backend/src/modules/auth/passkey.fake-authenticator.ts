import { createHash, generateKeyPairSync, sign } from 'crypto';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

/**
 * A minimal but REAL WebAuthn platform authenticator, used only by tests.
 *
 * It performs the same cryptographic operations a Touch ID / Face ID
 * authenticator performs: it holds a P-256 key pair, exposes the public key as
 * a COSE_Key, builds authenticator data (rpIdHash || flags || counter) and
 * signs `authenticatorData || SHA-256(clientDataJSON)` with ECDSA P-256/SHA-256.
 *
 * Nothing here is a stub of the library: the bytes handed to
 * `verifyAuthenticationResponse()` are byte-for-byte what a browser would send,
 * so a passing assertion proves the server's verification path really works.
 */

export const FLAG_UP = 0x01; // user present
export const FLAG_UV = 0x04; // user verified (Touch ID / Face ID)
export const FLAG_BE = 0x08; // backup eligible
export const FLAG_BS = 0x10; // backup state
export const FLAG_AT = 0x40; // attested credential data included

const b64url = (buf: Buffer | Uint8Array): string => Buffer.from(buf).toString('base64url');

/** COSE_Key for ES256: {1:2 (EC2), 3:-7 (ES256), -1:1 (P-256), -2:x, -3:y} */
export function coseKeyFromPublicKey(publicKey: import('crypto').KeyObject): Buffer {
  // Uncompressed EC point: 0x04 || X(32) || Y(32)
  const jwk = publicKey.export({ format: 'jwk' }) as any;
  const x = Buffer.from(jwk.x, 'base64url');
  const y = Buffer.from(jwk.y, 'base64url');
  return Buffer.concat([
    Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
    x,
    Buffer.from([0x22, 0x58, 0x20]),
    y,
  ]);
}

export type FakeAuthenticator = {
  credentialId: string;
  privateKey: import('crypto').KeyObject;
  cosePublicKey: Buffer;
  /** Synced passkeys (iCloud Keychain, Google Password Manager) always report 0. */
  counter: number;
  assertion: (opts: {
    challenge: string;
    origin: string;
    rpId: string;
    userHandle: string;
    uv?: boolean;
  }) => AuthenticationResponseJSON;
};

export function createFakeAuthenticator(opts?: { credentialId?: string; synced?: boolean }): FakeAuthenticator {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const credentialId = opts?.credentialId || b64url(Buffer.concat([privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(0, 16)]));
  const auth: FakeAuthenticator = {
    credentialId,
    privateKey,
    cosePublicKey: coseKeyFromPublicKey(publicKey),
    counter: opts?.synced ? 0 : 1,
    assertion({ challenge, origin, rpId, userHandle, uv = true }) {
      const rpIdHash = createHash('sha256').update(rpId).digest();
      const flags = FLAG_UP | FLAG_UV | FLAG_BE | FLAG_BS | (uv ? 0 : 0);
      const counterBuf = Buffer.alloc(4);
      counterBuf.writeUInt32BE(auth.counter, 0);
      const authenticatorData = Buffer.concat([rpIdHash, Buffer.from([flags]), counterBuf]);

      const clientDataJSON = Buffer.from(
        JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false }),
        'utf8',
      );
      const clientDataHash = createHash('sha256').update(clientDataJSON).digest();
      const signature = sign('sha256', Buffer.concat([authenticatorData, clientDataHash]), privateKey);

      return {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        clientExtensionResults: {},
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: b64url(clientDataJSON),
          authenticatorData: b64url(authenticatorData),
          signature: b64url(signature),
          userHandle: b64url(Buffer.from(userHandle, 'utf8')),
        },
      } as AuthenticationResponseJSON;
    },
  };
  return auth;
}

/** The bytes a browser would store server-side for this authenticator. */
export function storedCredential(auth: FakeAuthenticator, userId: string) {
  return {
    user_id: userId,
    credential_id: auth.credentialId,
    public_key: auth.cosePublicKey,
    counter: auth.counter,
    transports: ['internal', 'hybrid'],
    device_name: 'MacBook Pro (Touch ID)',
  };
}
