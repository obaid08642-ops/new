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

  python3 tools/audit/dtolint.py            (from repo root; exit 1 when anything is found)
"""
import glob, re, sys

WEBHOOK_BODY_ALLOW = ('modules/webhooks/webhooks.controller.ts', 'modules/livekit/livekit.controller.ts:webhook', 'modules/payments/payments.module.ts:webhook')

undec, untyped, body_any = [], [], []
for f in glob.glob('backend/src/**/*.dto.ts', recursive=True):
    L = open(f, encoding='utf8').read().split('\n')
    for i, l in enumerate(L):
        m = re.match(r"\s+(\w+)\??:\s*([^;(]+);", l)
        if not m:
            continue
        decs, j = [], i - 1
        while j >= 0 and (L[j].strip().startswith('@') or L[j].strip().startswith('//')):
            if L[j].strip().startswith('@'):
                decs.append(L[j].strip())
            j -= 1
        loc = f"{f[len('backend/'):]}:{i + 1}: {l.strip()}"
        if not decs:
            undec.append(loc)
        elif re.fullmatch(r"any(\[\])?", m.group(2).strip()) and all(d.startswith('@IsOptional') for d in decs):
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
                    ("`any` props with only @IsOptional (no type check)", untyped),
                    ("@Body() x: any handlers", body_any),
                    ("@Body() typed as non-class / unvalidated key (ValidationPipe skips)", body_untyped)):
    print(f"== {title}: {len(rows)}")
    for r in rows:
        print("  " + r)
sys.exit(1 if (undec or untyped or body_any or body_untyped) else 0)
