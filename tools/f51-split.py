"""P9 F51: split a monolithic screen file into one file per exported screen.
Usage: python3 tools/f51-split.py <src-relative-to-provider-app> <out-subdir>
Example: python3 tools/f51-split.py src/screens/shared/BlueprintScreens.tsx blueprint
Produces provider-app/src/screens/shared/blueprint/{_shared,Screen...}.tsx and
rewrites the source as a shell with the original import depth + re-exports.
Idempotent-ish: refuses to run if out dir already has .tsx files.
"""
import io
import os
import re
import sys

APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'provider-app')


def fix_rel(path):
    if path.startswith('./'):
        return '../' + path[2:]
    if path.startswith('../'):
        return '../' + path
    return path


def depth_fix_stmts(text):
    """One extra ../ level for every relative path in import statements
    (statement-aware: handles multi-line imports)."""
    lines = text.split('\n')
    out = []
    buf = []
    for l in lines:
        if not buf and re.match(r'^\s*import\b', l):
            buf = [l]
            if l.rstrip().endswith(';'):
                out.append(fix_one_import(buf))
                buf = []
        elif buf:
            buf.append(l)
            if l.rstrip().endswith(';'):
                out.append(fix_one_import(buf))
                buf = []
        else:
            out.append(l)
    if buf:
        out.append(fix_one_import(buf))
    return '\n'.join(out)


def fix_one_import(buf):
    stmt = '\n'.join(buf)
    m = re.search(r"from '(\.\.?/[^']*)'", stmt)
    if m and '_shared' not in stmt:
        stmt = stmt.replace("from '%s'" % m.group(1), "from '%s'" % fix_rel(m.group(1)), 1)
    return stmt


def is_comment_line(l):
    s = l.strip()
    return s.startswith('//') or s.startswith('/*') or s.startswith('*') or s.startswith('*/')


