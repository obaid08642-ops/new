"""Parse class-validator DTO classes into {field: {decorators, ts_type}} (no TS compiler needed).
  from dto_fields import parse; parse('backend/src/.../x.dto.ts')['Step2Dto']
"""
import re

PROP = re.compile(r'^\s*(?:readonly\s+)?([a-zA-Z_]\w*)\s*[?!]?\s*:\s*([^;=]+?)\s*[;=]')
DEC = re.compile(r'@(\w+)\(([^@]*?)\)(?=\s*(?:@|$|\n|[a-zA-Z_]))', re.S)


def parse(path):
    src = open(path, encoding='utf-8').read()
    classes = {}
    for m in re.finditer(r'export class (\w+)(?:\s+extends\s+(\w+))?\s*\{', src):
        i, depth = m.end() - 1, 0
        for j in range(i, len(src)):
            depth += {'{': 1, '}': -1}.get(src[j], 0)
            if depth == 0:
                break
        body = src[i + 1:j]
        fields, pending = {}, ''
        for line in body.split('\n'):
            stripped = re.sub(r'//.*', '', line).strip()
            if not stripped:
                continue
            pm = PROP.match(re.sub(r'(@\w+\((?:[^()]|\([^()]*\))*\)\s*)+', '', stripped)) if not stripped.startswith('@') or re.search(r'\)\s*[a-zA-Z_]\w*\s*[?!]?\s*:', stripped) else None
            decs_text = pending + ' ' + stripped
            if pm:
                decs = {}
                for d in re.finditer(r'@(\w+)\(((?:[^()]|\([^()]*\))*)\)', decs_text):
                    decs[d.group(1)] = d.group(2).strip()
                fields[pm.group(1)] = {'decorators': decs, 'ts_type': pm.group(2).strip()}
                pending = ''
            else:
                pending = decs_text
        classes[m.group(1)] = {'extends': m.group(2), 'fields': fields}
    for c in classes.values():  # inherit
        base = c['extends']
        while base and base in classes:
            for k, v in classes[base]['fields'].items():
                c['fields'].setdefault(k, v)
            base = classes[base]['extends']
    return {k: v['fields'] for k, v in classes.items()}
