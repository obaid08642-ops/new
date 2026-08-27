const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const fs = require('fs');
async function main() {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27077, dbName: 'nabdah_e2e' } });
  const mongoUri = mongod.getUri('nabdah_e2e');
  // BullMQ queues need a REAL Redis — use an existing one on 6388 or spawn a local binary.
  // Resolution order: $REDIS_E2E_BIN → system redis-server → assume already running.
  const fsx = require('fs');
  const candidates = [process.env.REDIS_E2E_BIN, '/tmp/redis-bin/redis-server', 'redis-server'].filter(Boolean);
  let redisBin = null;
  for (const c of candidates) { try { fsx.accessSync(c, fsx.constants.X_OK); redisBin = c; break; } catch { /* next */ } }
  const redisEnv = { ...process.env, LD_LIBRARY_PATH: process.env.REDIS_E2E_LD || '/tmp/liblzf/usr/lib/x86_64-linux-gnu' };
  if (redisBin) {
    try { fsx.mkdirSync('/tmp/redis-data', { recursive: true }); } catch {}
    const redis = spawn(redisBin, ['--port', '6388', '--bind', '127.0.0.1', '--save', '', '--appendonly', 'no', '--dir', '/tmp/redis-data'], { env: redisEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    redis.stdout.on('data', (d) => fs.appendFileSync('/tmp/e2e/redis.log', d));
    redis.stderr.on('data', (d) => fs.appendFileSync('/tmp/e2e/redis.log', d));
  }
  // wait for redis to accept connections
  const net = require('net');
  for (let i = 0; i < 30; i++) {
    const ok = await new Promise((res) => { const s = net.connect(6388, '127.0.0.1'); s.on('connect', () => { s.end(); res(true); }); s.on('error', () => res(false)); });
    if (ok) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const env = { ...process.env,
    NODE_ENV: 'development', PORT: '4099',
    MONGO_URL: mongoUri, DB_NAME: 'nabdah_e2e',
    REDIS_HOST: '127.0.0.1', REDIS_PORT: '6388',
    JWT_SECRET: 'e2e-jwt-secret-0123456789abcdef', JWT_EXPIRES_IN: '1h',
    BCRYPT_ROUNDS: '4', ALLOWED_ORIGINS: '*', DISABLE_RATE_LIMIT: 'true',
    OTP_PROVIDER: 'mock', SENTRY_DSN: '',
    MOYASAR_API_KEY: 'sk_test_e2e_boot_only', MOYASAR_PUBLISHABLE_KEY: 'pk_test_e2e_boot_only',
    LIVEKIT_API_KEY: 'e2e_livekit_key', LIVEKIT_API_SECRET: 'e2e_livekit_secret_0123456789abcdef0123456789abcdef', LIVEKIT_URL: 'wss://livekit.e2e.local',
  };
  const app = spawn('node', ['/tmp/build-be/dist/main.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const log = (d) => { out += d; fs.appendFileSync('/tmp/e2e/backend.log', d); };
  app.stdout.on('data', log);
  app.stderr.on('data', (d) => { log(d); process.stderr.write(d); });
  const axios = require('axios');
  const base = 'http://127.0.0.1:4099';
  let up = false;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try { await axios.get(base + '/api/v1/seo/robots.txt', { timeout: 2000 }); up = true; break; }
    catch (e) { if (e.response) { up = true; break; } }
  }
  if (!up) { console.error('BOOT FAILED\n' + out.slice(-3000)); process.exit(1); }
  fs.writeFileSync('/tmp/e2e/boot.ok', mongoUri);
  console.log('READY');
}
main().catch((e) => { console.error(e); process.exit(1); });
