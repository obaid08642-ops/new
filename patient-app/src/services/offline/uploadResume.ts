/**
 * 15.4 — resumable uploads.
 *
 * A 4 MB prescription photo on a train must not restart from byte 0 every time
 * the link drops. `ResumableUpload` splits the file into fixed-size chunks,
 * remembers how many bytes the server has already acknowledged, and continues
 * from there. Progress is durable, so an app restart resumes rather than restarts.
 *
 * The transport is injected. What is tested here is the state machine — chunk
 * sizing, offset bookkeeping, resume-from-offset, and completion — not HTTP.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const UPLOAD_STATE_PREFIX = '@nabdah_upload_v1_';

export interface UploadState {
  uploadId: string;
  url: string;
  /** Bytes the server has acknowledged. The next chunk starts here. */
  uploadedBytes: number;
  totalBytes: number;
  chunkSize: number;
  createdAt: number;
  headers?: Record<string, string>;
  /** Field name for a multipart upload. */
  fieldName?: string;
  fileName?: string;
  mimeType?: string;
}

/** 512 KB: large enough that per-request overhead stays low, small enough to retry. */
export const DEFAULT_CHUNK_SIZE = 512 * 1024;

export class UploadResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadResumeError';
  }
}

export interface ChunkTransport {
  /** Send bytes [from, to) and resolve with the new acknowledged offset. */
  sendChunk: (state: UploadState, from: number, to: number) => Promise<number>;
  /** Finalise once every byte is acknowledged. */
  complete: (state: UploadState) => Promise<{ url?: string; id?: string }>;
}

export interface ResumeStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class ResumableUpload {
  private state: UploadState | null = null;
  private completed = false;

  constructor(
    private readonly transport: ChunkTransport,
    private readonly storage: ResumeStorageLike = AsyncStorage,
    private readonly now: () => number = Date.now,
  ) {}

  static stateKey(uploadId: string): string {
    return `${UPLOAD_STATE_PREFIX}${uploadId}`;
  }

  async start(input: {
    uploadId: string;
    url: string;
    totalBytes: number;
    chunkSize?: number;
    headers?: Record<string, string>;
    fieldName?: string;
    fileName?: string;
    mimeType?: string;
  }): Promise<UploadState> {
    if (!input.uploadId || !input.url) throw new UploadResumeError('upload_id_and_url_required');
    if (!Number.isFinite(input.totalBytes) || input.totalBytes <= 0) {
      throw new UploadResumeError('total_bytes_must_be_positive');
    }
    const state: UploadState = {
      uploadId: input.uploadId,
      url: input.url,
      uploadedBytes: 0,
      totalBytes: input.totalBytes,
      chunkSize: input.chunkSize ?? DEFAULT_CHUNK_SIZE,
      createdAt: this.now(),
      headers: input.headers,
      fieldName: input.fieldName,
      fileName: input.fileName,
      mimeType: input.mimeType,
    };
    this.state = state;
    this.completed = false;
    await this.persist(state);
    return state;
  }

  /** Resume a previously started upload, if its state survived the app restart. */
  static async restore(
    uploadId: string,
    storage: ResumeStorageLike = AsyncStorage,
  ): Promise<UploadState | null> {
    try {
      const raw = await storage.getItem(ResumableUpload.stateKey(uploadId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UploadState;
      if (typeof parsed?.uploadedBytes !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async restoreInto(uploadId: string): Promise<UploadState | null> {
    const restored = await ResumableUpload.restore(uploadId, this.storage);
    this.state = restored;
    return restored;
  }

  private async persist(state: UploadState): Promise<void> {
    try {
      await this.storage.setItem(ResumableUpload.stateKey(state.uploadId), JSON.stringify(state));
    } catch {
      // Progress that cannot be written is still progress this session.
    }
  }

  private async clear(): Promise<void> {
    if (!this.state) return;
    try {
      await this.storage.removeItem(ResumableUpload.stateKey(this.state.uploadId));
    } catch {
      // Best-effort cleanup.
    }
  }

  get current(): UploadState | null {
    return this.state;
  }

  get isComplete(): boolean {
    if (this.completed) return true;
    return !!this.state && this.state.uploadedBytes >= this.state.totalBytes;
  }

  /** Bytes still to send. */
  get remainingBytes(): number {
    if (!this.state) return 0;
    return Math.max(0, this.state.totalBytes - this.state.uploadedBytes);
  }

  /**
   * Send every remaining chunk in order, persisting the acknowledged offset after
   * each one. A transport error propagates with the offset intact, so the caller
   * can retry later and continue rather than restart.
   */
  async run(onProgress?: (state: UploadState) => void): Promise<{ url?: string; id?: string }> {
    const state = this.state;
    if (!state) throw new UploadResumeError('upload_not_started');

    while (state.uploadedBytes < state.totalBytes) {
      const from = state.uploadedBytes;
      const to = Math.min(from + state.chunkSize, state.totalBytes);
      const acknowledged = await this.transport.sendChunk(state, from, to);
      const next = Math.max(acknowledged, from);
      if (next >= state.totalBytes) {
        state.uploadedBytes = state.totalBytes;
      } else if (next > from) {
        state.uploadedBytes = next;
      } else {
        // The server accepted nothing. Stop rather than spin on the same offset.
        throw new UploadResumeError(`chunk_not_acknowledged_at_${from}`);
      }
      await this.persist(state);
      onProgress?.({ ...state });
    }

    const result = await this.transport.complete(state);
    await this.clear();
    this.state = null;
    this.completed = true;
    return result;
  }
}
