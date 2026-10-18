#!/usr/bin/env python3
"""Phase 16.7 - every GitHub Action is pinned by the commit SHA of a release tag.

  python3 tools/audit/pin_actions.py --check   fail (exit 1) when a `uses:` is not a 40-hex commit SHA (CI mode, offline)
  python3 tools/audit/pin_actions.py --pin     rewrite `uses: owner/repo@v4` to `uses: owner/repo@<sha> # v4` (asks git ls-remote)

A tag such as `v4` can be moved by whoever controls the action's repository, so a compromised release would run in our
CI with our secrets. A commit SHA cannot be moved. Dependabot (github-actions ecosystem) reads the `# vX` comment and
proposes SHA bumps weekly. Local actions (`./...`) and docker:// references are not remote code and are skipped.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
FILES = sorted([*(ROOT / '.github' / 'workflows').glob('*.y*ml'), *(ROOT / '.github').glob('actions/**/action.y*ml')])
USES = re.compile(r'^(?P<head>\s*(?:-\s+)?uses:\s*)(?P<ref>[^\s#]+)(?P<tail>\s*(?:#.*)?)$')
SHA = re.compile(r'^[0-9a-f]{40}$')


def split(ref):
    if ref.startswith('./') or ref.startswith('docker://'):
        return None
    repo, _, version = ref.partition('@')
    return repo, version


def uses_lines():
    for f in FILES:
        for n, line in enumerate(f.read_text().splitlines(), 1):
            m = USES.match(line)
            if m and split(m.group('ref')):
                yield f, n, line, m


def check():
    bad = []
    for f, n, _line, m in uses_lines():
        repo, version = split(m.group('ref'))
        if not SHA.match(version):
            bad.append(f'{f.relative_to(ROOT)}:{n}: {repo}@{version} is not a commit SHA')
        elif not re.search(r'#\s*\S+', m.group('tail')):
            bad.append(f'{f.relative_to(ROOT)}:{n}: {repo}@{version[:8]} has no "# vX" comment (Dependabot needs it)')
    for b in bad:
        print('FAIL:', b)
    print(f'{"FAIL" if bad else "ok"}: {len(bad)} unpinned action reference(s)')
    return 1 if bad else 0


def resolve(repo, tag, cache):
    key = (repo, tag)
    if key in cache:
        return cache[key]
    owner_repo = '/'.join(repo.split('/')[:2])
    out = subprocess.run(['git', 'ls-remote', f'https://github.com/{owner_repo}', f'refs/tags/{tag}', f'refs/tags/{tag}^{{}}'],
                         capture_output=True, text=True, timeout=120)
    refs = {l.split('\t')[1]: l.split('\t')[0] for l in out.stdout.splitlines() if '\t' in l}
    sha = refs.get(f'refs/tags/{tag}^{{}}') or refs.get(f'refs/tags/{tag}')   # peeled commit of an annotated tag first
    if not sha:
        sys.exit(f'cannot resolve {owner_repo}@{tag}: {out.stderr.strip() or "no such tag"}')
    cache[key] = sha
    return sha


def pin():
    cache = {}
    for f in FILES:
        lines = f.read_text().split('\n')
        changed = False
        for i, line in enumerate(lines):
            m = USES.match(line)
            if not (m and split(m.group('ref'))):
                continue
            repo, version = split(m.group('ref'))
            if SHA.match(version):
                continue
            sha = resolve(repo, version, cache)
            lines[i] = f'{m.group("head")}{repo}@{sha} # {version}'
            changed = True
        if changed:
            f.write_text('\n'.join(lines))
    return check()


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else '--check'
    sys.exit(pin() if mode == '--pin' else check())
