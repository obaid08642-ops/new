"""P9 F51 helper: resolve cross-file references between split units using tsc errors.
Usage: python3 tools/f51-fixrefs.py <provider-app-relative-out-dir> [rounds]
E.g.: python3 tools/f51-fixrefs.py src/screens/shared/shared 8
- TS2304 Cannot find name 'X' in F -> if another file G in dir defines X at
  top level: export-ize it in G, add named import in F.
- TS2459 'X' declared locally but not exported (imported by F) -> export-ize in G.
- TS2305 no exported member 'X' -> same as TS2459.
Runs tsc itself each round. Stops when no fixable errors remain.
"""
import io
import os
import re
import subprocess
import sys

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'provider-app')


def run_tsc():
    p = subprocess.run(['./node_modules/.bin/tsc', '--noEmit', '-p', 'tsconfig.json'],
                       cwd=APP, capture_output=True, text=True, timeout=900)
    return p.stdout + p.stderr


def top_defs(path):
    """Top-level defined names + imported names in a file."""
    text = io.open(path, encoding='utf8').read()
    defs = {}
    for m in re.finditer(r'^(export\s+)?(const|function|let|var|class|enum)\s+([A-Za-z0-9_]+)', text, re.M):
        defs[m.group(3)] = (m.start(), bool(m.group(1)))
    for dm in re.finditer(r'^export const\s*\{([^}]*)\}', text, re.M):
        for part in dm.group(1).split(','):
            part = part.strip()
            if part:
                defs[part.split(':')[-1].strip().split('=')[0].strip()] = (dm.start(), True)
    imported = set()
    for m in re.finditer(r"^import\s*\{([^}]*)\}", text, re.M):
        for part in m.group(1).split(','):
            part = part.strip()
            if part:
                imported.add(part.split(' as ')[-1].strip())
    return defs, imported


def exportize(path, name):
    lines = io.open(path, encoding='utf8').read().split('\n')
    for i, l in enumerate(lines):
        if re.match(r'^(const|function|let|var|class|enum)\s+%s\b' % re.escape(name), l):
            lines[i] = 'export ' + l
            io.open(path, 'w', encoding='utf8').write('\n'.join(lines))
            return True
    return False


def add_import(path, name, mod):
    text = io.open(path, encoding='utf8').read()
    if re.search(r"import\s*\{[^}]*\b%s\b[^}]*\}\s*from\s*'%s'" % (re.escape(name), re.escape(mod)), text):
        return False
    m = re.search(r"import\s*\{([^}]*)\}\s*from\s*'%s'" % re.escape(mod), text)
    if m:
        names = [x.strip() for x in m.group(1).split(',') if x.strip()]
        if name not in names:
            names.append(name)
        text = text[:m.start()] + "import { %s } from '%s'" % (', '.join(names), mod) + text[m.end():]
    else:
        lines = text.split('\n')
        idx = max([i for i, l in enumerate(lines) if l.startswith('import ')], default=-1)
        lines.insert(idx + 1, "import { %s } from '%s';" % (name, mod))
        text = '\n'.join(lines)
    io.open(path, 'w', encoding='utf8').write(text)
    return True


def main():
    out_rel, rounds = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 8
    out_dir = os.path.join(APP, out_rel)
    files = sorted(f for f in os.listdir(out_dir) if f.endswith('.tsx'))
    for r in range(rounds):
        out = run_tsc()
        errs = [l for l in out.split('\n') if out_rel in l and ('TS2304' in l or 'TS2459' in l or 'TS2305' in l)]
        if not errs:
            print('round %d: no fixable errors' % r)
            break
        index = {}
        for f in files:
            defs, _imp = top_defs(os.path.join(out_dir, f))
            for name, (pos, exported) in defs.items():
                index.setdefault(name, []).append((f, exported))
        fixed = 0
        for e in errs:
            m = re.match(r'^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$', e)
            if not m:
                continue
            fpath, code, msg = m.group(1), m.group(4), m.group(5)
            fname = os.path.basename(fpath)
            nm = re.search(r"'([A-Za-z0-9_]+)'", msg)
            if not nm:
                continue
            name = nm.group(1)
            cands = [(f, ex) for f, ex in index.get(name, []) if f != fname]
            if not cands:
                print('  NO DEF for %s (used in %s)' % (name, fname))
                continue
            g = sorted(cands)[0][0]
            if exportize(os.path.join(out_dir, g), name):
                print('  exported %s in %s' % (name, g))
            mod = './_shared' if g == '_shared.tsx' else './' + g[:-4]
            if add_import(os.path.join(out_dir, fname), name, mod):
                print('  imported %s into %s from %s' % (name, fname, mod))
            fixed += 1
        if not fixed:
            print('round %d: nothing fixable' % r)
            break
    print('done')


if __name__ == '__main__':
    main()
