// Harness for D-16 (reviewer-owned, part of the acceptance spec; do not edit).
// Starts the REAL compiled backend (`dist/main.js`, the production bootstrap: global prefix,
// URI versioning, ValidationPipe, helmet, all guards and every module) against an in-memory
// MongoDB and a throw-away local Redis, so a test talks to the whole app over HTTP.
// Several instances can share one database, like the production cluster workers.
import { spawn, spawnSync, ChildProcess } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import * as net from 'net';
import * as path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

const BACKEND = path.resolve(__dirname, '../..');
// Generated per run: a test server secret, never a fixed literal in the repo.
export const JWT_SECRET = randomBytes(24).toString('hex');
export const ADMIN_DEVICE = 'acceptance-admin-device-0001';

const freePort = () => new Promise<number>((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as net.AddressInfo).port; s.close(() => resolve(p)); });
});

export class LiveStack {
  mongo!: MongoMemoryServer;
  conn!: Connection;
  db!: any;
  redis!: ChildProcess;
  redisPort!: number;
  servers: Array<{ proc: ChildProcess; url: string; log: string[] }> = [];

  /** Builds the backend once (the acceptance runner does not build). */
  static build() {
    const r = spawnSync('npx', ['nest', 'build'], { cwd: BACKEND, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('nest build failed');
  }

  async start(instances = 1) {
    this.redisPort = await freePort();
    this.redis = spawn('redis-server', ['--port', String(this.redisPort), '--save', '', '--appendonly', 'no'], { stdio: 'ignore' });
    this.mongo = await MongoMemoryServer.create();
    this.conn = await mongoose.createConnection(this.mongo.getUri(), { dbName: 'nabd_acceptance' }).asPromise();
    this.db = this.conn.db;
    for (let i = 0; i < instances; i++) this.servers.push(await this.spawnServer());
  }

  private async spawnServer() {
    const port = await freePort();
    const log: string[] = [];
    const proc = spawn('node', ['dist/main.js'], {
      cwd: BACKEND,
      env: {
        ...process.env,
        NODE_ENV: 'test', CLUSTER_MODE: 'false', PORT: String(port),
        MONGO_URL: this.mongo.getUri(), DB_NAME: 'nabd_acceptance',
        REDIS_URL: `redis://127.0.0.1:${this.redisPort}`,
        JWT_SECRET, JWT_REFRESH_SECRET: `${JWT_SECRET}-refresh`,
        MONGO_MIN_POOL_SIZE: '1', MONGO_MAX_POOL_SIZE: '20',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout!.on('data', (d) => log.push(String(d)));
    proc.stderr!.on('data', (d) => log.push(String(d)));
    const url = `http://127.0.0.1:${port}`;
    const until = Date.now() + 120_000;
    for (;;) {
      if (proc.exitCode !== null) throw new Error(`backend exited early:\n${log.join('').slice(-4000)}`);
      try { const r = await fetch(`${url}/api/health/liveness`); if (r.status < 500) break; } catch { /* not up yet */ }
      if (Date.now() > until) throw new Error(`backend did not start:\n${log.join('').slice(-4000)}`);
      await new Promise((r) => setTimeout(r, 500));
    }
    return { proc, url, log };
  }

  async stop() {
    for (const s of this.servers) s.proc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    await this.conn?.close();
    await this.mongo?.stop();
    this.redis?.kill();
  }

  /** A patient user and a token shaped like auth.service issues. */
  async patient(id = 'pat-1') {
    await this.db.collection('users').updateOne({ id }, { $set: { id, full_name: 'Test Patient', role: 'patient', active: true } }, { upsert: true });
    return new JwtService({ secret: JWT_SECRET }).sign({ id, sub: id, role: 'patient' });
  }

  /** An admin with an enrolled device and a live idle-session record (C2, C5). */
  async admin(id = 'adm-1') {
    await this.db.collection('users').updateOne({ id }, { $set: { id, full_name: 'Admin', role: 'super_admin', active: true } }, { upsert: true });
    await this.db.collection('admin_devices').updateOne(
      { user_id: id }, { $set: { user_id: id, device_hash: createHash('sha256').update(ADMIN_DEVICE).digest('hex'), revoked: false } }, { upsert: true });
    const r = new Redis(this.redisPort, '127.0.0.1');
    await r.set(`admin_activity:${id}`, String(Date.now()), 'EX', 900);
    r.disconnect();
    return new JwtService({ secret: JWT_SECRET }).sign({ id, sub: id, role: 'super_admin' });
  }

  async call(i: number, method: string, p: string, token?: string, body?: unknown) {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': `acc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}` };
    if (token) { headers.authorization = `Bearer ${token}`; headers['x-admin-device'] = ADMIN_DEVICE; }
    const res = await fetch(`${this.servers[i].url}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  }
}
