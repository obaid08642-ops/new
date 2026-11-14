#!/usr/bin/env python3
"""Call-ring readiness of a BUILT app, no push key and no device needed (docs/qa/push-calls-matrix.md).

  python3 tools/native/calls_static_check.py android <app.apk | AndroidManifest.xml | aapt2-dump.txt> [--app patient|provider]
  python3 tools/native/calls_static_check.py ios <Info.plist (xml/binary) | .app dir> [--app ...]

Android: the merged manifest of the release APK must declare what a ringing killed/locked phone needs: the CallKeep ConnectionService
(bound by the system telecom stack, `BIND_TELECOM_CONNECTION_SERVICE`, action `android.telecom.ConnectionService`) and the call permissions.
iOS: Info.plist UIBackgroundModes has `voip` and `remote-notification`, and the binary links PushKit (only a PushKit VoIP push can start
CallKit while the app is killed). Prints one line per check (PASS / FAIL) and a table for $GITHUB_STEP_SUMMARY.
Exit 1 when a REQUIRED check fails; the others are known gaps listed in the matrix and are reported, not hidden.
"""
import json, os, plistlib, re, subprocess, sys, glob, xml.etree.ElementTree as ET

ANDROID_NS = '{http://schemas.android.com/apk/res/android}'
CALL_SERVICE = 'io.wazo.callkeep.VoiceConnectionService'
PERMS = ['android.permission.MANAGE_OWN_CALLS', 'android.permission.USE_FULL_SCREEN_INTENT',
         'android.permission.FOREGROUND_SERVICE_PHONE_CALL', 'android.permission.FOREGROUND_SERVICE_MICROPHONE']
# regression guards: true today in both apps, must stay true
REQUIRED_ANDROID = {'perm:' + p for p in PERMS} | {'service:connection', 'service:bind-permission'}
REQUIRED_IOS = {'plist:voip', 'plist:remote-notification'}


def manifest_from_xml(text):
    root = ET.fromstring(text)
    perms = {e.get(ANDROID_NS + 'name') for e in root.iter('uses-permission')}
    services = []
    for s in root.iter('service'):
        actions = {a.get(ANDROID_NS + 'name') for a in s.iter('action')}
        services.append({'name': s.get(ANDROID_NS + 'name'), 'permission': s.get(ANDROID_NS + 'permission'), 'actions': actions})
    return perms, services


def manifest_from_aapt_dump(text):
    """`aapt2 dump xmltree --file AndroidManifest.xml app.apk`: indented `E:` elements with `A:` attributes."""
    perms, services, cur, depth_stack = set(), [], None, []
    for line in text.splitlines():
        m = re.match(r'^(\s*)E: (\S+)', line)
        if m:
            depth = len(m.group(1)); name = m.group(2)
            while depth_stack and depth_stack[-1][0] >= depth: depth_stack.pop()
            depth_stack.append((depth, name))
            cur = {'tag': name}
            if name == 'service': services.append({'name': None, 'permission': None, 'actions': set()}); cur = services[-1]; cur['tag'] = 'service'
            elif name == 'action' and services and any(t == 'service' for _, t in depth_stack): cur = {'tag': 'action', 'svc': services[-1]}
            elif name == 'uses-permission': cur = {'tag': 'perm'}
            continue
        a = re.search(r':(name|permission)\(0x[0-9a-f]+\)="([^"]*)"', line)
        if a and cur:
            key, val = a.groups()
            if cur.get('tag') == 'perm' and key == 'name': perms.add(val)
            elif cur.get('tag') == 'service': cur['name' if key == 'name' else 'permission'] = val
            elif cur.get('tag') == 'action' and 'svc' in cur and key == 'name': cur['svc']['actions'].add(val)
    return perms, services


def android_checks(path):
    if path.endswith('.apk'):
        tool = next(iter(sorted(glob.glob(os.path.join(os.environ.get('ANDROID_HOME', os.environ.get('ANDROID_SDK_ROOT', '')), 'build-tools', '*', 'aapt2')))[::-1]), 'aapt2')
        out = subprocess.run([tool, 'dump', 'xmltree', '--file', 'AndroidManifest.xml', path], capture_output=True, text=True, check=True).stdout
        perms, services = manifest_from_aapt_dump(out)
    else:
        text = open(path, encoding='utf8').read()
        perms, services = manifest_from_xml(text) if text.lstrip().startswith('<') else manifest_from_aapt_dump(text)
    svc = next((s for s in services if s['name'] == CALL_SERVICE), None)
    res = {'perm:' + p: p in perms for p in PERMS}
    res['service:connection'] = bool(svc and 'android.telecom.ConnectionService' in svc['actions'])
    res['service:bind-permission'] = bool(svc and svc['permission'] == 'android.permission.BIND_TELECOM_CONNECTION_SERVICE')
    return res


def ios_checks(path):
    app = path if os.path.isdir(path) else None
    plist_path = os.path.join(path, 'Info.plist') if app else path
    info = plistlib.load(open(plist_path, 'rb'))
    modes = set(info.get('UIBackgroundModes') or [])
    res = {'plist:voip': 'voip' in modes, 'plist:remote-notification': 'remote-notification' in modes}
    if app:
        binary = os.path.join(app, info.get('CFBundleExecutable', ''))
        out = subprocess.run(['otool', '-L', binary], capture_output=True, text=True).stdout if os.path.exists(binary) else ''
        res['binary:pushkit'] = 'PushKit.framework' in out
    return res


def main(argv):
    if len(argv) < 3 or argv[1] not in ('android', 'ios'):
        print(__doc__); return 2
    kind, path = argv[1], argv[2]
    app = argv[argv.index('--app') + 1] if '--app' in argv else os.path.basename(path)
    res = android_checks(path) if kind == 'android' else ios_checks(path)
    required = REQUIRED_ANDROID if kind == 'android' else REQUIRED_IOS
    bad = 0
    rows = []
    for k, ok in sorted(res.items()):
        gate = k in required
        print(f"{'PASS' if ok else 'FAIL'}  {kind} {app}  {k}" + ('' if gate else '   (known gap, reported)'))
        rows.append(f"| {app} | {kind} | `{k}` | {'PASS' if ok else 'FAIL'} | {'required' if gate else 'reported'} |")
        if gate and not ok: bad += 1
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as f:
            f.write('\n### Call-ring readiness (static, no key)\n| app | os | check | result | gate |\n|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
