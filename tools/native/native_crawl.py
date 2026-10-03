"""Native Android crawler: opens every screen of patient-app / provider-app on a real Android emulator and taps
every control, recording what the web build could not prove.

  python3 tools/native/native_crawl.py patient  --routes routes.json --shard 0/6 --out /tmp/native/out
  python3 tools/native/native_crawl.py provider --ptype pharmacy --out /tmp/native/out

Driven over adb (uiautomator dump + input tap), so each tap costs ~1 s instead of a test-runner round trip.
Login is done before this by the Maestro flows in tools/native/flows. Per screen it records:
  render: time_to_ready_ms, stuck loading, error text on screen, raw values (undefined/NaN/[object Object]),
          JS errors and native crashes from logcat, process death;
  every control: NAVIGATE / UI_CHANGE / NO_EFFECT / CRASH / JS_ERROR / PERMISSION_PROMPT(<text>) /
          EXTERNAL(<package>) / SKIPPED_DESTRUCTIVE / TAP_FAILED;
  every text field: accepts input or not.
Screenshots are taken for every screen and for every control whose result is not NAVIGATE/UI_CHANGE/NO_EFFECT.
Results: <out>/<app>[_<ptype>|_shard<i>].json (merged by tools/native/report.py).
"""
import argparse, hashlib, json, os, re, subprocess, time
import xml.etree.ElementTree as ET

PKG = {'patient': 'com.patient.nabd', 'provider': 'com.nabd.provider'}
SCHEME = {'patient': 'nabdplus', 'provider': 'nabdplus-provider'}
PERMISSION_PKGS = ('com.google.android.permissioncontroller', 'com.android.permissioncontroller', 'com.android.packageinstaller')
ALLOW = re.compile(r'^(While using the app|Only this time|Allow|السماح|أثناء استخدام التطبيق|هذه المرة فقط)$', re.I)
DESTRUCTIVE = re.compile(r'(حذف|إلغاء الحساب|تسجيل الخروج|خروج|تعطيل الحساب|delete|log ?out|sign ?out|deactivate|remove account)', re.I)
ERROR_TEXT = re.compile(r'(حدث خطأ|خطأ غير متوقع|تعذر تحميل|فشل التحميل|Something went wrong|Unexpected error|Network Error|'
                        r'Request failed with status|Cannot read propert|is not a function|الصفحة غير متاحة|\b404\b|\b500\b)', re.I)
RAW_VALUE = re.compile(r'(\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|Invalid Date|\{\{|\}\})')
VOLATILE = re.compile(r'\d')
TAP_LIMIT = int(os.environ.get('NATIVE_TAP_LIMIT', '20'))
READY_TIMEOUT = float(os.environ.get('NATIVE_READY_TIMEOUT', '12'))


def adb(*args, timeout=30, check=False):
    r = subprocess.run(['adb', *args], capture_output=True, timeout=timeout)
    if check and r.returncode:
        raise RuntimeError(r.stderr.decode(errors='ignore'))
    return r.stdout.decode(errors='ignore')


def sh(cmd, timeout=30):
    return adb('shell', cmd, timeout=timeout)


