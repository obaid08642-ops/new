/**
 * 15.4 — queue order, replay, payment exclusion, offline banner, quality
 * downgrade, resumable upload, and the audio→chat fallback.
 *
 * The live throttled-network journey (Playwright/Detox, or `tc netem` at 3G with
 * 1 % loss) is NOT run here: this worktree has no docker and no browser/device
 * runtime. These are the unit-level equivalents.
 */
import {
  Outbox,
  OutboxForbiddenError,
  assertQueueable,
  OUTBOX_STORAGE_KEY,
  type OutboxEntry,
} from './outbox';
import { OfflineCache, cacheKeyFor, formatLastUpdated, OFFLINE_BANNER_COPY } from './cache';
import {
  adaptiveImageUrl,
  imageUrlForTier,
  qualityTierFor,
  shouldDowngradeImages,
  planCallFallback,
  shouldSkipRemoteImage,
  nextModality,
  CALL_FALLBACK_LADDER,
  IMAGE_TIER_WIDTH,
} from './degrade';
import { ResumableUpload, UploadResumeError, DEFAULT_CHUNK_SIZE, type UploadState } from './uploadResume';
import {
  getConnectivity,
  markOnline,
  markOffline,
  resetConnectivity,
  subscribeConnectivity,
} from '../http/connectivity';

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: async (key: string) => map.get(key) ?? null,
    setItem: async (key: string, value: string) => { map.set(key, value); },
    removeItem: async (key: string) => { map.delete(key); },
    dump: () => Object.fromEntries(map.entries()),
  };
}

beforeEach(() => {
  resetConnectivity();
  markOnline();
});
afterEach(() => resetConnectivity());

describe('15.4 · payments are never queued', () => {
  it.each(['payment', 'booking', 'prescription', 'emergency'])(
    'refuses to enqueue a %s',
    async (kind) => {
      const outbox = new Outbox({ storage: memoryStorage(), send: async () => undefined });
      await expect(
        outbox.enqueue({ kind, method: 'POST', endpoint: '/payments/confirm', body: {} }),
      ).rejects.toBeInstanceOf(OutboxForbiddenError);
      expect(await outbox.size()).toBe(0);
    },
  );

  it('refuses submit() as well, so the online fast path cannot be used to sneak one in', async () => {
    const send = jest.fn();
    const outbox = new Outbox({ storage: memoryStorage(), send });
    await expect(
      outbox.submit({ kind: 'payment', method: 'POST', endpoint: '/payments/confirm' }),
    ).rejects.toBeInstanceOf(OutboxForbiddenError);
    expect(send).not.toHaveBeenCalled();
  });

  it('assertQueueable is the single gate both paths go through', () => {
    expect(() => assertQueueable('cart')).not.toThrow();
    expect(() => assertQueueable('wishlist')).not.toThrow();
    expect(() => assertQueueable('reminder')).not.toThrow();
    expect(() => assertQueueable('mark-read')).not.toThrow();
    expect(() => assertQueueable('like')).not.toThrow();
    expect(() => assertQueueable('payment')).toThrow(OutboxForbiddenError);
  });
});

