import { spawnSync } from 'child_process';
import { join } from 'path';

/**
 * The chunked test runner (`scripts/run-tests-chunked.mjs`) splits a chunk that dies of heap exhaustion into halves instead of failing the whole run (CI, 2026-11-17: chunk 5 died with "JavaScript heap
 * out of memory" although every file in it passes alone). It must NOT hide real failures: any other failure is reported as it is and never retried. The runner is an ES module, so it is exercised in a
 * node child process with a fake jest runner.
 */
describe('scripts/run-tests-chunked.mjs: heap exhaustion splits the chunk, real failures still fail', () => {
  const run = (body: string) => {
    const script = `import { runChunk } from ${JSON.stringify('file://' + join(__dirname, '../../scripts/run-tests-chunked.mjs'))};
      const calls = []; const silent = { error() {} };
      ${body}`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 30_000 });
    expect(r.status).toBe(0);
    return JSON.parse(r.stdout.trim());
  };

  it('a chunk that runs out of heap is run again as halves, every file still runs, and the run passes', () => {
    const out = run(`
      const fake = (files) => { calls.push(files.join(',')); return files.length > 2 ? { status: null, signal: 'SIGABRT', stderr: 'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory' } : { status: 0, stderr: '' }; };
      console.log(JSON.stringify({ failed: runChunk(['a','b','c','d','e'], [], '5', fake, silent), calls }));`);
    expect(out.failed).toBe(0);
    expect(out.calls).toEqual(['a,b,c,d,e', 'a,b,c', 'a,b', 'c', 'd,e']);
    expect(new Set(out.calls.filter((c: string) => !c.includes(',') || c.split(',').length <= 2).join(',').split(','))).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
  });

  it('a real test failure is reported as it is: no retry, no split', () => {
    const out = run(`
      const fake = (files) => { calls.push(files.join(',')); return { status: 1, stderr: 'Tests: 1 failed' }; };
      console.log(JSON.stringify({ failed: runChunk(['a','b'], [], 'x', fake, silent), calls }));`);
    expect(out).toEqual({ failed: 1, calls: ['a,b'] });
  });

  it('a single file that runs out of heap by itself still FAILS the run (nothing is skipped)', () => {
    const out = run(`
      const fake = (files) => { calls.push(files.join(',')); return { status: 134, stderr: 'JavaScript heap out of memory' }; };
      console.log(JSON.stringify({ failed: runChunk(['a'], [], 'y', fake, silent), calls }));`);
    expect(out).toEqual({ failed: 1, calls: ['a'] });
  });

  it('a chunk that fails after being split still counts every failing half', () => {
    const out = run(`
      const fake = (files) => { calls.push(files.join(',')); return files.length > 1 ? { status: null, signal: 'SIGABRT', stderr: '' } : { status: files[0] === 'b' ? 1 : 0, stderr: '' }; };
      console.log(JSON.stringify({ failed: runChunk(['a','b','c'], [], 'z', fake, silent), calls }));`);
    expect(out.failed).toBe(1);
    expect(out.calls).toContain('b');
  });
});
