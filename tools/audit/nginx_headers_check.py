#!/usr/bin/env python3
"""Phase 16.4 — the nginx files keep the security headers on what nginx serves itself.

nginx does not inherit `add_header` into a block that has its own `add_header`: a location that sets
`Cache-Control` silently loses every header the server block set. So, in every HTTPS server:
  * `autoindex` is never on (and nginx.conf turns it off explicitly in the http block);
  * a server that serves its pages itself (`root`, or a location with `try_files`) includes
    snippets/security-headers.conf at server level (a proxied app sets its own headers; nginx must not overwrite them);
  * every location that serves a file (`alias` / `try_files`) and has its own `add_header` includes the snippet too.
Run in CI (security.yml). Exit 1 and a list on failure.
"""
import pathlib
import re
import sys

import os

ROOT = pathlib.Path(os.environ.get('NGINX_ROOT') or pathlib.Path(__file__).resolve().parent.parent.parent / 'deploy' / 'nginx')
SNIPPET = 'snippets/security-headers.conf'


def strip_comments(text: str) -> str:
    return re.sub(r'#.*', '', text)


def blocks(text: str, keyword: str):
    """Yield (header, body) of every `keyword ... { ... }` block, with nested braces matched."""
    for m in re.finditer(rf'(?<![\w$]){keyword}\b([^{{;]*)\{{', text):
        depth, i = 1, m.end()
        while depth and i < len(text):
            depth += {'{': 1, '}': -1}.get(text[i], 0)
            i += 1
        yield m.group(1).strip(), text[m.end():i - 1]


def strip_blocks(body: str) -> str:
    """The server-level text: the body without its location blocks."""
    out, depth = [], 0
    for ch in body:
        if ch == '{':
            depth += 1
        elif depth == 0:
            out.append(ch)
        if ch == '}':
            depth -= 1
    return ''.join(out)


def main() -> int:
    errors = []
    main_conf = strip_comments((ROOT / 'nginx.conf').read_text())
    if not re.search(r'(?:^|[{;])\s*autoindex\s+off\s*;', main_conf, re.M):
        errors.append('nginx.conf: `autoindex off;` is not set in the http block')
    for path in sorted(ROOT.rglob('*.conf*')):
        text = strip_comments(path.read_text())
        if re.search(r'(?:^|[{;])\s*autoindex\s+on\s*;', text, re.M):
            errors.append(f'{path.relative_to(ROOT)}: autoindex on')
        if path.name == 'nginx.conf' or path.parent.name == 'snippets':
            continue
        for _, server in blocks(text, 'server'):
            if not re.search(r'listen\s+443', server):
                continue
            name = (re.search(r'server_name\s+([^;]+);', server) or [None, '?'])[1].strip()
            top = strip_blocks(server)
            locations = list(blocks(server, 'location'))
            serves_pages = bool(re.search(r'^\s*root\s', top, re.M)) or any(re.search(r'\btry_files\b', body) for _, body in locations)
            if serves_pages and SNIPPET not in top:
                errors.append(f'{path.relative_to(ROOT)} [{name}]: serves files but does not include {SNIPPET} at server level')
            for header, body in locations:
                own = strip_blocks(body)
                if re.search(r'\b(alias|try_files)\b', own) and 'add_header' in own and SNIPPET not in own:
                    errors.append(f'{path.relative_to(ROOT)} [{name}] location {header}: has its own add_header but not {SNIPPET} (nginx drops the inherited headers)')
    if errors:
        print('FAIL: nginx security headers')
        print('\n'.join(f'  - {e}' for e in errors))
        return 1
    print('ok: autoindex is off, and every server that serves files keeps the security headers in every location')
    return 0


if __name__ == '__main__':
    sys.exit(main())