describe('15.4 · queue order and replay', () => {
  it('replays entries strictly in the order they were enqueued', async () => {
    const sent: string[] = [];
    const outbox = new Outbox({
      storage: memoryStorage(),
      send: async (entry) => { sent.push(entry.endpoint); },
    });

    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/a' });
    await outbox.enqueue({ kind: 'reminder', method: 'PATCH', endpoint: '/b' });
    await outbox.enqueue({ kind: 'wishlist', method: 'POST', endpoint: '/c' });

    const queued = await outbox.list();
    expect(queued.map((entry) => entry.endpoint)).toEqual(['/a', '/b', '/c']);
    expect(queued.map((entry) => entry.sequence)).toEqual([1, 2, 3]);

    const result = await outbox.replay();
    expect(sent).toEqual(['/a', '/b', '/c']);
    expect(result.replayed).toBe(3);
    expect(result.remaining).toBe(0);
  });

  it('stops at the first failure instead of skipping ahead, and keeps the failed entry', async () => {
    const sent: string[] = [];
    const outbox = new Outbox({
      storage: memoryStorage(),
      send: async (entry) => {
        sent.push(entry.endpoint);
        if (entry.endpoint === '/b') throw new Error('server said no');
      },
    });

    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/a' });
    await outbox.enqueue({ kind: 'reminder', method: 'PATCH', endpoint: '/b' });
    await outbox.enqueue({ kind: 'wishlist', method: 'POST', endpoint: '/c' });

    const result = await outbox.replay();
    expect(sent).toEqual(['/a', '/b']);
    expect(result.replayed).toBe(1);
    expect(result.failed).toHaveLength(1);

    const remaining = await outbox.list();
    expect(remaining.map((entry) => entry.endpoint)).toEqual(['/b', '/c']);
    expect(remaining[0].attempts).toBe(1);
    expect(remaining[0].lastError).toBe('server said no');
  });

  it('resumes on the next reconnect and finishes the queue in order', async () => {
    let failNext = true;
    const sent: string[] = [];
    const outbox = new Outbox({
      storage: memoryStorage(),
      send: async (entry) => {
        sent.push(entry.endpoint);
        if (entry.endpoint === '/b' && failNext) {
          failNext = false;
          throw new Error('transient');
        }
      },
    });
    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/a' });
    await outbox.enqueue({ kind: 'reminder', method: 'PATCH', endpoint: '/b' });
    await outbox.enqueue({ kind: 'wishlist', method: 'POST', endpoint: '/c' });

    await outbox.replay();
    expect(await outbox.size()).toBe(2);

    await outbox.replay();
    expect(sent).toEqual(['/a', '/b', '/b', '/c']);
    expect(await outbox.size()).toBe(0);
  });

  it('replays automatically when connectivity returns', async () => {
    const sent: string[] = [];
    const outbox = new Outbox({ storage: memoryStorage(), send: async (e) => { sent.push(e.endpoint); } });
    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/queued' });

    markOffline();
    const stop = outbox.startAutoReplay();
    await Promise.resolve();
    expect(sent).toEqual([]);          // still offline: nothing attempted

    markOnline();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sent).toEqual(['/queued']);
    stop();
  });

  it('does not replay while the device is offline', async () => {
    const send = jest.fn();
    const outbox = new Outbox({ storage: memoryStorage(), send });
    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/x' });
    markOffline();
    const result = await outbox.replay();
    expect(send).not.toHaveBeenCalled();
    expect(result.remaining).toBe(1);
  });

  it('submit() runs immediately when online and queues when offline', async () => {
    const send = jest.fn();
    const storage = memoryStorage();
    const onlineBox = new Outbox({ storage, send });
    const online = await onlineBox.submit({ kind: 'cart', method: 'POST', endpoint: '/live' });
    expect(online.queued).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);

    markOffline();
    const offlineBox = new Outbox({ storage, send });
    const offline = await offlineBox.submit({ kind: 'cart', method: 'POST', endpoint: '/later' });
    expect(offline.queued).toBe(true);
    expect(await offlineBox.size()).toBe(1);
  });

  it('survives an app restart: the queue is reloaded from storage in order', async () => {
    const storage = memoryStorage();
    const first = new Outbox({ storage, send: async () => { throw new Error('offline'); } });
    await first.enqueue({ kind: 'cart', method: 'POST', endpoint: '/one' });
    await first.enqueue({ kind: 'wishlist', method: 'POST', endpoint: '/two' });

    const second = new Outbox({ storage, send: async () => undefined });
    const restored = await second.list();
    expect(restored.map((entry) => entry.endpoint)).toEqual(['/one', '/two']);
    expect(restored[1].sequence).toBe(2);
    expect(storage.dump()[OUTBOX_STORAGE_KEY]).toBeTruthy();
  });

  it('a corrupt store starts empty instead of bricking the app', async () => {
    const storage = memoryStorage({ [OUTBOX_STORAGE_KEY]: 'not json' });
    const outbox = new Outbox({ storage, send: async () => undefined });
    expect(await outbox.size()).toBe(0);
  });

  it('notifies subscribers as the queue changes', async () => {
    const seen: number[] = [];
    const outbox = new Outbox({ storage: memoryStorage(), send: async () => undefined });
    const stop = outbox.subscribe((entries) => seen.push(entries.length));
    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/a' });
    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/b' });
    stop();
    expect(seen[seen.length - 1]).toBe(2);
  });
});

