// ACCEPTANCE — D-33 backups and restore drill (owner decision 33, after incident 2026-10-08 public backups). Written by
// the reviewer before the work; the implementing session makes it pass and may not edit it.
//
// Decision 33:
//   - The nightly mongodump stays on the server for 14 days.
//   - An off-server copy goes ONLY to a separate, private bucket (`BACKUP_S3_*` settings: its own endpoint, bucket and
//     key), never to `S3_BUCKET` (the public CDN bucket, incident 83cd8bba). Off-server copies expire after 30 days.
//   - The medicine catalogue also gets a weekly separate export: JSON plus the image list.
//   - A monthly restore test proves the backups work (`restore-drill.sh` on a scratch database).
//   - Every run is reported to the admin page (D-34): POST <BACKUP_REPORT_URL>/api/v1/ops/backup-runs with
//     `Authorization: Bearer <BACKUP_REPORT_TOKEN>` and { kind: 'local'|'offsite'|'restore_test'|'catalogue_export',
//     ok, size_bytes?, finished_at, error? }.
//
// The real scripts in deploy/scripts run under bash. The tools they call on the server are stand-ins on PATH, written
// by this file: `docker` (forwards `docker exec <container> <cmd> …` to the stand-in of <cmd>), `mongodump`,
// `mongoexport`, `mongorestore`, `mongosh`/`mongo`, and `aws` (copies `s3 cp` uploads into a local folder and records
// every call with the credentials it saw). Reports go to a local HTTP server.
//
// Contract for the scripts (env, all optional except where a test sets them):
//   NABD_ENV_FILE   env file to source instead of deploy/.env.production (missing file is fine when set to /dev/null).
//   BACKUP_DIR      local backup folder (default /opt/nabdah/backups).
//   BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY: the private bucket.
//   BACKUP_REPORT_URL, BACKUP_REPORT_TOKEN: where runs are reported.
// Files:
//   deploy/scripts/backup.sh            local dump (+14-day local retention) and the off-server copy.
//   deploy/scripts/catalogue-export.sh  medicines JSON + image list to the private bucket (`catalogue/` prefix).
//   deploy/scripts/restore-drill.sh     as today, plus its report.
//   deploy/scripts/backup-bucket-lifecycle.sh  sets a 30-day expiry on the private bucket (aws s3api).
//   deploy/cron/nabd-backups            the schedule: backup daily, catalogue weekly, restore drill monthly.
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { AddressInfo } from 'net';
import { randomBytes } from 'crypto';

jest.setTimeout(300_000);

const REPO = path.resolve(__dirname, '../../..');
const SCRIPTS = path.join(REPO, 'deploy/scripts');
const DAY = 86_400_000;

const SECRETS = {
  BACKUP_S3_SECRET_ACCESS_KEY: randomBytes(20).toString('hex'),
  BACKUP_REPORT_TOKEN: randomBytes(24).toString('hex'),
  MONGO_ROOT_PASSWORD: randomBytes(12).toString('hex'),
  S3_SECRET_ACCESS_KEY: randomBytes(20).toString('hex'),
};
const BACKUP_KEY_ID = `bk-${randomBytes(6).toString('hex')}`;
const PUBLIC_KEY_ID = `pub-${randomBytes(6).toString('hex')}`;

// ───────────────────────────── stand-in tools ─────────────────────────────
let work = '';
let bin = '';
let s3dir = '';
let log = '';
let backupDir = '';

const MEDICINES = [
  { id: 'med-1', name_ar: 'دواء ١', image: 'https://cdn.nabd.plus/medicines/1.jpg' },
  { id: 'med-2', name_ar: 'دواء ٢', images: ['https://cdn.nabd.plus/medicines/2a.jpg', 'https://cdn.nabd.plus/medicines/2b.jpg'], image_1: 'https://cdn.nabd.plus/medicines/2c.jpg' },
  { id: 'med-3', name_ar: 'دواء ٣' },
];

