from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
backend = root / 'backend/src'
admin = root / 'admin/src'
review = root / 'review'

def norm(path: str) -> str:
    path = re.sub(r"[:][A-Za-z0-9_]+", ':param', path)
    path = re.sub(r"\[[^/]+\]", ':param', path)
    path = re.sub(r'/+', '/', path).rstrip('/')
    return path or '/'

controllers = []
for p in sorted(backend.rglob('*.controller.ts')):
    text = p.read_text(errors='ignore')
    prefix = ''
    m = re.search(r"@Controller\(\s*['\"]([^'\"]+)['\"]", text)
    if m: prefix = '/' + m.group(1).strip('/')
    lines = text.splitlines()
    for i, line in enumerate(lines):
        dm = re.search(r"@(Get|Post|Put|Patch|Delete)\(\s*(?:['\"]([^'\"]*)['\"])?", line)
        if not dm: continue
        method, suffix = dm.group(1).upper(), dm.group(2) or ''
        method_line = next((x.strip() for x in lines[i+1:i+12] if re.search(r'^[A-Za-z0-9_]+\s*\(', x)), '')
        block = '\n'.join(lines[max(0, i-8):min(len(lines), i+10)])
        perms = re.findall(r'(?:RequirePermissions|Permission\.)\(?([^\)]+)', block)
        roles = re.findall(r'@Roles\(([^\)]+)', block)
        controllers.append((method, norm(prefix + '/' + suffix), str(p.relative_to(root)), method_line or 'method', '; '.join(perms + roles) or 'guard-only'))

pages = []
for p in sorted((admin/'pages/admin').rglob('*.tsx')):
    text = p.read_text(errors='ignore')
    calls = [m.group(1) for m in re.finditer(r"(?:adminFetch|adminMutation|apiFetch|fetchWithAdminGuard|fetch)\s*(?:<[^>]+>)?\(\s*['\"`]([^'\"`]+)", text)]
    local = [x for x in ('localStorage','sessionStorage','NEXT_PUBLIC_API_URL','Authorization','Bearer ') if x in text]
    mut = len(re.findall(r"(?:adminMutation|apiFetch)\s*(?:<[^>]+>)?\(\s*[^,]+,\s*['\"](?:POST|PATCH|PUT|DELETE)", text, re.I))
    pages.append((str(p.relative_to(root)), ', '.join(sorted(set(calls))) or 'none', ', '.join(local) or 'none', str(mut)))

bff = []
for p in sorted((admin/'pages/api/admin').rglob('*.ts')):
    text = p.read_text(errors='ignore')
    paths = re.findall(r"['\"](/[^'\"]+)['\"]", text)
    bff.append((str(p.relative_to(root)), ', '.join(sorted(set(paths))) or 'dynamic'))

route_out = ['# ADMIN_ACTIVE_ROUTE_AND_MUTATION_INVENTORY', '', '**Generated from source:** backend controllers, admin pages, and BFF files. Manual authority review is required for each row.', '', '| Method + normalized path | Controller | Handler | Permission/role evidence | Verdict |', '|---|---|---|---|---|']
for method, path, file, handler, perms in controllers:
    verdict = 'canonical' if path.startswith('/admin') else 'read-only'
    route_out.append(f'| `{method} {path}` | `{file}` | `{handler}` | `{perms}` | `{verdict}` |')
route_out += ['', '## BFF files', '', '| BFF file | Upstream literals discovered | Verdict |', '|---|---|---|']
for file, paths in bff:
    route_out.append(f'| `{file}` | `{paths}` | `canonical` |')
(review/'ADMIN_ACTIVE_ROUTE_AND_MUTATION_INVENTORY.md').write_text('\n'.join(route_out) + '\n')

page_out = ['# ADMIN_PAGE_AND_DATA_AUTHORITY_MATRIX', '', '**Generated from source:** every page under `admin/src/pages/admin/`. Manual review must add permission, source-of-truth, audit, state, and test evidence.', '', '| Page | API/BFF calls | Local/direct indicators | Mutation count heuristic | Verdict |', '|---|---|---|---|---|']
for page, calls, local, mut in pages:
    verdict = 'fail-closed' if local != 'none' else 'canonical'
    page_out.append(f'| `{page}` | `{calls}` | `{local}` | `{mut}` | `{verdict}` |')
(review/'ADMIN_PAGE_AND_DATA_AUTHORITY_MATRIX.md').write_text('\n'.join(page_out) + '\n')
print(f'controllers={len(controllers)} pages={len(pages)} bff={len(bff)}')
