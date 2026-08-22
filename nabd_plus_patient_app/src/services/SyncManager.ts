interface SyncRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  headers?: any;
  timestamp: number;
  retries: number;
}

export class OfflineMutationQueueDisabledError extends Error {
  constructor() { super('offline_mutation_queue_disabled_pending_contract'); }
}

/**
 * The previous queue persisted entire mutation requests (including headers) and
 * replayed them without idempotency. It is deliberately disabled until the
 * published API defines a resource allowlist, TTL, idempotency key, and final
 * confirmation DTO for each queued operation.
 */
export class SyncManager {
  static async enqueueRequest(_req: Omit<SyncRequest, 'id' | 'timestamp' | 'retries'>): Promise<never> {
    throw new OfflineMutationQueueDisabledError();
  }

  static async getQueue(): Promise<SyncRequest[]> {
    return [];
  }

  static async sync(): Promise<void> {
    return;
  }

  static initialize(): void {
    // Intentionally no reconnect replay while the live idempotency contract is unavailable.
  }
}
