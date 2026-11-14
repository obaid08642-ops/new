import * as net from 'net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ClamavService } from './clamav.service';
import { ObjectStore, PendingScanService } from './pending-scan.service';

const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/** A stand-in clamd: PING -> PONG, INSTREAM -> OK, or FOUND for the EICAR test string. It can be switched off and on again. */
class FakeClamd {
  private server?: net.Server;
  port = 0;
  scans = 0;
  async start(): Promise<void> {
    this.server = net.createServer((socket) => {
      let buf = Buffer.alloc(0);
      let cmd: string | null = null;
      socket.on('data', (c) => {
        buf = Buffer.concat([buf, c]);
        if (cmd === null) {
          const nul = buf.indexOf(0);
          if (nul < 0) return;
          cmd = buf.subarray(0, nul).toString();
          buf = buf.subarray(nul + 1);
          if (cmd === 'zPING') { socket.end('PONG\0'); return; }
        }
        const parts: Buffer[] = [];
        let off = 0;
        while (buf.length - off >= 4) {
          const len = buf.readUInt32BE(off);
          if (len === 0) {
            this.scans += 1;
            socket.end((Buffer.concat(parts).toString('latin1').includes(EICAR) ? 'stream: Eicar-Test-Signature FOUND' : 'stream: OK') + '\0');
            return;
          }
          if (buf.length - off - 4 < len) return;
          parts.push(buf.subarray(off + 4, off + 4 + len));
          off += 4 + len;
        }
      });
    });
    await new Promise<void>((r) => this.server!.listen(this.port, '127.0.0.1', () => { this.port = (this.server!.address() as net.AddressInfo).port; r(); }));
  }
  async stop(): Promise<void> {
    const s = this.server;
    this.server = undefined;
    if (s) await new Promise<void>((r) => { s.close(() => r()); (s as any).closeAllConnections?.(); });
  }
}

class MemStore implements ObjectStore {
  objects = new Map<string, Buffer>();
  onCopy?: () => Promise<void>;
  async get(key: string) { const b = this.objects.get(key); if (!b) throw new Error(`NoSuchKey ${key}`); return b; }
  async copy(from: string, to: string) { await this.onCopy?.(); this.objects.set(to, await this.get(from)); }
  async delete(key: string) { this.objects.delete(key); }
}

