"""Screen / route / tab / modal / icon-control inventory for the four clients, plus backend surface.

  python3 tools/audit/screen_inventory.py [outDir=docs/review/inventory]

Complements ui_inventory.js (which lists controls and API calls per file). This one answers
"which screens exist and how is each reached":
  patient-app   expo-router files under app/ (route = file path; dynamic [x] segments kept)
  provider-app  React Navigation <X.Screen name=...> registrations + the component they mount
  patient-web   Next app router app/[locale]/**/page.tsx (+ route handlers app/api/**/route.ts)
  admin         Next pages router src/pages/**/*.tsx (+ src/pages/api/**)
For every screen file: tabs (Tab.Screen / tab arrays), modals (<Modal>, BottomSheet), icon-only
controls (onPress/onClick whose only child is an icon), inputs, buttons.
Backend: HTTP routes (via routes.py), @Cron jobs, @OnEvent handlers, @Processor queues, collections.
Writes <outDir>/screens.json and prints totals.
"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/review/inventory')


def read(p):
    return open(p, encoding='utf-8', errors='ignore').read()


def walk(base, exts=('.tsx', '.ts')):
    for r, ds, fs in os.walk(base):
        ds[:] = [d for d in ds if d not in ('node_modules', '__tests__', '.next', 'dist')]
        for f in fs:
            if f.endswith(exts) and not re.search(r'\.(test|spec)\.', f):
                yield os.path.join(r, f)


ICON = r'(?:Icon|MaterialSymbolsRounded|Ionicons|MaterialIcons|Feather|AppIcon|Svg|[A-Z][A-Za-z]*Icon)'
ICON_ONLY = re.compile(r'<(TouchableOpacity|Pressable|TouchableHighlight|button|IconButton)\b[^>]*(?:onPress|onClick)=[^>]*>\s*(?:<View[^>]*>\s*)?<' + ICON + r'\b[^>]*/>\s*(?:</View>\s*)?</\1>', re.S)
BUTTON = re.compile(r'\b(onPress|onClick|onLongPress)=')
INPUT = re.compile(r'<(TextInput|NInput|Input|input|textarea|select|Picker|Switch)\b')
MODAL = re.compile(r'<(Modal|BottomSheet|BottomSheetModal|Sheet|Dialog)\b')
TABS = re.compile(r'<[A-Za-z]*Tab[A-Za-z]*\.Screen\b|<Tabs\.Screen\b')


def scan_file(p):
    s = read(p)
    return {
        'buttons': len(BUTTON.findall(s)),
        'icon_only_controls': len(ICON_ONLY.findall(s)),
        'inputs': len(INPUT.findall(s)),
        'modals': len(MODAL.findall(s)),
        'tab_screens': len(TABS.findall(s)),
    }


def patient_app():
    base = os.path.join(ROOT, 'patient-app/app')
    out = []
    for p in walk(base, ('.tsx',)):
        rel = os.path.relpath(p, base)
        name = os.path.basename(rel)
        if name.startswith('_layout') or name.startswith('+'):
            continue
        route = '/' + re.sub(r'(^|/)\([^)]+\)', '', rel[:-4]).strip('/')
        route = re.sub(r'/index$', '', route) or '/'
        out.append({'route': route, 'file': os.path.relpath(p, ROOT), 'dynamic': '[' in route, **scan_file(p)})
    return out


def provider_app():
    base = os.path.join(ROOT, 'provider-app/src')
    reg = re.compile(r'<([A-Za-z]+)\.Screen\s+name=["\'{]+([^"\'}]+)["\'}]+[^>]*?component=\{([A-Za-z0-9_.]+)\}', re.S)
    reg2 = re.compile(r'<([A-Za-z]+)\.Screen\s+name=["\'{]+([^"\'}]+)["\'}]+', re.S)
    screens, files = [], {}
    for p in walk(base, ('.tsx',)):
        s = read(p)
        names = {m.group(2): m.group(3) for m in reg.finditer(s)}
        for m in reg2.finditer(s):
            n = m.group(2)
            screens.append({'navigator_file': os.path.relpath(p, ROOT), 'navigator': m.group(1), 'name': n, 'component': names.get(n)})
        if '/screens/' in p:
            files[os.path.relpath(p, ROOT)] = scan_file(p)
    return {'registered_screens': screens, 'screen_files': [{'file': f, **v} for f, v in sorted(files.items())]}


def patient_web():
    base = os.path.join(ROOT, 'patient-web/app')
    pages, handlers = [], []
    for p in walk(base, ('.tsx', '.ts')):
        rel = os.path.relpath(p, base)
        if rel.endswith('page.tsx'):
            route = '/' + re.sub(r'(^|/)\([^)]+\)', '', os.path.dirname(rel)).strip('/')
            comps = scan_file(p)
            # controls live mostly in components imported by the page; count the page dir's components too
            pages.append({'route': route, 'file': os.path.relpath(p, ROOT), 'dynamic': '[' in route.replace('[locale]', ''), **comps})
        elif rel.endswith('route.ts') and rel.startswith('api/'):
            s = read(p)
            handlers.append({'route': '/' + os.path.dirname(rel), 'methods': re.findall(r'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)', s)})
    return {'pages': pages, 'api_routes': handlers}


def admin():
    base = os.path.join(ROOT, 'admin/src/pages')
    pages, api = [], []
    for p in walk(base, ('.tsx', '.ts')):
        rel = os.path.relpath(p, base)
        if rel.startswith('api/'):
            api.append('/' + rel.rsplit('.', 1)[0])
            continue
        if os.path.basename(rel).startswith('_'):
            continue
        route = '/' + re.sub(r'/index$', '', rel.rsplit('.', 1)[0])
        pages.append({'route': route, 'file': os.path.relpath(p, ROOT), 'dynamic': '[' in route, **scan_file(p)})
    return {'pages': pages, 'api_routes': sorted(api)}


def backend():
    tmp = '/tmp/_routes_inv.json'
    subprocess.run([sys.executable, 'tools/audit/routes.py', tmp], cwd=ROOT, capture_output=True)
    routes = json.load(open(tmp)) if os.path.exists(tmp) else []
    cron, events, queues, collections = [], [], [], set()
    for p in walk(os.path.join(ROOT, 'backend/src'), ('.ts',)):
        s = read(p)
        rel = os.path.relpath(p, ROOT)
        cron += [{'file': rel, 'expr': m} for m in re.findall(r'@Cron\(\s*([^)]+)\)', s)]
        cron += [{'file': rel, 'expr': 'Interval ' + m} for m in re.findall(r'@Interval\(\s*([^)]+)\)', s)]
        events += [{'file': rel, 'event': m} for m in re.findall(r"@OnEvent\(\s*['\"]([^'\"]+)", s)]
        queues += [{'file': rel, 'queue': m} for m in re.findall(r"@Processor\(\s*['\"]([^'\"]+)", s)]
        collections.update(re.findall(r"collection:\s*['\"]([a-z_0-9]+)['\"]", s))
        collections.update(re.findall(r"\.collection\(\s*['\"]([a-z_0-9]+)['\"]", s))
    return {'http_routes': len({(r['m'], r['p']) for r in routes}), 'routes': routes, 'cron_jobs': cron,
            'event_handlers': events, 'queues': queues, 'collections': sorted(collections)}


def main():
    os.makedirs(OUT, exist_ok=True)
    inv = {'patient-app': patient_app(), 'provider-app': provider_app(), 'patient-web': patient_web(), 'admin': admin(), 'backend': backend()}
    head = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    inv['_meta'] = {'commit': head}
    json.dump(inv, open(os.path.join(OUT, 'screens.json'), 'w'), ensure_ascii=False, indent=1)

    def tot(rows):
        return {k: sum(r.get(k, 0) for r in rows) for k in ('buttons', 'icon_only_controls', 'inputs', 'modals', 'tab_screens')}
    pa = inv['patient-app']; pv = inv['provider-app']; pw = inv['patient-web']; ad = inv['admin']; be = inv['backend']
    print(f'commit {head}')
    print(f"patient-app : {len(pa)} route files ({sum(r['dynamic'] for r in pa)} dynamic) {tot(pa)}")
    print(f"provider-app: {len(pv['registered_screens'])} navigator registrations, {len(pv['screen_files'])} screen files {tot(pv['screen_files'])}")
    print(f"patient-web : {len(pw['pages'])} pages ({sum(r['dynamic'] for r in pw['pages'])} dynamic), {len(pw['api_routes'])} BFF route handlers {tot(pw['pages'])} (page files only)")
    print(f"admin       : {len(ad['pages'])} pages ({sum(r['dynamic'] for r in ad['pages'])} dynamic), {len(ad['api_routes'])} BFF api files {tot(ad['pages'])}")
    print(f"backend     : {be['http_routes']} HTTP routes, {len(be['cron_jobs'])} cron/interval jobs, {len(be['event_handlers'])} event handlers, {len(be['queues'])} queues, {len(be['collections'])} collections referenced")


if __name__ == '__main__':
    main()