class Device:
    def __init__(self, app, out):
        self.app, self.pkg, self.out = app, PKG[app], out
        os.makedirs(os.path.join(out, 'shots'), exist_ok=True)

    # ---------- observation ----------
    def dump(self):
        for _ in range(3):
            raw = adb('exec-out', 'uiautomator', 'dump', '--compressed', '/dev/tty', timeout=20)
            raw = raw[raw.find('<?xml'):raw.rfind('</hierarchy>') + len('</hierarchy>')] if '<?xml' in raw else ''
            if raw:
                try:
                    return ET.fromstring(raw)
                except ET.ParseError:
                    pass
            time.sleep(0.5)
        return None

    @staticmethod
    def nodes(root):
        out = []
        if root is None:
            return out
        for n in root.iter('node'):
            m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.get('bounds', ''))
            if not m:
                continue
            x1, y1, x2, y2 = map(int, m.groups())
            out.append({'text': n.get('text', ''), 'desc': n.get('content-desc', ''), 'cls': n.get('class', ''),
                        'rid': n.get('resource-id', ''), 'pkg': n.get('package', ''), 'clickable': n.get('clickable') == 'true',
                        'enabled': n.get('enabled') == 'true', 'editable': n.get('class', '').endswith('EditText'),
                        'hint': n.get('hint', ''), 'bounds': (x1, y1, x2, y2)})
        return out

    @staticmethod
    def signature(ns):
        key = '|'.join(sorted(f"{n['cls']}:{VOLATILE.sub('#', n['text'])}:{VOLATILE.sub('#', n['desc'])}" for n in ns if n['text'] or n['desc'] or n['clickable']))
        return hashlib.sha1(key.encode()).hexdigest()[:12]

    def fg_pkg(self, ns):
        pk = [n['pkg'] for n in ns if n['pkg']]
        return max(set(pk), key=pk.count) if pk else ''

    def alive(self):
        return bool(sh(f'pidof {self.pkg}').strip())

    def log_mark(self):
        adb('logcat', '-c')

    def log_errors(self):
        txt = adb('logcat', '-d', '-v', 'brief', 'ReactNativeJS:E', 'ReactNative:E', 'AndroidRuntime:E', 'libc:F', 'DEBUG:F', '*:S', timeout=20)
        errs = []
        for line in txt.splitlines():
            if re.match(r'^[EF]/(ReactNativeJS|ReactNative|AndroidRuntime|libc|DEBUG)', line):
                msg = line.split(':', 1)[1].strip() if ':' in line else line
                if msg and not re.search(r'(Possible unhandled promise rejection.*Network request failed|VirtualizedList)', msg):
                    errs.append(msg[:300])
        return errs[:10]

    def shot(self, name):
        path = os.path.join(self.out, 'shots', re.sub(r'[^\w.-]+', '_', name)[:120] + '.png')
        with open(path, 'wb') as f:
            f.write(subprocess.run(['adb', 'exec-out', 'screencap', '-p'], capture_output=True, timeout=30).stdout)
        return os.path.relpath(path, self.out)

    def wait_ready(self, timeout=READY_TIMEOUT):
        """Condition-based: the UI tree is unchanged twice in a row and shows no spinner (android.widget.ProgressBar)."""
        t0, last, ns = time.time(), None, []
        while time.time() - t0 < timeout:
            ns = self.nodes(self.dump())
            sig = self.signature(ns)
            spinning = any(n['cls'] == 'android.widget.ProgressBar' for n in ns)
            if sig == last and not spinning and ns:
                return ns, int((time.time() - t0) * 1000), True
            last = sig
            time.sleep(0.4)
        return ns, int((time.time() - t0) * 1000), False

    # ---------- actions ----------
    def tap(self, n):
        x1, y1, x2, y2 = n['bounds']
        sh(f'input tap {(x1 + x2) // 2} {(y1 + y2) // 2}')

    def back(self):
        sh('input keyevent 4')

    def launch(self):
        sh(f'monkey -p {self.pkg} -c android.intent.category.LAUNCHER 1')

    def open_link(self, path):
        sh(f"am start -W -a android.intent.action.VIEW -d '{SCHEME[self.app]}:///{path.lstrip('/')}' {self.pkg}", timeout=40)

    def handle_system(self, ns):
        """Permission dialogs and other apps: record them, then get back into the app."""
        pkg = self.fg_pkg(ns)
        if pkg in PERMISSION_PKGS:
            text = ' / '.join(n['text'] for n in ns if n['text'] and len(n['text']) > 12)[:160]
            allow = next((n for n in ns if ALLOW.match(n['text'] or '')), None)
            if allow:
                self.tap(allow)
                time.sleep(1)
            return f'PERMISSION_PROMPT({text})'
        if pkg and pkg != self.pkg and not pkg.startswith('com.android.systemui'):
            self.back()
            time.sleep(1)
            if self.fg_pkg(self.nodes(self.dump())) != self.pkg:
                self.launch()
                time.sleep(2)
            return f'EXTERNAL({pkg})'
        return None

    def screen_issues(self, ns):
        texts = [t for n in ns for t in (n['text'], n['desc']) if t]
        err = sorted({m.group(0) for t in texts for m in [ERROR_TEXT.search(t)] if m})
        raw = sorted({t[:80] for t in texts if RAW_VALUE.search(t)})
        return err, raw

    @staticmethod
    def label(n):
        return (n['text'] or n['desc'] or n['hint'] or n['rid'].split('/')[-1] or n['cls'].split('.')[-1])[:60]

    def controls(self, ns):
        h = max((n['bounds'][3] for n in ns), default=2400)
        seen, out = set(), []
        for n in ns:
            if not (n['clickable'] or n['editable']) or n['pkg'] != self.pkg:
                continue
            x1, y1, x2, y2 = n['bounds']
            if x2 - x1 < 8 or y2 - y1 < 8 or y1 < 60 or y2 > h:
                continue
            k = (self.label(n), x1 // 20, y1 // 20)
            if k in seen:
                continue
            seen.add(k)
            out.append(n)
        return sorted(out, key=lambda n: n['editable'])  # buttons first; fields last (filling changes the screen)

    def fill(self, n):
        hint = f"{n['hint']} {n['text']} {n['desc']} {n['rid']}".lower()
        val = ('0501234567' if re.search(r'(phone|جوال|هاتف|mobile|05)', hint) else
               'native.test@nabd.test' if re.search(r'(mail|بريد)', hint) else
               '5' if re.search(r'(age|عمر|qty|كمية|number|رقم|amount|مبلغ|weight|وزن|height|طول)', hint) else 'test note')
        self.tap(n)
        time.sleep(0.4)
        sh("input text '" + val.replace(' ', '%s') + "'")  # adb input text: %s is a space
        time.sleep(0.4)
        after = [m for m in self.nodes(self.dump()) if m['editable'] and m['bounds'] == n['bounds']]
        if 'mInputShown=true' in sh('dumpsys input_method | grep mInputShown'):
            self.back()  # close the keyboard only; a back press without it would leave the screen
        return 'ACCEPTS_INPUT' if after and after[0]['text'] and after[0]['text'] != n['text'] else 'INPUT_NOT_ACCEPTED'


def classify(dev, before_sig, ns_after, errs, alive):
    if not alive:
        return 'CRASH'
    sysres = dev.handle_system(ns_after)
    if sysres:
        return sysres
    if errs:
        return 'JS_ERROR'
    sig = dev.signature(ns_after)
    if sig == before_sig:
        return 'NO_EFFECT'
    return 'UI_CHANGE'


def explore_screen(dev, name, reopen, ns0, ready_ms, ready):
    """Render checks plus every control on the screen; `reopen` puts the app back on this screen."""
    sig0 = dev.signature(ns0)
    err, raw = dev.screen_issues(ns0)
    rec = {'screen': name, 'time_to_ready_ms': ready_ms, 'ready': ready, 'error_text': err, 'raw_values': raw,
           'js_errors': dev.log_errors(), 'shot': dev.shot(name), 'controls': []}
    for n in dev.controls(ns0)[:TAP_LIMIT]:
        lab = dev.label(n)
        if DESTRUCTIVE.search(lab):
            rec['controls'].append({'label': lab, 'result': 'SKIPPED_DESTRUCTIVE'})
            continue
        if n['editable']:
            rec['controls'].append({'label': lab, 'kind': 'input', 'result': dev.fill(n)})
            continue
        dev.log_mark()
        t0 = time.time()
        dev.tap(n)
        ns1, _, _ = dev.wait_ready(timeout=6)
        errs = dev.log_errors()
        res = classify(dev, sig0, ns1, errs, dev.alive())
        if res == 'UI_CHANGE' and dev.fg_pkg(ns1) == dev.pkg:
            texts0 = {x['text'] for x in ns0 if x['text']}
            texts1 = {x['text'] for x in ns1 if x['text']}
            if len(texts0 & texts1) < 0.5 * max(1, len(texts0)):
                res = 'NAVIGATE'
        c = {'label': lab, 'result': res, 'response_ms': int((time.time() - t0) * 1000)}
        if errs:
            c['js_errors'] = errs
        if res not in ('NAVIGATE', 'UI_CHANGE', 'NO_EFFECT'):
            c['shot'] = dev.shot(f'{name}__{lab}')
        e2, r2 = dev.screen_issues(ns1)
        if e2 or r2:
            c['after_error_text'], c['after_raw_values'] = e2, r2
        rec['controls'].append(c)
        if res == 'CRASH':
            dev.launch()
            time.sleep(4)
        if res != 'NO_EFFECT':
            dev.back()
            time.sleep(0.8)
            if dev.signature(dev.nodes(dev.dump())) != sig0:
                reopen()
        # NO_EFFECT: still on the same screen
    return rec


def run_patient(args):
    dev = Device('patient', args.out)
    routes = json.load(open(args.routes))
    i, k = map(int, args.shard.split('/'))
    mine = [r for j, r in enumerate(routes) if j % k == i]
    res = []
    for r in mine:
        path = r['path']
        dev.log_mark()
        dev.open_link(path)
        ns, ms, ready = dev.wait_ready()
        sysres = dev.handle_system(ns)
        if sysres:
            ns, ms2, ready = dev.wait_ready()
            ms += ms2
        rec = explore_screen(dev, r['route'], lambda: (dev.open_link(path), dev.wait_ready()), ns, ms, ready)
        rec.update({'route': r['route'], 'path': path, 'alive': dev.alive(), 'on_open': sysres})
        landed = dev.fg_pkg(ns)
        if landed != dev.pkg:
            rec['landed_outside'] = landed
        res.append(rec)
        if not dev.alive():
            dev.launch()
            time.sleep(4)
        print(f"{r['route']:50s} ready={ready} {ms}ms ctl={len(rec['controls'])} err={rec['error_text'] or ''} js={len(rec['js_errors'])}", flush=True)
    json.dump({'app': 'patient-app', 'shard': args.shard, 'screens': res}, open(os.path.join(args.out, f'patient_shard{i}.json'), 'w'), ensure_ascii=False, indent=1)


def run_provider(args):
    """Breadth-first from the dashboard: depth 0 = dashboard, depth 1 = every screen one tap away,
    depth 2 = screens one tap further (limited), reached by replaying the tap path after a relaunch."""
    dev = Device('provider', args.out)
    max_depth, max_screens = int(os.environ.get('NATIVE_DEPTH', '2')), int(os.environ.get('NATIVE_MAX_SCREENS', '45'))

    def home():
        sh(f'am force-stop {dev.pkg}')
        dev.launch()
        ns, _, _ = dev.wait_ready(timeout=20)
        dev.handle_system(ns)
        return ns

    def replay(path):
        ns = home()
        for lab in path:
            n = next((c for c in dev.controls(ns) if dev.label(c) == lab), None)
            if not n:
                return None
            dev.tap(n)
            ns, _, _ = dev.wait_ready(timeout=8)
            dev.handle_system(ns)
        return ns

    seen, queue, res = set(), [[]], []
    while queue and len(res) < max_screens:
        path = queue.pop(0)
        dev.log_mark()
        t0 = time.time()
        ns = replay(path)
        if ns is None:
            res.append({'screen': ' > '.join(path) or 'dashboard', 'path': path, 'result': 'CRAWLER_TARGET_MISSING'})
            continue
        sig = dev.signature(ns)
        if sig in seen:
            continue
        seen.add(sig)
        ready_ms = int((time.time() - t0) * 1000)
        name = f"{args.ptype}:{' > '.join(path) or 'dashboard'}"
        rec = explore_screen(dev, name, lambda p=path: replay(p), ns, ready_ms, True)
        rec.update({'path': path, 'alive': dev.alive()})
        res.append(rec)
        if len(path) < max_depth:
            for c in rec['controls']:
                if c.get('result') == 'NAVIGATE':
                    queue.append(path + [c['label']])
        print(f"{name[:70]:70s} ctl={len(rec['controls'])} err={rec['error_text'] or ''} js={len(rec['js_errors'])}", flush=True)
    json.dump({'app': 'provider-app', 'ptype': args.ptype, 'screens': res}, open(os.path.join(args.out, f'provider_{args.ptype}.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('app', choices=['patient', 'provider'])
    ap.add_argument('--routes')
    ap.add_argument('--shard', default='0/1')
    ap.add_argument('--ptype')
    ap.add_argument('--out', default='/tmp/native/out')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    (run_patient if a.app == 'patient' else run_provider)(a)
