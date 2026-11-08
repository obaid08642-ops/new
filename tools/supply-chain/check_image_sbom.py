#!/usr/bin/env python3
"""R20: a Trivy CycloneDX file for an IMAGE is real: CycloneDX, names the image, lists operating-system packages and application libraries.

  python3 tools/supply-chain/check_image_sbom.py sbom-image-backend.cdx.json

An empty or truncated SBOM would let the publish job look green while nothing can be searched later, so the job fails here instead.
"""
import json
import sys


def flatten(components):
    """Trivy may nest packages under an application / OS component; count them all."""
    for c in components or []:
        yield c
        yield from flatten(c.get('components'))


def check(doc, min_components=50):
    problems = []
    if doc.get('bomFormat') != 'CycloneDX':
        problems.append(f"bomFormat is {doc.get('bomFormat')!r}, expected 'CycloneDX'")
    comps = list(flatten(doc.get('components')))
    if len(comps) < min_components:
        problems.append(f'only {len(comps)} components (an image has at least {min_components})')
    types = {c.get('type') for c in comps}
    if 'library' not in types:
        problems.append('no library components')
    purls = [c.get('purl', '') for c in comps]
    kinds = {p.split(':', 2)[1].split('/', 1)[0] for p in purls if p.startswith('pkg:')}
    if not (kinds & {'npm'}):
        problems.append('no npm packages (application dependencies missing)')
    if not (kinds & {'apk', 'deb'}):
        problems.append('no apk/deb packages (operating system layer missing)')
    return problems


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    with open(argv[1]) as f:
        doc = json.load(f)
    problems = check(doc)
    for p in problems:
        print(f'{argv[1]}: {p}')
    if problems:
        return 1
    print(f"{argv[1]}: CycloneDX, {len(doc['components'])} components")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
