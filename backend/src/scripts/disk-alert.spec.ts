import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * 7B-B4: the disk alert must actually fire at 80% and stay quiet below it.
 * The script's only external dependency is `df`, so the test swaps in a fake
 * `df` on PATH that reports a chosen usage percentage — no real disk involved.
 */
describe('scripts/disk-alert.sh', () => {
  const SCRIPT = path.resolve(__dirname, '../../scripts/disk-alert.sh');

  const makeFakeDf = (pct: number) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-alert-'));
    const dfPath = path.join(dir, 'df');
    fs.writeFileSync(
      dfPath,
      `#!/bin/bash\n` +
        `echo "Filesystem     1024-blocks     Used Available Capacity Mounted on"\n` +
        `echo "/dev/sda1       1000000 ${pct}0000  $((100 - pct))0000      ${pct}% /"\n`,
    );
    fs.chmodSync(dfPath, 0o755);
    return dir;
  };

  const run = (env: Record<string, string> = {}) =>
    new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      execFile(
        'bash',
        [SCRIPT],
        { env: { ...process.env, ...env } },
        (error: any, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }),
      );
    });

  it('alerts (exit 1) when usage is at the 80% threshold', async () => {
    const binDir = makeFakeDf(80);
    const res = await run({ PATH: `${binDir}:${process.env.PATH}` });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('ALERT');
    expect(res.stderr).toContain('80%');
  });

  it('alerts (exit 1) when usage is above the 80% threshold', async () => {
    const binDir = makeFakeDf(95);
    const res = await run({ PATH: `${binDir}:${process.env.PATH}` });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('ALERT');
  });

  it('stays quiet (exit 0) when usage is below the 80% threshold', async () => {
    const binDir = makeFakeDf(42);
    const res = await run({ PATH: `${binDir}:${process.env.PATH}` });
    expect(res.code).toBe(0);
    expect(res.stderr).not.toContain('ALERT');
    expect(res.stdout).toContain('OK');
    expect(res.stdout).toContain('42%');
  });

  it('honours a custom DISK_ALERT_THRESHOLD', async () => {
    const binDir = makeFakeDf(60);
    const res = await run({ PATH: `${binDir}:${process.env.PATH}`, DISK_ALERT_THRESHOLD: '50' });
    expect(res.code).toBe(1);
    expect(res.stderr).toContain('ALERT');
  });

  it('fails closed (exit 2) when df is unavailable', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-alert-empty-'));
    const res = await run({ PATH: emptyDir });
    expect(res.code).toBe(2);
    expect(res.stderr).toContain('could not determine disk usage');
  });

  it('rejects a non-numeric threshold (exit 2)', async () => {
    const binDir = makeFakeDf(10);
    const res = await run({ PATH: `${binDir}:${process.env.PATH}`, DISK_ALERT_THRESHOLD: 'eighty' });
    expect(res.code).toBe(2);
  });
});