function writeTool(name: string, body: string) {
  const p = path.join(bin, name);
  fs.writeFileSync(p, `#!/bin/bash\n${body}\n`, { mode: 0o755 });
}
function installTools() {
  // every call: one JSON line with the tool, its argv and the credentials it could see
  const record = `node -e 'const fs=require("fs");fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({tool:process.argv[1],args:process.argv.slice(2),key:process.env.AWS_ACCESS_KEY_ID||"",secret:process.env.AWS_SECRET_ACCESS_KEY||""})+"\\n")' "$(basename "$0")" "$@"`;
  writeTool('docker', `${record}
if [ "$1" = inspect ]; then   # the one-off dump reads the image, network and address of the mongodb container
  case "$*" in *IPAddress*) echo 10.0.0.2;; *Config.Image*) echo mongo:7.0;; *Networks*) echo internal;; esac; exit 0
fi
if [ "$1" = run ]; then   # docker run <flags> <image> mongodump ...: the one-off container runs the stand-in
  shift; while [ $# -gt 0 ] && [ "$1" != mongodump ]; do shift; done; cmd="$1"; shift; exec "$(dirname "$0")/$cmd" "$@"
fi
[ "$1" = exec ] || exit 0
shift
while [ $# -gt 0 ] && [ "\${1#-}" != "$1" ]; do case "$1" in -e|-u|-w) shift 2;; *) shift;; esac; done
shift # container
cmd="$1"; shift
exec "$(dirname "$0")/$cmd" "$@"`);
  writeTool('mongodump', `${record}
out=""
for a in "$@"; do case "$a" in --archive=*) out="\${a#--archive=}";; esac; done
data="FAKE-MONGO-ARCHIVE-$(date +%s%N)-$RANDOM$RANDOM"
if [ -n "$out" ]; then printf '%s' "$data" > "$out"; else printf '%s' "$data"; fi`);
  writeTool('mongoexport', `${record}
out=""
for a in "$@"; do case "$a" in --out=*) out="\${a#--out=}";; esac; done
prev=""; for a in "$@"; do [ "$prev" = "--out" ] || [ "$prev" = "-o" ] && out="$a"; prev="$a"; done
data='${MEDICINES.map((m) => JSON.stringify(m)).join('\\n')}'
if printf '%s ' "$@" | grep -q -- '--jsonArray'; then data="[$(printf '%b' "$data" | paste -sd, -)]"; fi
if [ -n "$out" ]; then printf '%b\\n' "$data" > "$out"; else printf '%b\\n' "$data"; fi`);
  writeTool('mongorestore', `${record}
[ "\${FAKE_RESTORE_FAIL:-0}" = 1 ] && exit 1
exit 0`);
  writeTool('mongosh', `${record}
if printf '%s ' "$@" | grep -q dropDatabase; then exit 0; fi
echo "\${FAKE_RESTORED_COLLECTIONS:-12}"`);
  writeTool('mongo', `exec "$(dirname "$0")/mongosh" "$@"`);
  writeTool('aws', `${record}
[ "\${FAKE_AWS_FAIL:-0}" = 1 ] && { echo "upload failed" >&2; exit 1; }
if [ "$1" = s3 ] && [ "$2" = cp ]; then
  src="$3"; dst="$4"
  case "$dst" in s3://*) rel="\${dst#s3://}"; mkdir -p "$FAKE_S3/$(dirname "$rel")"; cp "$src" "$FAKE_S3/$rel";; esac
fi
exit 0`);
}

// ───────────────────────────── report receiver ─────────────────────────────
type Report = { auth: string; body: any };
const reports: Report[] = [];
let server: http.Server;
let reportUrl = '';

function env(extra: Record<string, string> = {}) {
  return {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: work,
    FAKE_LOG: log,
    FAKE_S3: s3dir,
    NABD_ENV_FILE: '/dev/null',
    BACKUP_DIR: backupDir,
    DB_NAME: 'nabd_nestjs',
    MONGO_ROOT_USER: 'root',
    MONGO_ROOT_PASSWORD: SECRETS.MONGO_ROOT_PASSWORD,
    MONGO_URL: 'mongodb://127.0.0.1:27017',
    // the PUBLIC CDN bucket: must never receive a backup
    S3_ENDPOINT: 'https://public-cdn.example.test',
    S3_BUCKET: 'nabd-cdn-public',
    S3_ACCESS_KEY_ID: PUBLIC_KEY_ID,
    S3_SECRET_ACCESS_KEY: SECRETS.S3_SECRET_ACCESS_KEY,
    // the private backup bucket
    BACKUP_S3_ENDPOINT: 'https://private-backups.example.test',
    BACKUP_S3_BUCKET: 'nabd-backups',
    BACKUP_S3_ACCESS_KEY_ID: BACKUP_KEY_ID,
    BACKUP_S3_SECRET_ACCESS_KEY: SECRETS.BACKUP_S3_SECRET_ACCESS_KEY,
    BACKUP_REPORT_URL: reportUrl,
    BACKUP_REPORT_TOKEN: SECRETS.BACKUP_REPORT_TOKEN,
    ...extra,
  };
}
/** Async on purpose: the report receiver lives in this process, so the event loop must keep running. */
function run(script: string, extra: Record<string, string> = {}): Promise<{ status: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn('bash', [path.join(SCRIPTS, script)], { env: env(extra) });
    let out = '';
    child.stdout.on('data', (d) => { out += String(d); });
    child.stderr.on('data', (d) => { out += String(d); });
    const timer = setTimeout(() => child.kill('SIGKILL'), 120_000);
    child.on('close', (status) => { clearTimeout(timer); resolve({ status, out }); });
  });
}
const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const awsCalls = () => calls().filter((c) => c.tool === 'aws');
const reportsOf = (kind: string) => reports.filter((r) => r.body?.kind === kind);
function filesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? filesUnder(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
function reset() {
  reports.length = 0;
  fs.writeFileSync(log, '');
  fs.rmSync(s3dir, { recursive: true, force: true });
  fs.mkdirSync(s3dir, { recursive: true });
}

beforeAll(async () => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'd33-'));
  bin = path.join(work, 'bin');
  s3dir = path.join(work, 's3');
  backupDir = path.join(work, 'backups');
  log = path.join(work, 'calls.log');
  fs.mkdirSync(bin);
  fs.mkdirSync(backupDir);
  installTools();
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/api/v1/ops/backup-runs') {
        let body: any = null;
        try { body = JSON.parse(raw); } catch { body = raw; }
        reports.push({ auth: String(req.headers.authorization || ''), body });
        res.writeHead(201, { 'content-type': 'application/json' }).end('{"ok":true}');
      } else res.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  reportUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server?.close();
  fs.rmSync(work, { recursive: true, force: true });
});
beforeEach(() => reset());

