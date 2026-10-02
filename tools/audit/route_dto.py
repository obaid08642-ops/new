"""Backend route -> @Body() DTO class -> fields (types, enums, limits). Static, from source.
  python3 tools/audit/route_dto.py            -> prints coverage; writes /tmp/route_dto.json
"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from dto_fields import parse

def build():
    routes = json.loads(subprocess.run([sys.executable, os.path.join(HERE, 'routes.py'), '/tmp/_routes.json'], cwd=ROOT, capture_output=True, text=True) and open('/tmp/_routes.json').read())
    classes = {}          # name -> fields (first seen; used only as a last resort)
    by_file = {}          # file -> {name: fields}
    for dp, _, fs in os.walk(os.path.join(ROOT, 'backend', 'src')):
        for f in fs:
            if f.endswith('.ts') and not f.endswith('.spec.ts'):
                p = os.path.join(dp, f)
                s = open(p, encoding='utf-8', errors='ignore').read()
                if 'class ' in s and '@Is' in s:
                    parsed = {k: v for k, v in parse(p).items() if v}
                    by_file[os.path.relpath(p, ROOT)] = parsed
                    for k, v in parsed.items():
                        classes.setdefault(k, v)

    def resolve(ctrl_file, name):
        """The class as the controller sees it: same file first, then the file it imports the name from."""
        if name in by_file.get(ctrl_file, {}):
            return by_file[ctrl_file][name]
        src = open(os.path.join(ROOT, ctrl_file), encoding='utf-8', errors='ignore').read()
        for m in re.finditer(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'", src):
            names = [x.strip().split(' as ')[0] for x in m.group(1).split(',')]
            if name in names and m.group(2).startswith('.'):
                base = os.path.normpath(os.path.join(os.path.dirname(ctrl_file), m.group(2)))
                for cand in (base + '.ts', os.path.join(base, 'index.ts')):
                    if cand in by_file and name in by_file[cand]:
                        return by_file[cand][name]
        return classes.get(name)
    out = {}
    for r in routes:
        if r['m'] in ('GET',):
            continue
        src = open(os.path.join(ROOT, r['f']), encoding='utf-8', errors='ignore').read().split('\n')
        chunk = '\n'.join(src[r['l'] - 1:r['l'] + 12])
        m = re.search(r'@Body\(\s*\)\s*\w+\??\s*:\s*([A-Z]\w*)', chunk)
        dto = m.group(1) if m else None
        out[f"{r['m']} {r['p']}"] = {'dto': dto, 'fields': resolve(r['f'], dto) if dto else None, 'file': r['f'], 'line': r['l']}
    return out, classes

if __name__ == '__main__':
    out, classes = build()
    json.dump({'routes': out, 'classes': classes}, open('/tmp/route_dto.json', 'w'))
    n = len(out); withdto = sum(1 for v in out.values() if v['dto']); resolved = sum(1 for v in out.values() if v['fields'])
    print(f'write routes {n}, with @Body DTO {withdto}, DTO resolved to fields {resolved}, classes indexed {len(classes)}')