describe('15.4 · cached data stays visible offline with a last-updated time', () => {
  it('returns the cached copy with its timestamp, marked as coming from cache', async () => {
    const storage = memoryStorage();
    const cache = new OfflineCache(storage);
    await cache.write('medicines', [{ id: 'm1' }], () => 1_700_000_000_000);

    const read = await cache.read<Array<{ id: string }>>('medicines');
    expect(read?.data).toEqual([{ id: 'm1' }]);
    expect(read?.updatedAt).toBe(1_700_000_000_000);
    expect(read?.source).toBe('cache');
  });

  it('a cache miss is null, not a thrown error', async () => {
    const cache = new OfflineCache(memoryStorage());
    expect(await cache.read('nothing')).toBeNull();
  });

  it('reports the most recent update across the screens the banner covers', async () => {
    const cache = new OfflineCache(memoryStorage());
    await cache.write('orders', [], () => 1000);
    await cache.write('medicines', [], () => 5000);
    expect(await cache.lastUpdatedAt(['orders', 'medicines', 'absent'])).toBe(5000);
    expect(await cache.lastUpdatedAt(['absent'])).toBeNull();
  });

  it('formats the last-updated time for the banner in both locales', () => {
    const now = 1_700_002_700_000; // 45 minutes after
    expect(formatLastUpdated(1_700_000_000_000, 'en', now)).toBe('Updated 45 min ago');
    expect(formatLastUpdated(1_700_000_000_000, 'ar', now)).toBe('تم التحديث قبل 45 دقيقة');
    expect(formatLastUpdated(1_700_000_000_000, 'en', 1_700_003_600_000)).toBe('Updated 1 h ago');
    expect(formatLastUpdated(1_700_003_590_000, 'en', now)).toBe('Updated just now');
    expect(formatLastUpdated(null, 'en', now)).toBe('Never synced');
    expect(formatLastUpdated(null, 'ar', now)).toBe('لم تتم المزامنة بعد');
  });

  it('has offline and recovered copy for the banner', () => {
    expect(OFFLINE_BANNER_COPY.ar.offline).toContain('محفوظة');
    expect(OFFLINE_BANNER_COPY.en.offline).toContain('saved data');
    expect(OFFLINE_BANNER_COPY.en.back).toContain('Back online');
  });

  it('writes under a versioned key so an old shape cannot be read back', () => {
    expect(cacheKeyFor('orders')).toBe('@nabdah_cache_v2_orders');
  });
});

