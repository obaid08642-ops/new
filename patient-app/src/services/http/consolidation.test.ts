/**
 * 15.1 — consolidation: there is exactly ONE network implementation, and all
 * three former entry points reach it.
 *
 * Before this change the app had three independent `apiFetch` implementations
 * (`utils/api.ts`, `src/services/HttpClient.ts`, `src/utils/api.ts`). This suite
 * is the executable form of "one API client per app": it fails if a second
 * `fetch(` ever appears in the network layer, and it proves the axios surface
 * (RTK Query, the remote data sources, push registration) executes through the
 * same client as `apiFetch`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { HttpClient, http, httpRequest } from '../HttpClient';
import * as legacyRootApi from '../../../utils/api';
import { apiFetch as singleApiFetch } from '../../utils/api';
import { httpRequest as coreHttpRequest } from './client';

const SRC = path.resolve(__dirname, '..');

/** Every module that is allowed to talk to the network. */
const TRANSPORT_MODULES = ['http/client.ts', 'http/axiosAdapter.ts'];

describe('15.1 · one API client', () => {
  it('only the single client module calls fetch', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const rel = path.relative(SRC, full);
        if (/\.test\.tsx?$/.test(entry.name)) continue;
        const source = fs.readFileSync(full, 'utf8');
        // `fetchImpl` is the injected seam, not a second transport.
        const direct = source.match(/(?<![\w.])fetch\s*\(/g) ?? [];
        if (direct.length && !TRANSPORT_MODULES.includes(rel)) {
          offenders.push(`${rel} (${direct.length})`);
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });

  it('the legacy root client is a re-export, not a second implementation', () => {
    expect(legacyRootApi.apiFetch).toBe(singleApiFetch);
    const source = fs.readFileSync(path.resolve(__dirname, '../../../utils/api.ts'), 'utf8');
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/from 'axios'/);
    expect(source).not.toMatch(/axios\.create/);
  });

  it('the axios instance, the http alias and httpRequest are one object', () => {
    expect(http).toBe(HttpClient);
    expect(httpRequest).toBe(HttpClient);
  });

  it('an axios call is executed by the single client, so it inherits the same policy', async () => {
    // The adapter is the only transport axios has, and it is the shared core.
    expect(HttpClient.defaults.adapter).toBeDefined();
    const adapter = HttpClient.defaults.adapter as unknown as (config: unknown) => Promise<unknown>;
    const fetchCalls: string[] = [];
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = (url: string) => {
      fetchCalls.push(url);
      return Promise.resolve({
        status: 200,
        ok: true,
        headers: { forEach: () => undefined },
        text: async () => JSON.stringify({ viaAxios: true }),
      });
    };
    try {
      const response = await HttpClient.request({
        url: '/health/vitals',
        method: 'GET',
        baseURL: 'https://api.test/api/v1',
      });
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ viaAxios: true });
      expect(fetchCalls).toEqual(['https://api.test/api/v1/health/vitals']);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
    expect(typeof adapter).toBe('function');
  });

  it('the axios path surfaces the 13.R5 catalogue entry, not a raw Axios payload', async () => {
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = () =>
      Promise.resolve({
        status: 409,
        ok: false,
        headers: { forEach: () => undefined },
        text: async () => JSON.stringify({ code: 'DUPLICATE_TRANSACTION', message: 'already submitted' }),
      });
    try {
      await expect(
        HttpClient.request({ url: '/cart/checkout', method: 'POST', baseURL: 'https://api.test/api/v1', data: {} }),
      ).rejects.toMatchObject({
        name: 'AppError',
        metadata: { backendCode: 'DUPLICATE_TRANSACTION' },
      });
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('the core is exported for the adapter and the client tests', () => {
    expect(typeof coreHttpRequest).toBe('function');
  });
});
