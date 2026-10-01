"""Type-check an app with every `// @ts-nocheck` removed (in a temporary copy; the repo is not touched).

  python3 tools/audit/nocheck_tsc.py patient-app        (or provider-app)

186 patient-app files start with `// @ts-nocheck`, so `tsc --noEmit` reported 0 errors while screens used names
that were never imported (logError, apiFetch, TextInput), imported hooks a module does not export, and read
variables before their declaration. Each of those is a ReferenceError/TypeError at runtime: a white screen.

Exit 1 when any runtime-fatal error remains (FATAL codes below); the full error count is printed too, so the
nocheck removal (R46) can be tracked to zero.
"""
import os, re, shutil, subprocess, sys, tempfile, collections

FATAL = {
    'TS2304': 'cannot find name',
    'TS2552': 'cannot find name (did you mean)',
    'TS2448': 'block-scoped variable used before its declaration',
    'TS2454': 'variable used before being assigned',
    'TS2459': 'module declares the name locally but does not export it',
    'TS2305': 'module has no exported member',
    'TS2614': 'module has no exported member (default import)',
    'TS2724': 'module has no exported member (did you mean)',
}
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def main():
    app = sys.argv[1] if len(sys.argv) > 1 else 'patient-app'
    src = os.path.join(ROOT, app)
    tmp = tempfile.mkdtemp(prefix=f'nocheck-{app}-')
    try:
        shutil.copytree(src, os.path.join(tmp, app), ignore=shutil.ignore_patterns('node_modules', '.expo', 'dist', 'web-build'))
        work = os.path.join(tmp, app)
        os.symlink(os.path.join(src, 'node_modules'), os.path.join(work, 'node_modules'))
        n = 0
        for dp, dirs, fs in os.walk(work):
            dirs[:] = [d for d in dirs if d != 'node_modules']
            for f in fs:
                if f.endswith(('.ts', '.tsx')):
                    p = os.path.join(dp, f)
                    s = open(p, encoding='utf-8').read()
                    if '@ts-nocheck' in s:
                        open(p, 'w', encoding='utf-8').write(re.sub(r'^\s*//\s*@ts-nocheck.*$', '// (nocheck removed by nocheck_tsc.py)', s, flags=re.M))
                        n += 1
        out = subprocess.run(['npx', 'tsc', '--noEmit', '-p', '.'], cwd=work, capture_output=True, text=True).stdout
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    errs = [l for l in out.splitlines() if ': error TS' in l]
    codes = collections.Counter(re.search(r'error (TS\d+)', l).group(1) for l in errs)
    fatal = [l for l in errs if re.search(r'error (TS\d+)', l).group(1) in FATAL and '__tests__' not in l]
    print(f'{app}: files with @ts-nocheck {n}; type errors without it {len(errs)}; runtime-fatal {len(fatal)}')
    print('  by code:', ', '.join(f'{k} {v}' for k, v in codes.most_common()))
    for l in fatal:
        print('  FATAL', l[:200])
    sys.exit(1 if fatal else 0)


if __name__ == '__main__':
    main()
