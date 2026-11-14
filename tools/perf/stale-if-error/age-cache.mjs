// Makes every cached page entry look `hours` old (default 2), as if its revalidate window had passed: the next request gets the old copy
// and Next tries to rebuild it in the background. Uses the cache handler's own codec, so the entries stay valid.
//   node age-cache.mjs redis://127.0.0.1:6390 [hours]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = new URL("../../../patient-web/", import.meta.url).pathname;
const { createClient, commandOptions } = require(`${root}node_modules/redis`);
const handler = require(`${root}cache-handler.cjs`);

const c = createClient({ url: process.argv[2] });
await c.connect();
let aged = 0;
for await (const key of c.scanIterator({ MATCH: "*:e:*", COUNT: 500 })) {
  const k = Array.isArray(key) ? key[0] : key;
  const stored = await c.get(commandOptions({ returnBuffers: true }), k);
  if (!stored) continue;
  const entry = handler.unpack(stored);
  entry.lastModified = Date.now() - Number(process.argv[3] || 2) * 3_600_000;
  await c.set(k, handler.pack(entry), { KEEPTTL: true });
  aged += 1;
}
console.log(`aged ${aged} cache entries`);
await c.quit();