describe('15.4 · lower image quality on a slow network', () => {
  it('maps every connection quality to a rendition tier', () => {
    expect(qualityTierFor('offline')).toBe('low');
    expect(qualityTierFor('poor')).toBe('low');
    expect(qualityTierFor('good')).toBe('high');
    expect(qualityTierFor('unknown')).toBe('medium');
  });

  it('downgrades on poor and offline links, but not on an unknown or good one', () => {
    // `unknown` is the pre-NetInfo state; blanking every product photo on first
    // paint would be a regression, not an optimisation.
    expect(shouldDowngradeImages('poor')).toBe(true);
    expect(shouldDowngradeImages('offline')).toBe(true);
    expect(shouldDowngradeImages('unknown')).toBe(false);
    expect(shouldDowngradeImages('good')).toBe(false);
  });

  it('skips the remote fetch entirely on a link that cannot afford it', () => {
    expect(shouldSkipRemoteImage('poor')).toBe(true);
    expect(shouldSkipRemoteImage('offline')).toBe(true);
    expect(shouldSkipRemoteImage('unknown')).toBe(false);
    expect(shouldSkipRemoteImage('good')).toBe(false);
  });

  it('asks for a smaller file on a slow link than on a fast one', () => {
    const request = { url: 'https://cdn.nabd.plus/medicine/a.png' };
    const slow = new URL(adaptiveImageUrl(request, 'poor'));
    const fast = new URL(adaptiveImageUrl(request, 'good'));

    expect(Number(slow.searchParams.get('w'))).toBe(IMAGE_TIER_WIDTH.low);
    expect(Number(fast.searchParams.get('w'))).toBe(IMAGE_TIER_WIDTH.high);
    expect(Number(slow.searchParams.get('w'))).toBeLessThan(Number(fast.searchParams.get('w')));
    expect(Number(slow.searchParams.get('q'))).toBeLessThan(Number(fast.searchParams.get('q')));
  });

  it('reads the live connectivity snapshot when no quality is passed', () => {
    const before = new URL(adaptiveImageUrl({ url: 'https://cdn/x.png' })).searchParams.get('w');
    expect(before).toBe(String(IMAGE_TIER_WIDTH.medium)); // unknown by default
    getConnectivity(); // snapshot is readable
  });

  it('keeps the aspect ratio the caller asked for', () => {
    const url = new URL(imageUrlForTier({ url: 'https://cdn/x.png', width: 1000, height: 500 }, 'low'));
    expect(url.searchParams.get('w')).toBe('320');
    expect(url.searchParams.get('h')).toBe('160');
  });

  it('replaces an existing width parameter instead of duplicating it', () => {
    const url = imageUrlForTier({ url: 'https://cdn/x.png?w=2000&q=100' }, 'low');
    expect(url.match(/[?&]w=/g)).toHaveLength(1);
    expect(url).toContain('w=320');
  });
});

describe('15.4 · calls fall back to audio, then to chat', () => {
  it('declares the ladder video → audio → chat', () => {
    expect([...CALL_FALLBACK_LADDER]).toEqual(['video', 'audio', 'chat']);
    expect(nextModality('video')).toBe('audio');
    expect(nextModality('audio')).toBe('chat');
    expect(nextModality('chat')).toBeNull();
  });

  it('a video call on a poor network drops to AUDIO, not to chat', () => {
    const plan = planCallFallback('video', { online: true, quality: 'poor' });
    expect(plan.modality).toBe('audio');
    expect(plan.degraded).toBe(true);
    expect(plan.reason).toBe('poor_network');
    expect(plan.message.en).toContain('audio');
  });

  it('an audio call with no network at all drops to chat', () => {
    const plan = planCallFallback('audio', { online: false });
    expect(plan.modality).toBe('chat');
    expect(plan.degraded).toBe(true);
    expect(plan.reason).toBe('network_lost');
    expect(plan.message.ar).toContain('رسائل');
  });

  it('a healthy connection changes nothing', () => {
    expect(planCallFallback('video', { online: true, quality: 'good' })).toMatchObject({
      modality: 'video',
      degraded: false,
    });
    expect(planCallFallback('audio', { online: true, quality: 'good' })).toMatchObject({
      modality: 'audio',
      degraded: false,
    });
  });
});

