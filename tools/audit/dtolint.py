#!/usr/bin/env python3
"""P3.1 gate complement to dtocheck.js (which only sees statically resolvable client calls).

Fails on:
  - DTO properties with NO class-validator decorator (forbidNonWhitelisted rejects them -> 400 on every call)
  - DTO properties typed `any` whose only decorator is @IsOptional (names filtered, values unchecked)
  - `@Body() x: any` handlers (signature-verified webhooks: type the body `Record<string, unknown>`;
    ValidationPipe skips non-class metatypes, so the signed payload stays untouched)
Free-form JSON is allowed with an explicit @IsObject()/@IsArray()/@Allow() and a `// free-form:` comment above.

  python3 tools/audit/dtolint.py            (from repo root; exit 1 when anything is found)
"""
import glob, re, sys

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

for title, rows in (("undecorated DTO props (always rejected)", undec),
                    ("`any` props with only @IsOptional (no type check)", untyped),
                    ("@Body() x: any handlers", body_any)):
    print(f"== {title}: {len(rows)}")
    for r in rows:
        print("  " + r)
sys.exit(1 if (undec or untyped or body_any) else 0)
