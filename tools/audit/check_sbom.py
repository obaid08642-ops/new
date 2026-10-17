#!/usr/bin/env python3
"""Phase 16.7 - validate a generated CycloneDX SBOM: python3 tools/audit/check_sbom.py <app> <sbom.json>

Fails when the file is not CycloneDX, has no components, or is missing a runtime dependency named in the app's package.json."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]


def problems(app, sbom):
    bad = []
    if sbom.get('bomFormat') != 'CycloneDX':
        bad.append(f'bomFormat is {sbom.get("bomFormat")!r}, not CycloneDX')
    if not sbom.get('specVersion'):
        bad.append('no specVersion')
    components = sbom.get('components') or []
    if not components:
        bad.append('no components')
    # Trivy nests lockfile packages under the application component
    def full(c):
        # CycloneDX writes @scope/pkg as group "@scope" + name "pkg"
        return f"{c['group']}/{c['name']}" if c.get('group') else c.get('name')

    names = {full(c) for c in components}
    for c in components:
        names |= {full(n) for n in (c.get('components') or [])}
    wanted = json.loads((ROOT / app / 'package.json').read_text()).get('dependencies', {})
    missing = sorted(n for n in wanted if n not in names)
    if missing:
        bad.append(f'{len(missing)} runtime dependencies missing from the SBOM: {", ".join(missing[:8])}')
    return bad


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('usage: check_sbom.py <app> <sbom.json>')
    found = problems(sys.argv[1], json.loads(pathlib.Path(sys.argv[2]).read_text()))
    for f in found:
        print('FAIL:', f)
    print(f'{"FAIL" if found else "ok"}: SBOM of {sys.argv[1]}')
    sys.exit(1 if found else 0)
