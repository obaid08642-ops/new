#!/usr/bin/env python3
"""P3.1 gate complement to dtocheck.js (which only sees statically resolvable client calls).

Fails on:
  - DTO properties with NO class-validator decorator (forbidNonWhitelisted rejects them -> 400 on every call)
  - DTO properties typed `any` whose only decorator is @IsOptional (names filtered, values unchecked)
  - `@Body() x: any` handlers (signature-verified webhooks: type the body `Record<string, unknown>`;
    ValidationPipe skips non-class metatypes, so the signed payload stays untouched)
  - `@Body()` typed with anything that is NOT a validated class: inline `{...}` types, `type`/`interface`
    aliases, `Record<...>`, `unknown` (ValidationPipe skips them: no whitelist, no type check), and
    `@Body('key') x: string|number|...` (a primitive key is not validated: it can arrive as an object).
    Allowed only for signature-verified webhooks, listed in WEBHOOK_BODY_ALLOW below.
Free-form JSON is allowed with an explicit @IsObject()/@IsArray()/@Allow() and a `// free-form:` comment above.

DTO properties are read with a small TypeScript-aware parser: EVERY decorator of a property counts, whether
it sits on its own line, spans several lines (`@IsIn([\n 'a',\n 'b',\n])`) or shares the line with the
property (`@IsOptional() @IsString() name?: string;`). The DTO classes checked are every class in a
`*.dto.ts` file plus every class used as an `@Body()` type or as a nested `@Type(() => X)` anywhere in
backend/src (a DTO declared inside a controller is checked too).

  python3 tools/audit/dtolint.py            (from repo root; exit 1 when anything is found)
"""
import glob, os, re, sys

# The gate runs this from backend/ (`python3 ../tools/audit/dtolint.py`): without a backend/src
# under the working directory the globs below matched nothing and the lint passed vacuously.
if not os.path.isdir('backend/src'):
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

WEBHOOK_BODY_ALLOW = ('modules/webhooks/webhooks.controller.ts', 'modules/livekit/livekit.controller.ts:webhook', 'modules/payments/payments.module.ts:webhook', 'modules/moyasar/moyasar.module.ts:webhook')

# Decorators that do not validate a value on their own.
NON_VALIDATING = {'IsOptional', 'ValidateIf', 'Type', 'Transform', 'Expose', 'Exclude',
                  'ApiProperty', 'ApiPropertyOptional', 'ApiHideProperty'}
MODIFIERS = r"(?:(?:public|private|protected|readonly|static|declare|override)\s+)*"


def _skip_balanced(text, k):
    """text[k] is an opening bracket; return the index just past its matching closer (strings aware)."""
    depth, in_str, n = 0, None, len(text)
    while k < n:
        c = text[k]
        if in_str:
            if c == '\\':
                k += 2
                continue
            if c == in_str:
                in_str = None
        elif c in '\'"`':
            in_str = c
        elif c in '([{':
            depth += 1
        elif c in ')]}':
            depth -= 1
            if depth == 0:
                return k + 1
        k += 1
    return n


def class_bodies(src):
    """(class name, offset of the body in src, body text) for every top-level class declaration."""
    for m in re.finditer(r"^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)[^{;]*\{", src, re.M):
        end = _skip_balanced(src, m.end() - 1)
        yield m.group(1), m.end(), src[m.end():end - 1]


def properties(body):
    """(decorators, comments, name, type text, offset) for each property declared in a class body.
    Decorators are complete expressions (arguments included); methods/constructors are skipped."""
    i, n = 0, len(body)
    decs, comments = [], []
    while i < n:
        if body[i].isspace():
            i += 1
            continue
        if body.startswith('//', i):
            j = body.find('\n', i)
            j = n if j < 0 else j
            comments.append(body[i:j].strip())
            i = j
            continue
        if body.startswith('/*', i):
            j = body.find('*/', i)
            j = n if j < 0 else j + 2
            comments.append(body[i:j].strip())
            i = j
            continue
        if body[i] == '@':
            m = re.match(r"@([\w.]+)", body[i:])
            j = i + (m.end() if m else 1)
            if j < n and body[j] == '(':
                j = _skip_balanced(body, j)
            decs.append(' '.join(body[i:j].split()))
            i = j
            continue
        m = re.match(MODIFIERS + r"(\w+)\s*[?!]?\s*([:=(<])", body[i:])
        k = i
        if m and m.group(2) in '(<':
            # method / constructor / accessor: skip its signature and body
            k = body.find('{', i)
            k = n if k < 0 else _skip_balanced(body, k)
        else:
            # property: up to the terminating ';' at depth 0 (or a newline that ends it)
            depth, in_str = 0, None
            while k < n:
                c = body[k]
                if in_str:
                    if c == '\\':
                        k += 2
                        continue
                    if c == in_str:
                        in_str = None
                elif c in '\'"`':
                    in_str = c
                elif c in '([{':
                    depth += 1
                elif c in ')]}':
                    depth -= 1
                elif c == ';' and depth == 0:
                    k += 1
                    break
                elif c == '\n' and depth == 0:
                    rest = body[k:].lstrip()
                    if not rest or rest[0] in '@}' or rest.startswith(('//', '/*')) or re.match(MODIFIERS + r"\w+\s*[?!]?\s*[:=(]", rest):
                        break
                k += 1
            if m:
                t = re.match(MODIFIERS + r"\w+\s*[?!]?\s*(?::\s*([\s\S]*?))?\s*(?:=[\s\S]*)?;?\s*$", body[i:k])
                yield decs, comments, m.group(1), (t.group(1) or '').strip() if t else '', i
        decs, comments = [], []
        i = max(k, i + 1)


