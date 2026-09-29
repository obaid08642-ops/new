/**
 * F27: emit openapi.json from the Nest Swagger document at build time.
 * Boots the app module without listening (no DB writes; providers that need
 * live infra fail soft because the document only needs route metadata).
 * Usage: npx ts-node -T scripts/generate-openapi.ts [out-path]
 */
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

function mongoReachable(url: string): Promise<boolean> {
  const m = url.match(/mongodb:\/\/(?:[^@]*@)?([^:/]+)(?::(\d+))?/);
  const host = m?.[1] || '127.0.0.1';
  const port = Number(m?.[2] || 27017);
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 3000 });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => resolve(false));
  });
}

async function main() {
  const strict = process.argv.includes('--strict');
  const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/nabd';
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'openapi-docgen-placeholder';
  if (!(await mongoReachable(mongoUrl))) {
    console.log(JSON.stringify({ skipped: 'mongo_unreachable', hint: 'set MONGO_URL or run with --strict to fail' }));
    if (!strict) process.exit(0);
    throw new Error('mongo_unreachable');
  }
  process.env.MONGO_URL = mongoUrl;
  const { AppModule } = await import('../src/app.module');
  const { createNabdahOpenApiDocument } = await import('../src/config/openapi.config');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  try {
    await app.init();
    const document = createNabdahOpenApiDocument(app) as any;
    // Mirror main.ts: global prefix 'api' + default version '1'.
    const prefixed: Record<string, unknown> = {};
    for (const [p, ops] of Object.entries(document.paths || {})) {
      prefixed[`/api/v1${p === '/' ? '' : p}`] = ops;
    }
    document.paths = prefixed;
    document.servers = [{ url: '/api/v1', description: 'Versioned API Gateway' }];
    const out = process.argv[2] || path.resolve(__dirname, '..', 'openapi.json');
    const payload = JSON.stringify(document, null, 2);
    fs.writeFileSync(out, payload);
    // Never mirror this into patient-web/public: it is the full private spec (admin routes
    // included). Agents get the curated public subset at /.well-known/openapi.json.
    console.log(JSON.stringify({ openapi: out, paths: Object.keys(prefixed).length }));
  } finally {
    await app.close().catch(() => null);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('openapi_generation_failed', e?.message || e);
  process.exit(1);
});
