/**
 * Phase 16.9 - encrypted backups: deploy/scripts/backup.sh and restore-drill.sh with stand-in docker / aws / mongo tools.
 * (The D-33 acceptance file covers the unencrypted behaviour and is untouched; this covers what 16.9 adds.)
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(120_000);
const SCRIPTS = path.resolve(__dirname, '../../../deploy/scripts');
const MARKER = 'PATIENT-DIAGNOSIS-MARKER-diabetes-type-2';
const hasGpg = spawnSync('gpg', ['--version']).status === 0;
const d = hasGpg ? describe : describe.skip;

d('16.9 encrypted backups', () => {
  let work: string; let bin: string; let backups: string; let s3: string; let pass: string;

  const tool = (name: string, body: string) => fs.writeFileSync(path.join(bin, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  beforeEach(() => {
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-'));
    bin = path.join(work, 'bin'); backups = path.join(work, 'backups'); s3 = path.join(work, 's3');
    for (const p of [bin, backups, s3]) fs.mkdirSync(p);
    pass = path.join(work, 'passphrase');
    fs.writeFileSync(pass, `${'p'.repeat(40)}\n`, { mode: 0o400 });
    // docker exec <container> mongodump ...  -> the stand-in dump on stdout; mongorestore reads stdin to a file we can inspect
    tool('docker', `shift; [ "$1" = -i ] && shift; shift; cmd="$1"; shift; exec "$(dirname "$0")/$cmd" "$@"`);
    tool('mongodump', `printf '%s' "${MARKER}"`);
    tool('mongorestore', `cat > "${work}/restored.bin"`);
    tool('mongosh', `echo 12`);
    tool('aws', `if [ "$1" = s3 ] && [ "$2" = cp ]; then mkdir -p "${s3}/$(dirname "\${4#s3://}")"; cp "$3" "${s3}/\${4#s3://}"; fi`);
  });
  afterEach(() => fs.rmSync(work, { recursive: true, force: true }));

  const env = (extra: Record<string, string> = {}) => ({
    PATH: `${bin}:${process.env.PATH}`, HOME: work, NABD_ENV_FILE: '/dev/null', BACKUP_DIR: backups, DB_NAME: 'nabd_test',
    BACKUP_S3_ENDPOINT: 'https://private.example.test', BACKUP_S3_BUCKET: 'nabd-backups', BACKUP_S3_ACCESS_KEY_ID: 'k', BACKUP_S3_SECRET_ACCESS_KEY: 's', ...extra,
  });
  const run = (script: string, e: Record<string, string>) => spawnSync('bash', [path.join(SCRIPTS, script)], { env: e, encoding: 'utf8' });
  const files = (dir: string): string[] => fs.readdirSync(dir, { recursive: true } as any).map(String).filter((f) => fs.statSync(path.join(dir, f)).isFile());

  it('with a passphrase the kept and the uploaded copy are ciphertext, and no readable dump is left', () => {
    const r = run('backup.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass }));
    expect(r.status).toBe(0);
    const local = files(backups);
    expect(local).toHaveLength(1);
    expect(local[0]).toMatch(/^nabd_nabd_test_\d{8}-\d{6}\.gz\.gpg$/);
    const bytes = fs.readFileSync(path.join(backups, local[0]));
    expect(bytes.includes(Buffer.from(MARKER))).toBe(false);
    const uploaded = files(s3);
    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]).toMatch(/\.gz\.gpg$/);
    expect(fs.readFileSync(path.join(s3, uploaded[0])).includes(Buffer.from(MARKER))).toBe(false);
    expect(r.stdout + r.stderr).not.toContain('p'.repeat(40));
  });

  it('the restore drill decrypts it and the archive that reaches mongorestore is the original', () => {
    expect(run('backup.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass })).status).toBe(0);
    const r = run('restore-drill.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass }));
    expect(r.status).toBe(0);
    expect(fs.readFileSync(path.join(work, 'restored.bin'), 'utf8')).toBe(MARKER);
  });

  it('the drill fails clearly on an encrypted backup when the passphrase is missing or wrong', () => {
    expect(run('backup.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass })).status).toBe(0);
    const none = run('restore-drill.sh', env());
    expect(none.status).not.toBe(0);
    expect(none.stdout).toMatch(/encrypted but BACKUP_ENCRYPTION_PASSPHRASE_FILE is not set/);
    const wrong = path.join(work, 'wrong'); fs.writeFileSync(wrong, `${'w'.repeat(40)}\n`);
    expect(run('restore-drill.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: wrong })).status).not.toBe(0);
  });

  it('a tampered encrypted backup is rejected, not restored', () => {
    expect(run('backup.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass })).status).toBe(0);
    const f = path.join(backups, files(backups)[0]);
    const buf = fs.readFileSync(f); buf[buf.length - 10] ^= 0xff; fs.writeFileSync(f, buf);
    expect(run('restore-drill.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass })).status).not.toBe(0);
  });

  it('BACKUP_REQUIRE_ENCRYPTION=1 without a passphrase fails and keeps nothing readable', () => {
    const r = run('backup.sh', env({ BACKUP_REQUIRE_ENCRYPTION: '1' }));
    expect(r.status).not.toBe(0);
    expect(r.stdout).toMatch(/BACKUP_ENCRYPTION_PASSPHRASE_FILE is not set/);
    expect(files(backups)).toEqual([]);
    expect(files(s3)).toEqual([]);
  });

  it('a passphrase file that is too short or unreadable fails the backup', () => {
    fs.rmSync(pass);                                   // it was written read-only: a normal user cannot overwrite it
    fs.writeFileSync(pass, 'short\n', { mode: 0o400 });
    expect(run('backup.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: pass })).status).not.toBe(0);
    expect(files(backups)).toEqual([]);
    expect(run('backup.sh', env({ BACKUP_ENCRYPTION_PASSPHRASE_FILE: path.join(work, 'nope') })).status).not.toBe(0);
  });

  it('without any setting the old behaviour stays (readable dump, a warning) so the D-33 contract holds', () => {
    const r = run('backup.sh', env());
    expect(r.status).toBe(0);
    expect(files(backups)[0]).toMatch(/\.gz$/);
    expect(r.stdout).toMatch(/NOT encrypted/);
  });
});