describe('D-33 backups and restore drill', () => {
  it('1. the nightly backup keeps a local copy and uploads it to the PRIVATE bucket with its own key, never to S3_BUCKET', async () => {
    const r = await run('backup.sh');
    expect(r.status).toBe(0);
    const local = fs.readdirSync(backupDir).filter((f) => /^nabd_.*\.gz$/.test(f));
    expect(local.length).toBeGreaterThan(0);

    const uploads = awsCalls().filter((c) => c.args[0] === 's3' && c.args[1] === 'cp');
    expect(uploads.length).toBeGreaterThan(0);
    for (const c of uploads) {
      expect(c.args.join(' ')).toContain('s3://nabd-backups/');
      expect(c.args.join(' ')).toContain('https://private-backups.example.test');
      expect(c.key).toBe(BACKUP_KEY_ID);
    }
    for (const c of awsCalls()) {
      expect(c.args.join(' ')).not.toContain('nabd-cdn-public');
      expect(c.args.join(' ')).not.toContain('public-cdn.example.test');
      expect(c.key).not.toBe(PUBLIC_KEY_ID);
    }
    // the uploaded object is the local archive
    const uploaded = filesUnder(path.join(s3dir, 'nabd-backups'));
    expect(uploaded.length).toBe(1);
    const newest = local.sort().pop()!;
    expect(fs.readFileSync(uploaded[0], 'utf8')).toBe(fs.readFileSync(path.join(backupDir, newest), 'utf8'));
  });

  it('2. both runs are reported to the admin page with the report token', async () => {
    await run('backup.sh');
    for (const kind of ['local', 'offsite']) {
      const r = reportsOf(kind);
      expect(r.length).toBe(1);
      expect(r[0].auth).toBe(`Bearer ${SECRETS.BACKUP_REPORT_TOKEN}`);
      expect(r[0].body.ok).toBe(true);
      expect(Number(r[0].body.size_bytes)).toBeGreaterThan(0);
      expect(Date.parse(r[0].body.finished_at)).toBeGreaterThan(Date.now() - 10 * 60_000);
    }
  });

  it('3. a failed upload is reported as a failed off-server run and the script exits non-zero', async () => {
    const r = await run('backup.sh', { FAKE_AWS_FAIL: '1' });
    expect(r.status).not.toBe(0);
    const off = reportsOf('offsite');
    expect(off.length).toBe(1);
    expect(off[0].body.ok).toBe(false);
    expect(reportsOf('local')[0]?.body.ok).toBe(true);
  });

  it('4. it refuses to upload when the backup bucket is the public bucket, or when the private bucket is not configured', async () => {
    const same = await run('backup.sh', { BACKUP_S3_BUCKET: 'nabd-cdn-public' });
    expect(same.status).not.toBe(0);
    expect(awsCalls().filter((c) => c.args[0] === 's3' && c.args[1] === 'cp')).toHaveLength(0);
    expect(reportsOf('offsite')[0]?.body.ok).toBe(false);

    reset();
    const none = await run('backup.sh', { BACKUP_S3_BUCKET: '', BACKUP_S3_ENDPOINT: '', BACKUP_S3_ACCESS_KEY_ID: '', BACKUP_S3_SECRET_ACCESS_KEY: '' });
    expect(none.status).not.toBe(0);
    expect(awsCalls()).toHaveLength(0);
    expect(reportsOf('offsite')[0]?.body.ok).toBe(false);
  });

  it('5. local copies are kept 14 days', async () => {
    const old = path.join(backupDir, 'nabd_nabd_nestjs_20200101-030000.gz');
    const recent = path.join(backupDir, 'nabd_nabd_nestjs_20200102-030000.gz');
    fs.writeFileSync(old, 'old');
    fs.writeFileSync(recent, 'recent');
    const t = (ms: number) => new Date(Date.now() - ms);
    fs.utimesSync(old, t(16 * DAY), t(16 * DAY));
    fs.utimesSync(recent, t(3 * DAY), t(3 * DAY));
    expect((await run('backup.sh')).status).toBe(0);
    expect(fs.existsSync(old)).toBe(false);
    expect(fs.existsSync(recent)).toBe(true);
  });

  it('6. the weekly catalogue export uploads the medicines JSON and every image URL to the private bucket', async () => {
    const r = await run('catalogue-export.sh');
    expect(r.status).toBe(0);
    const files = filesUnder(path.join(s3dir, 'nabd-backups'));
    expect(files.every((f) => f.includes(`${path.sep}catalogue${path.sep}`))).toBe(true);
    const json = files.find((f) => f.endsWith('.json'));
    const list = files.find((f) => !f.endsWith('.json'));
    expect(json).toBeDefined();
    expect(list).toBeDefined();
    const ids = fs.readFileSync(json!, 'utf8').match(/med-[0-9]/g) || [];
    expect(new Set(ids)).toEqual(new Set(['med-1', 'med-2', 'med-3']));
    const images = fs.readFileSync(list!, 'utf8');
    for (const url of ['1.jpg', '2a.jpg', '2b.jpg', '2c.jpg']) expect(images).toContain(`https://cdn.nabd.plus/medicines/${url}`);
    for (const c of awsCalls()) expect(c.args.join(' ')).not.toContain('nabd-cdn-public');
    const rep = reportsOf('catalogue_export');
    expect(rep.length).toBe(1);
    expect(rep[0].body.ok).toBe(true);
  });

  it('7. the restore drill reports its result, pass and fail', async () => {
    fs.writeFileSync(path.join(backupDir, `nabd_nabd_nestjs_${Date.now()}.gz`), 'FAKE');
    const ok = await run('restore-drill.sh', { DISK_THRESHOLD_PCT: '100' });
    expect(ok.status).toBe(0);
    expect(reportsOf('restore_test')[0]?.body.ok).toBe(true);

    reset();
    const bad = await run('restore-drill.sh', { DISK_THRESHOLD_PCT: '100', FAKE_RESTORED_COLLECTIONS: '0' });
    expect(bad.status).not.toBe(0);
    expect(reportsOf('restore_test')[0]?.body.ok).toBe(false);
  });

  it('8. off-server copies expire after 30 days (bucket lifecycle on the private bucket)', async () => {
    const r = await run('backup-bucket-lifecycle.sh');
    expect(r.status).toBe(0);
    const call = awsCalls().find((c) => c.args.includes('put-bucket-lifecycle-configuration'));
    expect(call).toBeDefined();
    const text = call!.args.join(' ');
    expect(text).toContain('nabd-backups');
    expect(text).toMatch(/"Days"\s*:\s*30/);
    expect(call!.key).toBe(BACKUP_KEY_ID);
  });

  it('9. the schedule: backup daily, catalogue export weekly, restore drill monthly', async () => {
    const cron = fs.readFileSync(path.join(REPO, 'deploy/cron/nabd-backups'), 'utf8').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
    const line = (script: string) => cron.find((l) => l.includes(script));
    const fields = (l?: string) => (l || '').trim().split(/\s+/).slice(0, 5);
    const [, , domB, , dowB] = fields(line('backup.sh'));
    expect(domB).toBe('*');
    expect(dowB).toBe('*');
    const [, , domC, , dowC] = fields(line('catalogue-export.sh'));
    expect(domC).toBe('*');
    expect(dowC).toMatch(/^[0-7]$/);
    const [, , domR, , dowR] = fields(line('restore-drill.sh'));
    expect(domR).toMatch(/^([1-9]|1[0-9]|2[0-8])$/);
    expect(dowR).toBe('*');
  });

  it('10. no script prints a secret', async () => {
    fs.writeFileSync(path.join(backupDir, `nabd_nabd_nestjs_${Date.now()}.gz`), 'FAKE');
    const outs = [await run('backup.sh'), await run('backup.sh', { FAKE_AWS_FAIL: '1' }), await run('catalogue-export.sh'), await run('restore-drill.sh', { DISK_THRESHOLD_PCT: '100' }), await run('backup-bucket-lifecycle.sh')].map((r) => r.out).join('\n');
    for (const value of Object.values(SECRETS)) expect(outs).not.toContain(value);
    for (const r of reports) expect(JSON.stringify(r.body)).not.toContain(SECRETS.BACKUP_S3_SECRET_ACCESS_KEY);
  });
});
