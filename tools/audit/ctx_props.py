"""Split screens that receive their state through a `ctx` object: every name a child reads from ctx must be put
into ctx by its parent. A missing name is `undefined` at runtime (a crash on `.map`, or a setter that is not a
function), and tsc cannot see it because ctx is typed `any`.

  python3 tools/audit/ctx_props.py            (scans provider-app/src and patient-app/{app,src})

Found by the provider-app crawl: the P9 split (e1730e5) left SUGGEST_FIELD_DEFS out of the drug index ctx
(the suggest-change form crashed) and exDate/exType out of the doctor availability ctx (the exception form crashed).
Exit 1 when any name is missing.
"""
import glob, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LITERAL = re.compile(r'const ctx(?::\s*any)?\s*=\s*\{(.*?)\};', re.S)
READ = re.compile(r'const \{([^}]*)\}\s*=\s*ctx;', re.S)


def names_in_literal(body):
    body = re.sub(r'//[^\n]*', '', body)          # comments
    out = set()
    for part in body.split(','):
        part = part.strip()
        if not part:
            continue
        m = re.match(r'([A-Za-z_$][\w$]*)\s*(?::|$)', part)
        if m:
            out.add(m.group(1))
        elif part.startswith('...'):
            out.add('*')                          # spread: cannot tell statically
    return out


def main():
    files = []
    for pat in ('provider-app/src/**/*.tsx', 'patient-app/app/**/*.tsx', 'patient-app/src/**/*.tsx'):
        files += glob.glob(os.path.join(ROOT, pat), recursive=True)
    provided = {}
    for f in files:
        for m in LITERAL.finditer(open(f, encoding='utf-8').read()):
            provided.setdefault(os.path.dirname(f), set()).update(names_in_literal(m.group(1)))
    bad = 0
    for f in files:
        for m in READ.finditer(open(f, encoding='utf-8').read()):
            used = {x.strip().split(':')[0].split('=')[0].strip() for x in m.group(1).split(',') if x.strip()}
            prov = provided.get(os.path.dirname(f), set())
            if '*' in prov:
                continue
            miss = sorted(u for u in used if u and u not in prov)
            if miss:
                bad += 1
                print(f'{os.path.relpath(f, ROOT)}: read from ctx but never provided: {", ".join(miss)}')
    print(f'ctx consumers with missing names: {bad}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
