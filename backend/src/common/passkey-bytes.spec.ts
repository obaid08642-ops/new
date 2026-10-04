// A passkey's public key is stored as a Buffer; read back with .lean() it is
// a BSON Binary, and `new Uint8Array(binary)` is EMPTY (0 bytes), so every
// passkey login and step-up assertion failed with "No data" (seen live).
jest.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: jest.fn(async () => ({ verified: true, authenticationInfo: { newCounter: 1 } })),
}));
import { mongo } from 'mongoose';
import { passkeyPublicKeyBytes } from './passkey-bytes';
import { StepUpService } from './step-up.guard';
import { RedisService } from '../modules/redis/redis.service';

function memoryStore(): RedisService {
  const m = new Map<string, string>();
  return {
    set: async (k: string, v: string) => { m.set(k, v); },
    take: async (k: string) => { const v = m.get(k) ?? null; m.delete(k); return v; },
  } as unknown as RedisService;
}

describe('stored passkey public key bytes', () => {
  const raw = Buffer.from(Array.from({ length: 77 }, (_, i) => i));

  it('reads a BSON Binary, a Buffer and a Uint8Array to the same bytes', () => {
    expect(Array.from(passkeyPublicKeyBytes(new mongo.Binary(raw)))).toEqual(Array.from(raw));
    expect(Array.from(passkeyPublicKeyBytes(raw))).toEqual(Array.from(raw));
    expect(Array.from(passkeyPublicKeyBytes(new Uint8Array(raw)))).toEqual(Array.from(raw));
  });

  it('a Binary with spare capacity yields only its written bytes', () => {
    const grown = new mongo.Binary();
    grown.write(raw, 0);
    expect(Array.from(passkeyPublicKeyBytes(grown))).toEqual(Array.from(raw));
  });

  it('step-up verifies with the real key bytes from a lean (Binary) credential', async () => {
    const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
    const cred = { user_id: 'adm', credential_id: 'c1', public_key: new mongo.Binary(raw), counter: 0, transports: [] };
    const model = { findOne: jest.fn(() => ({ lean: async () => cred })), updateOne: jest.fn(async () => ({})) };
    const svc = new StepUpService(model as never, memoryStore());
    await svc.storeChallenge('adm');
    await svc.issueFromAssertion('adm', 'POST:/api/v1/x', { id: 'c1' });
    expect(verifyAuthenticationResponse.mock.calls[0][0].credential.publicKey.length).toBe(77);
  });
});
