"""Screen payload TYPES vs backend DTO types, for every client write call (dtocheck only compares key names).

  python3 tools/audit/typecheck_contracts.py      (run tools/audit/route_dto.py first)
For each call site (clientbodies --types) and each key the screen sends with a statically known kind
(string/number/boolean/object/array<...>), compares with the DTO decorator on that key:
  @IsString vs number/boolean/object, @IsNumber/@IsInt vs string, @IsBoolean vs string/number,
  @IsObject vs string/array, @IsArray vs non-array, @IsString({each}) vs array<object|number>.
A mismatch is a guaranteed 400 for the whole request when the screen sends that field.
Also: keys the screen sends that the DTO does not declare (forbidNonWhitelisted -> 400, or silently dropped).
Writes docs/review/evidence/contract_types_<date>.json; exit 1 when any mismatch.
"""
import datetime, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))


def dto_kind(spec):
    d = spec['decorators']
    each = lambda name: 'each' in d.get(name, '')
    if 'IsArray' in d:
        if each('IsString'):
            return 'array<string>'
        if each('IsNumber') or each('IsInt'):
            return 'array<number>'
        if each('IsObject') or 'ValidateNested' in d:
            return 'array<object>'
        return 'array'
    if 'IsString' in d or 'IsDateString' in d or 'IsEmail' in d or 'IsUUID' in d or 'IsUrl' in d or 'IsISO8601' in d:
        return 'string'
    if 'IsNumber' in d or 'IsInt' in d or 'IsPositive' in d:
        return 'number'
    if 'IsBoolean' in d:
        return 'boolean'
    if 'IsObject' in d or 'ValidateNested' in d:
        return 'object'
    if 'IsIn' in d or 'IsEnum' in d:
        return 'enum'
    return None


def compatible(sent, want):
    if not sent or not want or sent in ('null', 'unknown', 'any') or want == 'enum':
        return True
    s = sent.split('|')
    if want == 'string':
        return any(x in ('string',) or x.startswith('literal') for x in s)
    if want == 'number':
        return 'number' in s
    if want == 'boolean':
        return 'boolean' in s
    if want == 'object':
        return any(x == 'object' for x in s)
    if want.startswith('array'):
        if not any(x.startswith('array') for x in s):
            return False
        if want == 'array':
            return True
        inner = want[6:-1]
        return any(x == f'array<{inner}>' or x == 'array' or x == 'array<unknown>' for x in s)
    return True


PROTO = set('toString charAt charCodeAt concat indexOf lastIndexOf localeCompare match replace search slice split substring toLowerCase toLocaleLowerCase toUpperCase toLocaleUpperCase trim length substr valueOf codePointAt includes endsWith normalize repeat startsWith anchor big blink bold fixed fontcolor fontsize italics link small strike sub sup padStart padEnd trimEnd trimStart trimLeft trimRight matchAll replaceAll at isWellFormed toWellFormed append delete get getAll has set forEach entries keys values'.split())


def main():
    data = json.load(open('/tmp/route_dto.json'))
    routes = data['routes']
    calls = json.loads(subprocess.run(['node', 'tools/audit/clientbodies.js', '--types'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    out = []
    for c in calls:
        if c.get('method') not in ('POST', 'PUT', 'PATCH'):
            continue
        backend = c.get('backend') or c['url']
        segs = [x for x in backend.split('/') if x]
        hit = None
        for key, v in routes.items():
            m, p = key.split(' ', 1)
            bs = [x for x in p.split('/') if x]
            if m == c['method'] and len(bs) == len(segs) and all(b.startswith(':') or b == '*' or a == ':x' or a == b for a, b in zip(segs, bs)):
                hit = (key, v); break
        if not hit or not hit[1].get('fields'):
            continue
        key, v = hit
        kinds = {k: v for k, v in (c.get('kinds') or {}).items() if k not in PROTO and not k.startswith('__@')}
        if len(kinds) < len(c.get('kinds') or {}) - 5:
            continue   # body is a string/FormData/variable, not an object literal: not statically comparable
        for k, kind in kinds.items():
            spec = v['fields'].get(k)
            if spec is None:
                out.append({'at': c['at'], 'route': key, 'dto': v['dto'], 'field': k, 'problem': 'UNDECLARED', 'sent': kind})
                continue
            want = dto_kind(spec)
            if not compatible(kind, want):
                out.append({'at': c['at'], 'route': key, 'dto': v['dto'], 'field': k, 'problem': 'TYPE', 'sent': kind, 'dto_type': want})
    day = datetime.date.today().isoformat()
    outp = os.path.join(ROOT, 'docs/review/evidence', f'contract_types_{day}.json')
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    json.dump(out, open(outp, 'w'), ensure_ascii=False, indent=1)
    t = sum(1 for x in out if x['problem'] == 'TYPE'); u = sum(1 for x in out if x['problem'] == 'UNDECLARED')
    print(f'type mismatches {t}, undeclared keys {u}  -> {outp}')
    for x in out:
        print(f"  {x['problem']:10s} {x['route']:55s} {x['field']:24s} sent={x['sent']} dto={x.get('dto_type', '-')}  @ {x['at']}")
    sys.exit(1 if out else 0)


if __name__ == '__main__':
    main()
