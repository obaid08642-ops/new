/**
 * Phase 16.5 — the antivirus: a ClamAV daemon (clamd) reached over TCP or a unix socket with the INSTREAM command.
 *
 *   CLAMD_HOST / CLAMD_PORT (default 3310)   or   CLAMD_SOCKET=/var/run/clamav/clamd.ctl
 *
 * Three answers, and only these: `clean` (clamd said OK), `infected` (clamd named a signature), `unavailable` (not configured,
 * not reachable, timed out, or any reply that is not exactly OK / FOUND). `unavailable` is never `clean`: whether it blocks an
 * upload is `UploadSecurityService`'s decision (it does in production). Nothing is written to disk and nothing leaves the host.
 */
import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

export type ScanVerdict = { status: 'clean' } | { status: 'infected'; signature: string } | { status: 'unavailable'; reason: string };

const CHUNK = 64 * 1024;
const SCAN_TIMEOUT_MS = 30_000;

/**
 * What happens to an upload while the scanner cannot answer.
 *   required (the production default): the upload is refused with 503.
 *   defer: the upload is accepted into quarantine (the object sits under `pending/`, is never served, and a scan worker promotes it
 *          once a scanner has passed it); an infected file is still refused when the scanner does answer. A small server runs clamd
 *          only in short windows (deploy/scripts/clamav-window.sh), so the scan is deferred, never skipped.
 *   optional: a developer machine without ClamAV; the upload goes through with a warning.
 */
export type UploadScanMode = 'required' | 'defer' | 'optional';

/** UPLOAD_SCAN=required | defer | optional; unset means required in production and optional elsewhere. */
export function uploadScanMode(): UploadScanMode {
  const setting = (process.env.UPLOAD_SCAN || '').toLowerCase();
  if (setting === 'required' || setting === 'defer' || setting === 'optional') return setting;
  return process.env.NODE_ENV === 'production' ? 'required' : 'optional';
}

/** True unless the scan is optional: `defer` still scans every file, only later. */
export function uploadScanRequired(): boolean {
  return uploadScanMode() !== 'optional';
}

const AVAILABILITY_TTL_MS = 30_000;

@Injectable()
export class ClamavService {
  private readonly logger = new Logger(ClamavService.name);
  private availability?: { at: number; ok: boolean };

  /**
   * The public `uploads_enabled` signal in /config. True when uploads can succeed: the scan is not required, uploads are
   * accepted into quarantine (`defer`), or clamd answers PING with PONG. Cached for 30 s so /config never waits on the scanner
   * more than twice a minute.
   */
  async uploadsAvailable(): Promise<boolean> {
    const mode = uploadScanMode();
    if (mode !== 'required') return true;
    return this.scannerUp(AVAILABILITY_TTL_MS);
  }

  /** `features.uploads_pending_scan` in /config: a new upload is accepted but waits for its scan (defer mode, scanner down). */
  async uploadsPendingScan(): Promise<boolean> {
    return uploadScanMode() === 'defer' && !(await this.scannerUp(AVAILABILITY_TTL_MS));
  }

  /** True when clamd is configured and answers PING. Cached for `ttlMs` (the worker asks with a short one). */
  async scannerUp(ttlMs = 5_000): Promise<boolean> {
    const now = Date.now();
    if (this.availability && now - this.availability.at < ttlMs) return this.availability.ok;
    const ok = this.configured() && (await this.ping());
    this.availability = { at: now, ok };
    return ok;
  }

  private ping(): Promise<boolean> {
    return new Promise((resolve) => {
      const socketPath = (process.env.CLAMD_SOCKET || '').trim();
      const socket = socketPath
        ? net.createConnection({ path: socketPath })
        : net.createConnection({ host: (process.env.CLAMD_HOST || '').trim(), port: Number(process.env.CLAMD_PORT) || 3310 });
      const chunks: Buffer[] = [];
      let settled = false;
      const done = (ok: boolean) => { if (!settled) { settled = true; clearTimeout(timer); socket.destroy(); resolve(ok); } };
      const timer = setTimeout(() => done(false), 2_000);
      socket.on('error', () => done(false));
      socket.on('data', (c) => chunks.push(c));
      socket.on('close', () => done(Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim() === 'PONG'));
      socket.on('connect', () => socket.write('zPING\0'));
    });
  }

  configured(): boolean {
    return Boolean((process.env.CLAMD_SOCKET || '').trim() || (process.env.CLAMD_HOST || '').trim());
  }

  async scan(data: Buffer): Promise<ScanVerdict> {
    if (!this.configured()) return { status: 'unavailable', reason: 'clamd_not_configured' };
    try {
      return parseReply(await this.instream(data));
    } catch (e: any) {
      this.logger.error(`clamd scan failed: ${e?.message || e}`);
      return { status: 'unavailable', reason: e?.message === 'clamd_timeout' ? 'clamd_timeout' : 'clamd_unreachable' };
    }
  }

  private instream(data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socketPath = (process.env.CLAMD_SOCKET || '').trim();
      const socket = socketPath
        ? net.createConnection({ path: socketPath })
        : net.createConnection({ host: (process.env.CLAMD_HOST || '').trim(), port: Number(process.env.CLAMD_PORT) || 3310 });
      const chunks: Buffer[] = [];
      let settled = false;
      const done = (fn: () => void) => { if (!settled) { settled = true; clearTimeout(timer); socket.destroy(); fn(); } };
      const timer = setTimeout(() => done(() => reject(new Error('clamd_timeout'))), SCAN_TIMEOUT_MS);
      socket.on('error', (err) => done(() => reject(err)));
      socket.on('data', (c) => chunks.push(c));
      // clamd closes the connection after it answers a z-command.
      socket.on('close', () => done(() => resolve(Buffer.concat(chunks).toString('utf8'))));
      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let off = 0; off < data.length; off += CHUNK) {
          const part = data.subarray(off, off + CHUNK);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(part.length, 0);
          socket.write(size);
          socket.write(part);
        }
        socket.write(Buffer.alloc(4)); // a zero-length chunk ends the stream
      });
    });
  }
}

/** `stream: OK`, `stream: Eicar-Test-Signature FOUND`, or an `ERROR` / anything else (which is `unavailable`). */
export function parseReply(reply: string): ScanVerdict {
  const text = reply.replace(/\0/g, '').trim();
  if (/^stream: OK$/.test(text)) return { status: 'clean' };
  const found = /^stream: (.+) FOUND$/.exec(text);
  if (found) return { status: 'infected', signature: found[1].slice(0, 120) };
  return { status: 'unavailable', reason: 'clamd_unexpected_reply' };
}
