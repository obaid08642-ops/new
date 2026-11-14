#!/usr/bin/env python3
"""R20 - every base image of the PRODUCTION surface is pinned by digest.

  python3 tools/supply-chain/pin_images.py --check   exit 1 when a production FROM / image: has no @sha256 digest (CI mode, offline)
  python3 tools/supply-chain/pin_images.py --pin     add or refresh `@sha256:<digest>` from the registry (Docker Hub registry API)
  python3 tools/supply-chain/pin_images.py --list    print every image reference and its digest state

A tag such as `node:22.23.4-alpine` or `mongo:7.0` can be re-pushed by whoever controls the repository (or by a compromised account), and the
next `docker compose build` on the server would silently run the new content. A digest cannot be moved. The tag stays in the reference
(`node:22.23.4-alpine@sha256:...`) so a person can read it and Dependabot (docker ecosystem) can propose the next digest weekly.

Production surface = the files in PRODUCTION_FILES below (the images that run on the server). Development, test and CI compose files are not pinned.
Images built locally (`nabdah-patient-web:v50`), build stages (`FROM builder`) and `scratch` are skipped. The digest is the manifest-list (index) digest, so
the same pin works on amd64 and arm64.
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
PRODUCTION_FILES = [
    'backend/Dockerfile.production',
    'deploy/docker/Dockerfile.backend',
    'deploy/docker/Dockerfile.admin-web',
    'deploy/docker/Dockerfile.patient-web',
    'deploy/docker/Dockerfile.fastapi',
    'deploy/docker-compose.production.yml',
]
FROM = re.compile(r'^(?P<head>\s*FROM\s+(?:--platform=\S+\s+)?)(?P<ref>[^\s]+)(?P<tail>.*)$')
IMAGE = re.compile(r'''^(?P<head>\s*image:\s*["']?)(?P<ref>[^\s#"']+)(?P<tail>["']?\s*(?:#.*)?)$''')
DIGEST = re.compile(r'@sha256:[0-9a-f]{64}$')
LOCAL_PREFIXES = ('nabdah-',)


def parse_ref(ref):
    """-> (repository, tag, digest|None) with Docker Hub defaults, or None for a reference that is not pinned from a registry."""
    digest = None
    if '@' in ref:
        ref, _, digest = ref.partition('@')
    name, _, tag = ref.rpartition(':') if ':' in ref.rsplit('/', 1)[-1] else (ref, '', 'latest')
    if not name:
        name, tag = ref, 'latest'
    repo = name if '/' in name else f'library/{name}'
    return repo, tag, digest


def references(files=None):
    """Yield (path, line_no, line, match, kind) for each registry image reference in the production files."""
    for rel in files or PRODUCTION_FILES:
        path = ROOT / rel
        stages = set()
        for n, line in enumerate(path.read_text().splitlines(), 1):
            m = FROM.match(line)
            kind = 'FROM'
            if m:
                a = re.search(r'\bAS\s+(\S+)', m.group('tail'), re.I)
                ref = m.group('ref')
                if ref in stages or ref == 'scratch':
                    if a:
                        stages.add(a.group(1))
                    continue
                if a:
                    stages.add(a.group(1))
            else:
                m = IMAGE.match(line)
                kind = 'image'
                if not m:
                    continue
                ref = m.group('ref')
                if ref.startswith(LOCAL_PREFIXES) or '${' in ref:
                    continue
            yield path, n, line, m, kind


def check(files=None):
    bad = []
    for path, n, _line, m, _kind in references(files):
        if not DIGEST.search(m.group('ref')):
            bad.append(f'{path.relative_to(ROOT)}:{n}: {m.group("ref")} has no @sha256 digest')
    return bad


def hub_digest(repo, tag, opener=urllib.request.urlopen):
    """Manifest-list digest of repo:tag from Docker Hub."""
    with opener(f'https://auth.docker.io/token?service=registry.docker.io&scope=repository:{repo}:pull') as r:
        token = json.load(r)['token']
    req = urllib.request.Request(
        f'https://registry-1.docker.io/v2/{repo}/manifests/{tag}',
        method='HEAD',
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.docker.distribution.manifest.v2+json'},
    )
    with opener(req) as r:
        d = r.headers.get('Docker-Content-Digest')
    if not d or not re.fullmatch(r'sha256:[0-9a-f]{64}', d):
        raise RuntimeError(f'no digest for {repo}:{tag}')
    return d


def pin(files=None, resolve=hub_digest):
    changed = 0
    cache = {}
    by_file = {}
    for path, n, line, m, _kind in references(files):
        repo, tag, _old = parse_ref(m.group('ref'))
        key = (repo, tag)
        if key not in cache:
            cache[key] = resolve(repo, tag)
        base = m.group('ref').split('@')[0]
        new = f'{base}@{cache[key]}'
        if new != m.group('ref'):
            by_file.setdefault(path, []).append((n, line.replace(m.group('ref'), new, 1)))
            changed += 1
    for path, edits in by_file.items():
        lines = path.read_text().splitlines(keepends=True)
        for n, new_line in edits:
            lines[n - 1] = new_line + ('\n' if lines[n - 1].endswith('\n') else '')
        path.write_text(''.join(lines))
    return changed


def main(argv):
    mode = argv[1] if len(argv) > 1 else '--check'
    if mode == '--check':
        bad = check()
        for b in bad:
            print(b)
        if bad:
            print(f'\n{len(bad)} production image reference(s) not pinned by digest: python3 tools/supply-chain/pin_images.py --pin')
            return 1
        print('every production image reference is pinned by digest')
        return 0
    if mode == '--pin':
        print(f'{pin()} reference(s) pinned or refreshed')
        return 0
    if mode == '--list':
        for path, n, _l, m, _k in references():
            print(f'{path.relative_to(ROOT)}:{n}  {m.group("ref")}')
        return 0
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv))