def main():
    src_rel, out_sub = sys.argv[1], sys.argv[2]
    src = os.path.join(APP, src_rel)
    src_dir = os.path.dirname(src)
    out_dir = os.path.join(src_dir, out_sub)
    if os.path.isdir(out_dir) and [f for f in os.listdir(out_dir) if f.endswith('.tsx')]:
        print('out dir not empty, refusing: %s' % out_dir)
        sys.exit(1)
    os.makedirs(out_dir, exist_ok=True)

    lines = io.open(src, encoding='utf8').read().split('\n')
    exp_idx = [i for i, l in enumerate(lines) if re.match(r'^export function ([A-Za-z0-9_]+)', l)]
    if not exp_idx:
        print('no exported functions found')
        sys.exit(1)
    names = [re.match(r'^export function ([A-Za-z0-9_]+)', lines[i]).group(1) for i in exp_idx]
    header = lines[:exp_idx[0]]

    # trailing block after last unit (e.g. const _styles) -> shared tail
    last_end = len(lines)
    tail_units_end = len(lines)

    # header import statements (depth-fixed) for unit files
    header_stmts = []
    buf = []
    for l in header:
        if not buf and re.match(r'^\s*import\b', l):
            buf = [l]
            if l.rstrip().endswith(';'):
                header_stmts.append(('import', buf))
                buf = []
        elif buf:
            buf.append(l)
            if l.rstrip().endswith(';'):
                header_stmts.append(('import', buf))
                buf = []
        else:
            header_stmts.append(('code', [l]))
    if buf:
        header_stmts.append(('import', buf))
    unit_imports_text = depth_fix_stmts('\n'.join(sum([b for k, b in header_stmts if k == 'import'], [])))
    unit_imports = unit_imports_text.split('\n')
    # header non-import CODE lines (consts like W/H) -> _shared; drop comments/banners
    shared_extra = [l for k, b in header_stmts if k == 'code' for l in b if not is_comment_line(l)]

    def is_banner(l):
        return l.strip().startswith('//') and '══' in l

    # cut banners at unit boundaries
    units = []
    for k, start in enumerate(exp_idx):
        end = exp_idx[k + 1] if k + 1 < len(exp_idx) else len(lines)
        body = lines[start:end]
        # drop leading/trailing pure banner lines
        while body and is_banner(body[0]):
            body.pop(0)
        while body and is_banner(body[-1]):
            body.pop()
        # drop leading blank lines, keep one trailing newline shape
        while body and not body[0].strip():
            body.pop(0)
        units.append((names[k], body))

    # tail: anything after last unit that is not part of it? (units run to EOF;
    # trailing _styles block belongs to last unit region -> extract top-level
    # const/style blocks at end into _shared)
    shared_tail = []
    last_name, last_body = units[-1]
    # find trailing top-level const block (starts at col 0 with const, runs to EOF)
    cut = None
    for i in range(len(last_body) - 1, -1, -1):
        l = last_body[i]
        if re.match(r'^const _styles|^const [A-Z_]+ =|^const [a-zA-Z0-9_]+ = .*StyleSheet', l):
            cut = i
            break
        if l.strip() and not l.startswith(' ') and not l.startswith('\t') and not l.startswith('//') and not l.startswith('}'):
            break
    if cut is not None:
        shared_tail = last_body[cut:]
        # strip preceding banners
        while shared_tail and is_banner(shared_tail[0]):
            shared_tail.pop(0)
        units[-1] = (last_name, last_body[:cut])
        while units[-1][1] and not units[-1][1][-1].strip():
            units[-1][1].pop()

    def exportize(block):
        out = []
        for l in block:
            if re.match(r'^(const|function|let|var|class|enum)\b', l):
                out.append('export ' + l)
            else:
                out.append(l)
        return out

    shared_lines = unit_imports + [''] + exportize([l for l in shared_extra if l.strip()]) + ['']
    if shared_tail:
        shared_lines += [''] + exportize(shared_tail)
    # ensure React import present for JSX in shared (helpers may use JSX)
    if not any('from \'react\'' in l or 'from "react"' in l for l in shared_lines):
        shared_lines.insert(0, "import React from 'react';")
    io.open(os.path.join(out_dir, '_shared.tsx'), 'w', encoding='utf8').write('\n'.join(shared_lines))

    shared_text = '\n'.join(shared_lines)
    shared_defs = set(re.findall(r'^(?:export\s+)?(?:const|function|let|var|class|enum)\s+([A-Za-z0-9_]+)', shared_text, re.M))
    for dm in re.finditer(r'^export const\s*\{([^}]*)\}', shared_text, re.M):
        for part in dm.group(1).split(','):
            part = part.strip()
            if not part:
                continue
            shared_defs.add(part.split(':')[-1].strip().split('=')[0].strip())
    for name, body in units:
        extra = []
        body_text = '\n'.join(body)
        for ident in sorted(shared_defs):
            if re.search(r'(?<![A-Za-z0-9_.])%s(?![A-Za-z0-9_])' % ident, body_text):
                extra.append(ident)
        content = unit_imports + (["import { %s } from './_shared';" % ', '.join(extra), ''] if extra else ['']) + body + ['']
        io.open(os.path.join(out_dir, name + '.tsx'), 'w', encoding='utf8').write('\n'.join(content))

    # shell: original-depth imports actually needed (react for nothing? keep
    # side-effect-free minimal: only re-exports). Keep original header imports
    # that are side-effectful? Simplest correct: re-export only.
    shell = ["// F51: split into ./%s/ — one file per screen. Re-exports keep existing imports working." % out_sub]
    for name in names:
        shell.append("export { %s } from './%s/%s';" % (name, out_sub, name))
    shell.append("export * from './%s/_shared';" % out_sub)
    shell.append('')
    io.open(src, 'w', encoding='utf8').write('\n'.join(shell))
    print('split %d units -> %s/ (shared %d lines)' % (len(units), out_sub, len(shared_lines)))
    for name, body in units:
        if len(body) > 400:
            print('  OVERSIZED %s: %d lines' % (name, len(body)))


if __name__ == '__main__':
    main()
