#!/usr/bin/env python3
"""For each UNRESOLVED any-prop: is it client-sent? service-used? Prints evidence table."""
import re, glob, json, subprocess

clients = json.load(open('/tmp/c.json'))
# map backend route -> client keys: reuse dtocheck routes? simpler: match by DTO class usage sites is overkill.
# Instead: for each dto file, find handlers using its classes, then their routes, then client keys.
ROOT = 'backend/src'

def dto_classes(f):
    s = open('backend/' + f, encoding='utf8').read()
    return re.findall(r'export class (\w+)', s)

# handler -> dto per controller (rough: @Body() x: ClassName)
uses = {}  # dto class -> [(file, method, path)]
for f in glob.glob(ROOT + '/**/*.ts', recursive=True):
    if f.endswith('.spec.ts') or '.dto.ts' in f: continue
    s = open(f, encoding='utf8').read()
    if '@Controller' not in s: continue
    lines = s.split('\n')
    for i, l in enumerate(lines):
        m = re.search(r'@(Post|Put|Patch|Delete)\(\s*[\'"]([^\'"]*)', l)
        if not m: continue
        for j in range(i, min(i + 8, len(lines))):
            bm = re.search(r'@Body\(\)\s*(\w+)\s*:\s*(\w+)', lines[j])
            if bm and bm.group(2) != 'any':
                uses.setdefault(bm.group(2), []).append((f, m.group(1), m.group(2)))
                break

# unresolved list from heuristic run output format: read lint file section 2
unresolved = []
import subprocess
out = subprocess.run(['python3', 'tools/audit/dtolint.py'], capture_output=True, text=True).stdout
sec = out.split('== `any` props')[1].split('== @Body')[0]
for line in sec.split('\n'):
    m = re.match(r'\s+(src/\S+):(\d+): (\w+)\??:', line)
    if m: unresolved.append((m.group(1), m.group(3)))

from collections import defaultdict
byfile = defaultdict(list)
for f, prop in unresolved:
    byfile[f].append(prop)

for f in sorted(byfile):
    print(f'### {f}')
    src = open('backend/' + f, encoding='utf8').read()
    for cls in dto_classes(f):
        handlers = uses.get(cls, [])
        routes = [f'{m} /{p}' for _, m, p in handlers]
        # client keys for these routes (template match: compare literal segs)
        ckeys = set()
        for (ff, m, p) in handlers:
            rsegs = p.split('/')
            for c in clients:
                if c['method'] != m: continue
                u = (c.get('backend') or c['url']).strip('/')
                usegs = u.split('/')
                if len(usegs) != len(rsegs): continue
                ok = True
                for rs, cs in zip(rsegs, usegs):
                    if rs.startswith(':') or cs in (':x',) or cs.startswith(':') or cs.startswith('${'): continue
                    if rs != cs: ok = False; break
                if ok: ckeys.update(c.get('keys', []))
        # service usage: find service file consuming these props (search body.PROP in likely service)
        print(f'  class {cls}: routes={routes[:3]} clients={sorted(ckeys)[:12]}')
    # unresolved props in this file
    print(f'  unresolved: {byfile[f]}')