describe('15.4 · uploads resume', () => {
  function recordingTransport(opts: { failAt?: number; acknowledged?: (to: number) => number } = {}) {
    const ranges: Array<[number, number]> = [];
    let call = 0;
    const transport = {
      sendChunk: async (_state: UploadState, from: number, to: number) => {
        call += 1;
        ranges.push([from, to]);
        if (opts.failAt === call) throw new Error('connection lost');
        return opts.acknowledged ? opts.acknowledged(to) : to;
      },
      complete: async () => ({ url: 'https://cdn/final.png', id: 'u-1' }),
    };
    return { transport, ranges };
  }

  it('sends fixed-size chunks and completes', async () => {
    const { transport, ranges } = recordingTransport();
    const upload = new ResumableUpload(transport, memoryStorage(), () => 1);
    await upload.start({ uploadId: 'u-1', url: 'https://api/upload', totalBytes: DEFAULT_CHUNK_SIZE * 2 + 100 });
    const result = await upload.run();

    expect(ranges).toEqual([
      [0, DEFAULT_CHUNK_SIZE],
      [DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE * 2],
      [DEFAULT_CHUNK_SIZE * 2, DEFAULT_CHUNK_SIZE * 2 + 100],
    ]);
    expect(result.url).toBe('https://cdn/final.png');
    expect(upload.isComplete).toBe(true);
  });

  it('continues from the acknowledged offset after a dropped connection, not from zero', async () => {
    const storage = memoryStorage();
    const first = recordingTransport({ failAt: 2 });
    const upload = new ResumableUpload(first.transport, storage, () => 1);
    await upload.start({ uploadId: 'u-2', url: 'https://api/upload', totalBytes: DEFAULT_CHUNK_SIZE * 3 });

    await expect(upload.run()).rejects.toThrow('connection lost');
    // Two chunks landed before the failure; the third never started.
    expect(first.ranges).toEqual([
      [0, DEFAULT_CHUNK_SIZE],
      [DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE * 2],
    ]);

    // One chunk was acknowledged before the link dropped; that offset survived.
    const second = recordingTransport();
    const resumed = new ResumableUpload(second.transport, storage, () => 2);
    const restored = await resumed.restoreInto('u-2');
    expect(restored?.uploadedBytes).toBe(DEFAULT_CHUNK_SIZE);
    expect(resumed.remainingBytes).toBe(DEFAULT_CHUNK_SIZE * 2);

    // The retry starts where it stopped — byte 0 is never re-sent.
    await resumed.run();
    expect(second.ranges).toEqual([
      [DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE * 2],
      [DEFAULT_CHUNK_SIZE * 2, DEFAULT_CHUNK_SIZE * 3],
    ]);
  });

  it('reports progress after every acknowledged chunk', async () => {
    const { transport } = recordingTransport();
    const upload = new ResumableUpload(transport, memoryStorage(), () => 1);
    await upload.start({ uploadId: 'u-3', url: 'https://api/upload', totalBytes: DEFAULT_CHUNK_SIZE * 2 });
    const seen: number[] = [];
    await upload.run((state) => seen.push(state.uploadedBytes));
    expect(seen).toEqual([DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_SIZE * 2]);
  });

  it('refuses to loop when the server acknowledges nothing', async () => {
    const { transport } = recordingTransport({ acknowledged: () => 0 });
    const upload = new ResumableUpload(transport, memoryStorage(), () => 1);
    await upload.start({ uploadId: 'u-4', url: 'https://api/upload', totalBytes: 1000 });
    await expect(upload.run()).rejects.toBeInstanceOf(UploadResumeError);
  });

  it('rejects an upload with no id, no url or a zero size', async () => {
    const { transport } = recordingTransport();
    const upload = new ResumableUpload(transport, memoryStorage(), () => 1);
    await expect(upload.start({ uploadId: '', url: 'https://api', totalBytes: 10 })).rejects.toBeInstanceOf(UploadResumeError);
    await expect(upload.start({ uploadId: 'u', url: '', totalBytes: 10 })).rejects.toBeInstanceOf(UploadResumeError);
    await expect(upload.start({ uploadId: 'u', url: 'https://api', totalBytes: 0 })).rejects.toBeInstanceOf(UploadResumeError);
  });

  it('running before start is an error, not a silent no-op', async () => {
    const { transport } = recordingTransport();
    const upload = new ResumableUpload(transport, memoryStorage(), () => 1);
    await expect(upload.run()).rejects.toBeInstanceOf(UploadResumeError);
  });
});

describe('15.4 · connectivity is one signal for the whole app', () => {
  it('subscribers see the offline transition and the recovery', () => {
    const seen: boolean[] = [];
    const stop = subscribeConnectivity((snapshot) => seen.push(snapshot.online));
    markOffline();
    markOnline();
    stop();
    expect(seen).toEqual([true, false, true]);
  });

  it('the outbox is wired to the same signal, not to its own listener', async () => {
    const sent: OutboxEntry['endpoint'][] = [];
    const outbox = new Outbox({ storage: memoryStorage(), send: async (e) => { sent.push(e.endpoint); } });
    await outbox.enqueue({ kind: 'cart', method: 'POST', endpoint: '/z' });
    const stop = outbox.startAutoReplay();
    markOffline();
    markOnline();
    await new Promise((resolve) => setTimeout(resolve, 0));
    stop();
    expect(sent).toEqual(['/z']);
  });
});
