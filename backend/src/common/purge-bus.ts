// 14.8 purge-by-tag bus — CODE layer only (Cloudflare / Nginx / Redis edge DEFERRED).
//
// Why this file lives at `common/purge-bus.ts` instead of `common/cache/`:
// `common/cache/` already holds sibling work (route-cache-policy, public-cache
// decorator) owned by concurrent agents, so this bus is a dependency-free
// sibling — it never imports from cache/**, guards/**, idempotency/**,
// outbox/**, shedding/**, killswitches/**, observation/**, or modules/*.
//
// Model: entity + tag → subscribers. Publishers emit a PurgeEvent after a
// mutation commits; subscribers fan out in-memory (e.g. clear local LRU
// entries, call Next.js `revalidateTag`). Cross-process / edge propagation
// (Redis pub/sub, Cloudflare cache-tag purge) is documented below as hooks
// but NOT implemented — deferred to the 14.8-edge follow-up. Do not add edge
// configs in this file.

export type PurgeEntity =
  | 'product'
  | 'doctor'
  | 'medicine'
  | 'order'
  | 'prescription'
  | 'pharmacy';

export interface PurgeEvent {
  /** Domain entity that changed (e.g. 'product', 'doctor'). */
  entity: PurgeEntity;
  /** Cache tag to invalidate (e.g. 'product:42', 'products', 'doctor:7'). */
  tag: string;
  /** Optional originating entity id for tracing. */
  entityId?: string | number;
  /** When the mutation committed. Defaults to Date.now(). */
  at?: number;
}

export type PurgeSubscriber = (event: PurgeEvent) => void | Promise<void>;

/** Canonical tag builders — keep tag strings consistent across publishers. */
export function tagForEntity(entity: PurgeEntity, id: string | number): string {
  return `${entity}:${id}`;
}

/** Collection-level tag (e.g. 'products' for catalog listings). */
export function tagForCollection(entity: PurgeEntity): string {
  return `${entity}s`;
}

type Listener = { entity: PurgeEntity | '*'; tag: string | '*'; fn: PurgeSubscriber };

/**
 * In-memory purge-by-tag fan-out. Synchronous subscribe/publish; async
 * subscribers are fire-and-forget (rejections swallowed after logging) so a
 * slow subscriber can never block the mutation path.
 */
export class PurgeBus {
  private listeners: Listener[] = [];

  /** Subscribe to an entity+tag pair. '*' wildcards either dimension. */
  subscribe(entity: PurgeEntity | '*', tag: string | '*', fn: PurgeSubscriber): () => void {
    const listener: Listener = { entity, tag, fn };
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Publish one invalidation event to matching subscribers. Returns match count. */
  publish(event: PurgeEvent): number {
    const full: PurgeEvent = { at: Date.now(), ...event };
    let matched = 0;
    for (const l of [...this.listeners]) {
      if ((l.entity === '*' || l.entity === full.entity) && (l.tag === '*' || l.tag === full.tag)) {
        matched += 1;
        try {
          const r = l.fn(full);
          if (r instanceof Promise) r.catch((err) => console.error('[purge-bus] subscriber failed', err));
        } catch (err) {
          console.error('[purge-bus] subscriber threw', err);
        }
      }
    }
    return matched;
  }

  /** Convenience: publish a single-entity invalidation + its collection tag. */
  publishEntity(entity: PurgeEntity, id: string | number): number {
    return (
      this.publish({ entity, tag: tagForEntity(entity, id), entityId: id }) +
      this.publish({ entity, tag: tagForCollection(entity), entityId: id })
    );
  }

  listenerCount(): number {
    return this.listeners.length;
  }

  clear(): void {
    this.listeners = [];
  }
}

/** Shared process-local bus instance. */
export const purgeBus = new PurgeBus();

// ---------------------------------------------------------------------------
// DEFERRED EDGE HOOKS (documented, NOT implemented — 14.8-edge follow-up).
// Do not implement Redis/Cloudflare/Nginx wiring here; edge configs are
// off-limits to this task.
// ---------------------------------------------------------------------------

/**
 * DEFERRED: publish a PurgeEvent to Redis pub/sub so sibling processes /
 * instances invalidate too. Intended channel: `purge:<entity>:<tag>`.
 * @throws always — stub only.
 */
export async function publishToRedis(_event: PurgeEvent): Promise<never> {
  throw new Error(
    '[purge-bus] publishToRedis is deferred (14.8-edge): Redis pub/sub not wired. Event kept in-memory only.',
  );
}

/**
 * DEFERRED: purge a Cloudflare cache tag via the API
 * (POST zones/:zone/purge_cache { tags: [tag] }).
 * @throws always — stub only.
 */
export async function purgeCloudflareByTag(_tag: string): Promise<never> {
  throw new Error(
    '[purge-bus] purgeCloudflareByTag is deferred (14.8-edge): Cloudflare edge purge not wired.',
  );
}
