import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearRecordedErrors,
  getErrorTransport,
  recentErrors,
  reportError,
  resolveEnvironment,
  resolveRelease,
  resolveSupportEmail,
  setErrorTransport,
  type ErrorTransport,
} from '../error-reporter';

describe('15.5 — error reporting', () => {
  beforeEach(() => {
    clearRecordedErrors();
    setErrorTransport(null);
  });

  afterEach(() => {
    setErrorTransport(null);
    vi.restoreAllMocks();
  });

  describe('releases', () => {
    it('prefers an explicit SENTRY_RELEASE (the git SHA CI sets)', () => {
      expect(resolveRelease({ SENTRY_RELEASE: '9f2c1ab', NODE_ENV: 'production' })).toBe('9f2c1ab');
    });

    it('derives a version-only release from ADMIN_APP_VERSION when there is no SHA', () => {
      expect(resolveRelease({ ADMIN_APP_VERSION: '0.1.0', NODE_ENV: 'production' })).toBe('web-admin@0.1.0');
    });

    it('falls back to a distinguishable dev release rather than an empty string', () => {
      expect(resolveRelease({ NODE_ENV: 'development' })).toBe('web-admin@dev');
      expect(resolveRelease({ SENTRY_RELEASE: '   ' })).toBe('web-admin@dev');
    });

    it('reads the environment the same way on client and server', () => {
      expect(resolveEnvironment({ NODE_ENV: 'production' })).toBe('production');
      expect(resolveEnvironment({ SENTRY_ENVIRONMENT: 'staging', NODE_ENV: 'production' })).toBe('staging');
      expect(resolveEnvironment({})).toBe('development');
    });

    it('resolves a configurable support address', () => {
      expect(resolveSupportEmail({ NEXT_PUBLIC_ADMIN_SUPPORT_EMAIL: 'ops@example.com' })).toBe('ops@example.com');
      expect(resolveSupportEmail({})).toBe('support@nabd.plus');
    });
  });

  describe('capture', () => {
    it('attaches the release to the event the transport receives', async () => {
      const captured: Array<{ release: string; environment: string; context: Record<string, unknown> }> = [];
      const transport: ErrorTransport = {
        name: 'test',
        capture: (event) => void captured.push(event),
      };
      setErrorTransport(transport);

      const entry = await reportError(new Error('boom'), { boundary: 'test' });

      expect(captured).toHaveLength(1);
      expect(captured[0].release).toBe(entry.release);
      expect(entry.release).toBe(resolveRelease());
      expect(captured[0].environment).toBe(resolveEnvironment());
      expect(captured[0].context).toEqual({ boundary: 'test' });
      expect(entry.delivered).toBe(true);
    });

    it('gives every error a distinct id so an operator can quote it', async () => {
      const first = await reportError(new Error('one'));
      const second = await reportError(new Error('two'));
      expect(first.errorId).not.toBe(second.errorId);
      expect(first.errorId.length).toBeGreaterThan(8);
    });

    it('keeps a bounded buffer of recent errors for the support hand-off', async () => {
      for (let index = 0; index < 60; index += 1) {
        await reportError(new Error(`error-${index}`));
      }
      const buffered = recentErrors();
      expect(buffered.length).toBe(50);
      // Newest first.
      expect((buffered[0].error as Error).message).toBe('error-59');
    });

    it('still records the error when no transport is installed (no DSN configured)', async () => {
      const entry = await reportError(new Error('offline-reporting'), { boundary: 'test' });
      expect(getErrorTransport()).toBeNull();
      expect(entry.delivered).toBe(false);
      expect(entry.errorId).toBeTruthy();
      expect(recentErrors()).toHaveLength(1);
    });

    it('never lets a broken transport replace the error the operator was reading', async () => {
      const transport: ErrorTransport = {
        name: 'broken',
        capture: () => {
          throw new Error('transport down');
        },
      };
      setErrorTransport(transport);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const entry = await reportError(new Error('original failure'), { boundary: 'test' });

      expect(entry.delivered).toBe(false);
      expect((entry.error as Error).message).toBe('original failure');
      expect(recentErrors()).toHaveLength(1);
    });

    it('records a non-Error throwable without losing it', async () => {
      const entry = await reportError('a string failure');
      expect(entry.error).toBe('a string failure');
      expect(entry.errorId).toBeTruthy();
    });
  });
});