sources = {f: open(f, encoding='utf8').read() for f in glob.glob('backend/src/**/*.ts', recursive=True)
           if not f.endswith('.spec.ts')}
dto_names = set()
for s in sources.values():
    dto_names.update(re.findall(r"@Body\(\s*(?:'[^']*')?\s*\)\s*\w+\??\s*:\s*(\w+)", s))
    dto_names.update(re.findall(r"@Type\(\s*\(\)\s*=>\s*(\w+)", s))

undec, untyped, body_any = [], [], []
for f, src in sorted(sources.items()):
    for cname, off, body in class_bodies(src):
        if not (f.endswith('.dto.ts') or cname in dto_names):
            continue
        for decs, _comments, name, typ, o in properties(body):
            line = src[:off + o].count('\n') + 1
            loc = f"{f[len('backend/'):]}:{line}: {cname}.{name}: {' '.join(typ.split())[:80]}"
            names = [re.match(r"@([\w.]+)", d).group(1).split('.')[-1] for d in decs]
            if not decs:
                undec.append(loc)
            elif re.fullmatch(r"any(\[\])?", typ) and all(nm in NON_VALIDATING for nm in names):
                untyped.append(loc)
for f in glob.glob('backend/src/**/*.ts', recursive=True):
    if f.endswith('.spec.ts'):
        continue
    for i, l in enumerate(open(f, encoding='utf8')):
        if re.search(r"@Body\(\)\s+\w+\??\s*:\s*any\b", l):
            body_any.append(f"{f[len('backend/'):]}:{i + 1}: {l.strip()[:120]}")

classes = set()
for f in glob.glob('backend/src/**/*.ts', recursive=True):
    classes.update(re.findall(r"\bclass\s+(\w+)", open(f, encoding='utf8').read()))
body_untyped = []
for f in glob.glob('backend/src/**/*.ts', recursive=True):
    if f.endswith('.spec.ts'):
        continue
    s = open(f, encoding='utf8').read()
    for m in re.finditer(r"@Body\(\s*('[^']*')?\s*\)\s*(\w+)\??\s*:\s*", s):
        rest = s[m.end():]
        if rest.startswith('{'):
            depth, i = 0, 0
            for i, ch in enumerate(rest):
                depth += ch == '{'; depth -= ch == '}'
                if depth == 0: break
            t = rest[:i + 1]
        else:
            t = re.match(r"[\w.<>\[\], |]+?(?=\s*[,)=])", rest)
            t = t.group(0).strip() if t else rest[:40]
        base = re.sub(r"\[\]$", "", t)
        line = s[:m.start()].count('\n') + 1
        rel = f[len('backend/src/'):]
        handler = re.findall(r"(\w+)\s*\(", s[max(0, m.start() - 300):m.start()])
        handler = [h for h in handler if h not in ('Body', 'Param', 'Query', 'Headers', 'Req', 'Res', 'Post', 'Put', 'Patch', 'Delete', 'HttpCode', 'Public', 'UseGuards', 'Roles')]
        tag = f"{rel}:{handler[-1] if handler else ''}"
        if base in classes or base == 'any':
            continue
        if any(a in f"{rel}:{line}" or a in tag for a in WEBHOOK_BODY_ALLOW) and base.startswith('Record<'):
            continue
        kind = 'key-primitive' if m.group(1) else 'non-class'
        body_untyped.append(f"{rel}:{line}: [{kind}] {m.group(2)}: {' '.join(t.split())[:90]}")

for title, rows in (("undecorated DTO props (always rejected)", undec),
                    ("`any` props with no validating decorator (no type check)", untyped),
                    ("@Body() x: any handlers", body_any),
                    ("@Body() typed as non-class / unvalidated key (ValidationPipe skips)", body_untyped)):
    print(f"== {title}: {len(rows)}")
    for r in rows:
        print("  " + r)
sys.exit(1 if (undec or untyped or body_any or body_untyped) else 0)
