#!/usr/bin/env python3
"""Phase 16.7 - lockfiles are enforced.

Fails when
  1. an app has a package.json but no tracked lockfile, or the lockfile does not list a dependency of package.json
     (an `npm ci` / `pnpm install --frozen-lockfile` would fail or, worse, resolve something new);
  2. a Dockerfile or workflow installs without the lockfile (`npm install` that writes, `npm ci || npm install`,
     `pnpm install` without --frozen-lockfile). `npm install --no-save ...` for a named tool and `--prefix` installs
     of a package that has a lockfile of its own are allowed only when listed in ALLOWED_INSTALLS below, with the reason.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
APPS = ['backend', 'admin', 'patient-app', 'provider-app', 'patient-web', 'packages/ui', 'packages/ui-native', 'packages/shared-contracts']
# apps whose package.json has no dependencies of its own to lock (build scripts only) are not listed above on purpose:
# packages/brand and packages/design-tokens have no dependencies.

# `npm install` lines that are not "install the project": one named tool, nothing written to package.json or the lock.
ALLOWED = re.compile(r'--no-save\b')


def tracked(path):
    return bool(subprocess.run(['git', 'ls-files', '--error-unmatch', str(path)], cwd=ROOT, capture_output=True).returncode == 0)


def check_locks():
    bad = []
    for app in APPS:
        d = ROOT / app
        pkg = json.loads((d / 'package.json').read_text())
        wanted = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {}), **pkg.get('optionalDependencies', {})}
        if app == 'patient-web':
            lock = d / 'pnpm-lock.yaml'
            if not tracked(lock.relative_to(ROOT)):
                bad.append(f'{app}: pnpm-lock.yaml is not tracked')
                continue
            text = lock.read_text()
            head = text.split('\npackages:\n')[0]
            for name in wanted:
                if not re.search(rf"^\s+'?{re.escape(name)}'?:\s*$", head, re.M):
                    bad.append(f'{app}: {name} is in package.json but not in pnpm-lock.yaml importers')
            continue
        lock = d / 'package-lock.json'
        if not tracked(lock.relative_to(ROOT)):
            bad.append(f'{app}: package-lock.json is not tracked')
            continue
        root_pkg = json.loads(lock.read_text()).get('packages', {}).get('', {})
        locked = {**root_pkg.get('dependencies', {}), **root_pkg.get('devDependencies', {}), **root_pkg.get('optionalDependencies', {})}
        for name, rng in wanted.items():
            if name not in locked:
                bad.append(f'{app}: {name} is in package.json but not in package-lock.json')
            elif locked[name] != rng:
                bad.append(f'{app}: {name} is "{rng}" in package.json but "{locked[name]}" in package-lock.json (run npm install --package-lock-only)')
    return bad


def check_installs():
    bad = []
    files = [*(ROOT / '.github' / 'workflows').glob('*.y*ml'), *ROOT.glob('**/Dockerfile*')]
    for f in files:
        if 'node_modules' in f.parts:
            continue
        for n, line in enumerate(f.read_text().splitlines(), 1):
            s = line.strip()
            if s.startswith('#'):
                continue
            if re.search(r'npm ci\b.*\|\|.*npm install', s):
                bad.append(f'{f.relative_to(ROOT)}:{n}: falls back to npm install when npm ci fails (hides a lockfile mismatch)')
            elif re.search(r'\bnpm( --prefix \S+)? (install|i)\b', s) and not ALLOWED.search(s) and '--package-lock-only' not in s and 'npm install -g' not in s:
                # `npm install --prefix X` of a package that has its own lockfile must be `npm ci --prefix X`
                bad.append(f'{f.relative_to(ROOT)}:{n}: npm install without a lockfile (use npm ci): {s[:100]}')
            if re.search(r'\bpnpm (install|i)\b', s) and '--frozen-lockfile' not in s and '--lockfile-only' not in s:
                bad.append(f'{f.relative_to(ROOT)}:{n}: pnpm install without --frozen-lockfile: {s[:100]}')
    return bad


if __name__ == '__main__':
    problems = check_locks() + check_installs()
    for p in problems:
        print('FAIL:', p)
    print(f'{"FAIL" if problems else "ok"}: {len(problems)} lockfile problem(s)')
    sys.exit(1 if problems else 0)
