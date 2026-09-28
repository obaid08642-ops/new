"""P9 F50: replace quoted 'tokens.x' strings with bare tokens.x imports.
Idempotent: skips files already converted. Run: python3 tools/f50-codemod.py
"""
import io
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'provider-app', 'src')
HEX = re.compile(r'^#(?:[0-9a-fA-F]{6})$')


def load_keys():
    text = io.open(os.path.join(ROOT, 'theme', 'tokens.ts'), encoding='utf8').read()
    m = re.search(r'export const tokens = \{(.*?)\n\} as const', text, re.S)
    keys = set(re.findall(r'^\s*([A-Za-z0-9_]+)\s*:', m.group(1), re.M))
    return keys


def alpha_of(suffix):
    return '0.%s' % suffix if len(suffix) == 2 and suffix.isdigit() else None


def convert_file(path, keys):
    text = io.open(path, encoding='utf8').read()
    orig = text
    used_with_alpha = False

    def base_of(name):
        if name in keys:
            return name, None
        m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*?)(\d{2})$', name)
        if m and m.group(1) in keys:
            return m.group(1), alpha_of(m.group(2))
        return None, None

    # 0) JSX string props color="tokens.X" -> color={tokens.X}
    def repl_jsx(m):
        attr, name = m.group(1), m.group(2)
        base, alpha = base_of(name)
        if base is None:
            print('  UNKNOWN JSX KEY %s in %s' % (name, path))
            return m.group(0)
        inner = 'withAlpha(tokens.%s, %s)' % (base, alpha) if alpha else 'tokens.%s' % base
        return '%s={%s}' % (attr, inner)

    text = re.sub(r'(\w+)="tokens\.([A-Za-z0-9_]+)"', repl_jsx, text)

    # 1) 'tokens.X' + 'YY' concatenations -> withAlpha(tokens.X, 0.YY)
    def repl_concat(m):
        name, extra = m.group(1), m.group(2)
        base, alpha = base_of(name)
        if base is None:
            return m.group(0)
        if alpha is not None:  # tokens.X12 + 'YY' — fold both? keep simple: withAlpha + suffix string is invalid; skip
            return m.group(0)
        if not extra.isdigit():
            return m.group(0)
        a = alpha_of(extra)
        if a is None:
            return m.group(0)
        return 'withAlpha(tokens.%s, %s)' % (base, a)

    text, n1 = re.subn(r"""['"]tokens\.([A-Za-z0-9_]+)['"]\s*\+\s*['"]([0-9a-fA-F]+)['"]""", repl_concat, text)

    # 2) remaining quoted 'tokens.NAME' / "tokens.NAME"
    def repl_quoted(m):
        name = m.group(1)
        base, alpha = base_of(name)
        if base is None:
            print('  UNKNOWN KEY %s in %s' % (name, path))
            return m.group(0)
        if alpha is not None:
            return 'withAlpha(tokens.%s, %s)' % (base, alpha)
        return 'tokens.%s' % base

    text, n2 = re.subn(r"""['"]tokens\.([A-Za-z0-9_]+)['"]""", repl_quoted, text)
    if 'withAlpha(' in text:
        used_with_alpha = True

    # 3) ensure tokens import
    if n1 + n2 > 0 and 'tokens.' in text and 'theme/tokens' not in text:
        # find last import line
        lines = text.split('\n')
        idx = max([i for i, l in enumerate(lines) if l.startswith('import ')], default=-1)
        imp = "import { tokens%s } from '../theme/tokens';" % (', withAlpha' if used_with_alpha else '')
        # depth: count how deep under src we are
        rel = os.path.relpath(path, ROOT)
        depth = len(os.path.dirname(rel).split(os.sep)) if os.path.dirname(rel) else 0
        prefix = '../' * depth
        imp = "import { tokens%s } from '%stheme/tokens';" % (', withAlpha' if used_with_alpha else '', prefix)
        # tokens.ts itself must not self-import
        if os.path.basename(path) != 'tokens.ts':
            lines.insert(idx + 1, imp)
            text = '\n'.join(lines)
    elif used_with_alpha and 'withAlpha' in text and 'withAlpha' not in (re.findall(r'import \{([^}]*)\}.*theme/tokens', text) or [''])[0]:
        # add withAlpha to existing tokens import
        text = re.sub(r"import \{([^}]*)\} (from '[^']*theme/tokens')",
                      lambda m: 'import {%s, withAlpha} %s' % (m.group(1).rstrip(), m.group(2)) if 'withAlpha' not in m.group(1) else m.group(0),
                      text, count=1)
    if text != orig:
        io.open(path, 'w', encoding='utf8').write(text)
    return n1 + n2


def main():
    keys = load_keys()
    total = 0
    files = 0
    for dirpath, _dirs, fns in os.walk(ROOT):
        for fn in fns:
            if not fn.endswith(('.ts', '.tsx')):
                continue
            p = os.path.join(dirpath, fn)
            if os.path.basename(p) == 'tokens.ts':
                continue
            n = convert_file(p, keys)
            if n:
                files += 1
                total += n
    print('converted %d refs in %d files' % (total, files))
    # verify no leftovers
    left = []
    for dirpath, _dirs, fns in os.walk(ROOT):
        for fn in fns:
            if not fn.endswith(('.ts', '.tsx')):
                continue
            p = os.path.join(dirpath, fn)
            t = io.open(p, encoding='utf8').read()
            hits = re.findall(r"""['"]tokens\.[A-Za-z0-9_]+['"]""", t)
            if hits:
                left.append((p, hits[:3]))
    if left:
        print('LEFTOVER:')
        for p, h in left:
            print(' ', p, h)
        sys.exit(1)
    print('no quoted tokens refs remain')


if __name__ == '__main__':
    main()