describe('PendingScanService (UPLOAD_SCAN=defer)', () => {
  let mongod: MongoMemoryServer;
  let clamd: FakeClamd;
  let store: MemStore;
  let svc: PendingScanService;
  const env = { ...process.env };
  const media = () => mongoose.connection.collection('media_assets');
  const objects = () => mongoose.connection.collection('storage_objects');
  let seq = 0;
  const addMedia = async (key: string, bytes: Buffer | string, extra: Record<string, unknown> = {}) => {
    store.objects.set(key, Buffer.from(bytes));
    const id = `m${++seq}`;
    await media().insertOne({ id, key, owner_id: 'pat-1', purpose: 'report', scan_status: 'pending_scan', createdAt: new Date(Date.now() + seq), ...extra });
    return id;
  };
  const addObject = async (key: string, bytes: Buffer | string) => {
    store.objects.set(key, Buffer.from(bytes));
    const id = `s${++seq}`;
    await objects().insertOne({ id, external_key: key, external_url: `https://cdn.example.test/bucket/${key}`, owner_account_id: 'pat-1', scan_status: 'pending_scan', deleted: false, createdAt: new Date(Date.now() + seq) });
    return id;
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'pending_scan' });
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
  beforeEach(async () => {
    await media().deleteMany({}); await objects().deleteMany({});
    store = new MemStore();
    clamd = new FakeClamd();
    await clamd.start();
    process.env.CLAMD_HOST = '127.0.0.1'; process.env.CLAMD_PORT = String(clamd.port); delete process.env.CLAMD_SOCKET;
    svc = new PendingScanService(mongoose.connection as never, new ClamavService(), store);
  });
  afterEach(async () => { await clamd.stop(); process.env = { ...env }; });

  it('a file that passes is moved to its final key, the row points at it, and the quarantined copy is gone', async () => {
    const mid = await addMedia('pending/report/pat-1/a.png', 'png-bytes');
    const sid = await addObject('pending/uuid-doc.pdf', 'pdf-bytes');
    const out = await svc.runOnce();
    expect(out).toMatchObject({ scanned: 2, clean: 2, infected: 0, released: 0, scanner_up: true });
    expect(await media().findOne({ id: mid })).toMatchObject({ key: 'report/pat-1/a.png', scan_status: 'clean' });
    expect(await objects().findOne({ id: sid })).toMatchObject({ external_key: 'uuid-doc.pdf', external_url: 'https://cdn.example.test/bucket/uuid-doc.pdf', scan_status: 'clean' });
    expect([...store.objects.keys()].sort()).toEqual(['report/pat-1/a.png', 'uuid-doc.pdf']);
  });

  it('an infected file is deleted: the object is gone, a media row is removed, a storage row is flagged and hidden', async () => {
    const mid = await addMedia('pending/report/pat-1/bad.png', `junk ${EICAR} junk`);
    const sid = await addObject('pending/uuid-bad.pdf', EICAR);
    const out = await svc.runOnce();
    expect(out).toMatchObject({ scanned: 2, infected: 2, clean: 0 });
    expect(store.objects.size).toBe(0);
    expect(await media().findOne({ id: mid })).toBeNull();
    expect(await objects().findOne({ id: sid })).toMatchObject({ scan_status: 'infected', deleted: true });
  });

  it('while the scanner does not answer nothing changes: the files stay in quarantine and unreadable', async () => {
    const mid = await addMedia('pending/report/pat-1/a.png', 'png-bytes');
    await clamd.stop();
    const out = await svc.runOnce();
    expect(out).toMatchObject({ scanned: 0, scanner_up: false });
    expect(await media().findOne({ id: mid })).toMatchObject({ key: 'pending/report/pat-1/a.png', scan_status: 'pending_scan' });
    expect(store.objects.has('pending/report/pat-1/a.png')).toBe(true);
    // and the scanner coming back later is enough
    const again = new FakeClamd(); again.port = clamd.port; await again.start();
    try {
      process.env.CLAMD_PORT = String(again.port);
      const later = new PendingScanService(mongoose.connection as never, new ClamavService(), store);
      expect(await later.runOnce()).toMatchObject({ scanned: 1, clean: 1 });
    } finally { await again.stop(); }
  });

  it('a scanner that stops answering half-way releases the file it held and stops', async () => {
    const a = await addMedia('pending/report/pat-1/a.png', 'a');
    const b = await addMedia('pending/report/pat-1/b.png', 'b');
    const clamav: any = { scannerUp: async () => true, scan: jest.fn().mockResolvedValueOnce({ status: 'clean' }).mockResolvedValue({ status: 'unavailable', reason: 'clamd_timeout' }) };
    const worker = new PendingScanService(mongoose.connection as never, clamav, store);
    expect(await worker.runOnce()).toMatchObject({ scanned: 2, clean: 1, released: 1 });
    expect(await media().findOne({ id: a })).toMatchObject({ scan_status: 'clean' });
    expect(await media().findOne({ id: b })).toMatchObject({ scan_status: 'pending_scan', key: 'pending/report/pat-1/b.png' });
  });

  it('two workers never scan the same file twice, and the oldest upload goes first', async () => {
    const first = await addMedia('pending/report/pat-1/first.png', 'first');
    await addMedia('pending/report/pat-1/second.png', 'second');
    const other = new PendingScanService(mongoose.connection as never, new ClamavService(), store);
    const [x, y] = await Promise.all([svc.runOnce({ max: 1 }), other.runOnce({ max: 1 })]);
    expect(x.scanned + y.scanned).toBe(2); // one each, never both on the same row
    expect(clamd.scans).toBe(2);
    expect(await media().countDocuments({ scan_status: 'clean' })).toBe(2);
    expect(await media().findOne({ id: first })).toMatchObject({ key: 'report/pat-1/first.png' });
  });

  it('a claim older than 10 minutes (a crashed worker) is taken over; a fresh one is left alone', async () => {
    const stale = await addMedia('pending/report/pat-1/stale.png', 's', { scan_status: 'scanning', scan_claimed_at: new Date(Date.now() - 11 * 60_000) });
    const fresh = await addMedia('pending/report/pat-1/fresh.png', 'f', { scan_status: 'scanning', scan_claimed_at: new Date() });
    expect(await svc.runOnce()).toMatchObject({ scanned: 1, clean: 1 });
    expect(await media().findOne({ id: stale })).toMatchObject({ scan_status: 'clean' });
    expect(await media().findOne({ id: fresh })).toMatchObject({ scan_status: 'scanning' });
  });

  it('a file whose row was deleted while it was being scanned leaves no copy behind', async () => {
    const mid = await addMedia('pending/report/pat-1/gone.png', 'g');
    store.onCopy = async () => { await media().deleteOne({ id: mid }); };
    expect(await svc.runOnce()).toMatchObject({ scanned: 1 });
    expect(store.objects.size).toBe(0);
  });

  it('an object that cannot be read is released for the next run, not marked clean', async () => {
    const mid = await addMedia('pending/report/pat-1/missing.png', 'x');
    store.objects.delete('pending/report/pat-1/missing.png');
    expect(await svc.runOnce()).toMatchObject({ scanned: 1, released: 1, clean: 0 });
    expect(await media().findOne({ id: mid })).toMatchObject({ scan_status: 'pending_scan' });
  });

  it('works through at most `max` files per run', async () => {
    for (let i = 0; i < 4; i++) await addMedia(`pending/report/pat-1/${i}.png`, String(i));
    expect(await svc.runOnce({ max: 3 })).toMatchObject({ scanned: 3, clean: 3 });
    expect(await media().countDocuments({ scan_status: 'pending_scan' })).toBe(1);
  });

  it('rows from before the deferral (no scan_status) are never touched', async () => {
    await media().insertOne({ id: 'old', key: 'report/pat-1/old.png', owner_id: 'pat-1', purpose: 'report', createdAt: new Date() });
    expect(await svc.runOnce()).toMatchObject({ scanned: 0, scanner_up: true });
  });
});
