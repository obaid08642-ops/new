import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * UPLOAD_SCAN=defer (clamav.service.ts): an upload that could not be scanned yet is stored under this prefix. A key under it is
 * never signed, never linked and never read; the scan worker copies a file that passed to its final key (the same name without the
 * prefix) and deletes the original.
 */
export const PENDING_PREFIX = 'pending/';

export const isPendingKey = (key: unknown): boolean => typeof key === 'string' && key.startsWith(PENDING_PREFIX);

export const promotedKey = (key: string): string => (isPendingKey(key) ? key.slice(PENDING_PREFIX.length) : key);

/** scan_status of a stored file. A row without one predates the deferral and was scanned before it was stored. */
export type ScanStatus = 'pending_scan' | 'scanning' | 'clean' | 'infected';
export const isUnscanned = (status: unknown): boolean => status === 'pending_scan' || status === 'scanning';

/** 423 Locked: the file exists and is yours, but nobody can open it until it has been scanned. */
export class FilePendingScanException extends HttpException {
  constructor() {
    super({ statusCode: HttpStatus.LOCKED, message: 'file_pending_scan', code: 'file_pending_scan', retry_after_seconds: 60 }, HttpStatus.LOCKED);
  }
}
