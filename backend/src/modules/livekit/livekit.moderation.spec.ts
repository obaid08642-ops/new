import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Connection, Model } from 'mongoose';
import { LiveKitService } from './livekit.service';

/** The RoomServiceClient surface the moderation endpoints use. */
interface LiveKitModerationClient {
  getParticipant(room: string, identity: string): Promise<{ tracks?: Array<{ sid: string }> }>;
  mutePublishedTrack(room: string, identity: string, trackSid: string, muted: boolean): Promise<unknown>;
  removeParticipant(room: string, identity: string): Promise<void>;
}

/**
 * Admin moderation (mute/remove) must report real outcomes:
 * not configured -> 503, unknown participant -> 404, LiveKit failure -> 503,
 * success only when the participant exists and the server call succeeded.
 */
describe('LiveKit admin moderation outcomes', () => {
  const ENV = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV) saved[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of ENV) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    jest.restoreAllMocks();
  });

  function makeService(): LiveKitService {
    return new LiveKitService(
      {} as unknown as Model<Record<string, unknown>>,
      {} as unknown as Connection,
      new EventEmitter2(),
    );
  }

  function withClient(service: LiveKitService, client: LiveKitModerationClient) {
    jest
      .spyOn(service as unknown as { roomService(): LiveKitModerationClient | null }, 'roomService')
      .mockReturnValue(client);
  }

  const notFound = Object.assign(new Error('participant does not exist'), { status: 404, code: 'not_found' });

  function client(overrides: Partial<LiveKitModerationClient> = {}): LiveKitModerationClient & { [k: string]: jest.Mock } {
    return {
      getParticipant: jest.fn().mockResolvedValue({ tracks: [{ sid: 'TR_a' }, { sid: 'TR_b' }] }),
      mutePublishedTrack: jest.fn().mockResolvedValue({}),
      removeParticipant: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as LiveKitModerationClient & { [k: string]: jest.Mock };
  }

  it('answers 503 for mute and remove when LiveKit is not configured', async () => {
    for (const k of ENV) delete process.env[k];
    const service = makeService();
    await expect(service.muteParticipant('room-1', 'p1', true)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.removeParticipant('room-1', 'p1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('answers 404 for an unknown participant on remove and does not call removeParticipant', async () => {
    const service = makeService();
    const c = client({ getParticipant: jest.fn().mockRejectedValue(notFound) });
    withClient(service, c);
    await expect(service.removeParticipant('room-1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
    expect(c.removeParticipant).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown participant on mute', async () => {
    const service = makeService();
    const c = client({ getParticipant: jest.fn().mockRejectedValue(notFound) });
    withClient(service, c);
    await expect(service.muteParticipant('room-1', 'ghost', true)).rejects.toBeInstanceOf(NotFoundException);
    expect(c.mutePublishedTrack).not.toHaveBeenCalled();
  });

  it('answers 503 (not success) when the LiveKit remove call fails', async () => {
    const service = makeService();
    withClient(service, client({ removeParticipant: jest.fn().mockRejectedValue(new Error('ECONNRESET')) }));
    await expect(service.removeParticipant('room-1', 'p1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('removes and mutes an existing participant', async () => {
    const service = makeService();
    const c = client();
    withClient(service, c);
    await expect(service.removeParticipant('room-1', 'p1')).resolves.toEqual({ success: true });
    expect(c.removeParticipant).toHaveBeenCalledWith('room-1', 'p1');
    await expect(service.muteParticipant('room-1', 'p1', true)).resolves.toEqual({ success: true });
    expect(c.mutePublishedTrack).toHaveBeenCalledWith('room-1', 'p1', 'TR_a', true);
    expect(c.mutePublishedTrack).toHaveBeenCalledWith('room-1', 'p1', 'TR_b', true);
  });
});
