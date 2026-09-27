/**
 * F27: emit openapi.json from the Nest Swagger document at build time.
 * Boots the app module without listening (no DB writes; providers that need
 * live infra fail soft because the document only needs route metadata).
 * Usage: npx ts-node -T scripts/generate-openapi.ts [out-path]
 */
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const { AppModule } = await import('../src/app.module');
  const { createNabdahOpenApiDocument } = await import('../src/config/openapi.config');
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.init();
    const document = createNabdahOpenApiDocument(app);
    const out = process.argv[2] || path.resolve(__dirname, '..', 'openapi.json');
    fs.writeFileSync(out, JSON.stringify(document, null, 2));
    const paths = Object.keys((document as any).paths || {}).length;
    console.log(JSON.stringify({ openapi: out, paths }));
  } finally {
    await app.close().catch(() => null);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('openapi_generation_failed', e?.message || e);
  process.exit(1);
});
