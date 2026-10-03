"""Merge the native crawl shards into one report.

  python3 tools/native/report.py /tmp/native/all > /tmp/native/all/NATIVE_REPORT.md

Input: the result files of every crawl job (<dir>/**/patient_shard*.json, provider_*.json, login_*.txt).
Output: totals per app and result, then every finding (crash, JS error, error text, raw values, stuck
loading, permission prompts, other apps opened, fields that refuse input, login failures), with screenshots.
"""
import collections, glob, json, os, sys

d = sys.argv[1]
files = sorted(glob.glob(os.path.join(d, '**', 'patient_shard*.json'), recursive=True) + glob.glob(os.path.join(d, '**', 'provider_*.json'), recursive=True))
tot, finds, screens = collections.Counter(), [], collections.Counter()
for f in files:
    data = json.load(open(f))
    app = data['app'] + (f" ({data['ptype']})" if data.get('ptype') else '')
    rel = os.path.relpath(os.path.dirname(f), d)
    for s in data['screens']:
        screens[app] += 1
        name = s.get('screen')
        if s.get('result') == 'CRAWLER_TARGET_MISSING':
            finds.append((app, name, 'CRAWLER_TARGET_MISSING', '', ''))
            continue
        if not s.get('ready', True):
            finds.append((app, name, 'NOT_READY', f"{s.get('time_to_ready_ms')} ms (spinner or changing UI)", s.get('shot', '')))
        if s.get('error_text'):
            finds.append((app, name, 'ERROR_TEXT', ', '.join(s['error_text']), s.get('shot', '')))
        if s.get('raw_values'):
            finds.append((app, name, 'RAW_VALUE', ', '.join(s['raw_values'][:4]), s.get('shot', '')))
        if s.get('js_errors'):
            finds.append((app, name, 'JS_ERROR_ON_OPEN', s['js_errors'][0][:160], s.get('shot', '')))
        if s.get('on_open'):
            finds.append((app, name, 'ON_OPEN', s['on_open'], s.get('shot', '')))
        if s.get('landed_outside'):
            finds.append((app, name, 'LANDED_OUTSIDE_APP', s['landed_outside'], s.get('shot', '')))
        for c in s.get('controls', []):
            r = c['result'].split('(')[0]
            tot[(app, r)] += 1
            if r in ('CRASH', 'JS_ERROR', 'PERMISSION_PROMPT', 'EXTERNAL', 'INPUT_NOT_ACCEPTED') or c.get('after_error_text') or c.get('after_raw_values'):
                det = c['result'] + (' — ' + c['js_errors'][0][:140] if c.get('js_errors') else '')
                if c.get('after_error_text') or c.get('after_raw_values'):
                    det += ' — after tap: ' + ', '.join((c.get('after_error_text') or []) + (c.get('after_raw_values') or [])[:3])
                finds.append((app, name, f"control «{c['label']}»", det, os.path.join(rel, c.get('shot', '')) if c.get('shot') else ''))
for f in sorted(glob.glob(os.path.join(d, '**', 'login_*.txt'), recursive=True)):
    txt = open(f).read().strip()
    if txt != 'ok':
        finds.append(('login', os.path.basename(f), 'LOGIN_FAILED', txt[:200], ''))

print('# Native Android crawl — results\n')
print('| App | Screens | ' + ' | '.join(['NAVIGATE', 'UI_CHANGE', 'NO_EFFECT', 'CRASH', 'JS_ERROR', 'PERMISSION_PROMPT', 'EXTERNAL', 'ACCEPTS_INPUT', 'INPUT_NOT_ACCEPTED', 'SKIPPED_DESTRUCTIVE']) + ' |')
print('|---|---|' + '---|' * 10)
for app in sorted(screens):
    print(f'| {app} | {screens[app]} | ' + ' | '.join(str(tot[(app, k)]) for k in ['NAVIGATE', 'UI_CHANGE', 'NO_EFFECT', 'CRASH', 'JS_ERROR', 'PERMISSION_PROMPT', 'EXTERNAL', 'ACCEPTS_INPUT', 'INPUT_NOT_ACCEPTED', 'SKIPPED_DESTRUCTIVE']) + ' |')
print(f'\n## Findings ({len(finds)})\n')
print('| App | Screen | Kind | Detail | Screenshot |\n|---|---|---|---|---|')
for a, s, k, det, shot in finds:
    print(f"| {a} | `{s}` | {k} | {str(det).replace('|', '/')} | {shot} |")
