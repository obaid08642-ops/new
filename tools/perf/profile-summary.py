#!/usr/bin/env python3
"""Where a backend spends its CPU: summarise a Node --cpu-prof file by package, and list the hottest functions of the steady state.

  NODE_EXTRA_FLAGS="--cpu-prof --cpu-prof-dir=/tmp/prof" bash tools/live/start-backend.sh   # then run the load, then SIGTERM the node process
  python3 tools/perf/profile-summary.py /tmp/prof/CPU.*.cpuprofile [--skip-seconds 28] [--top 25]

--skip-seconds drops the start of the process (module loading and index sync happen there, not under load).
Prints (1) the share of busy time per package (mongoose, express, app code, node internals...) and (2) the top self-time functions.
Test stacks only: the profile contains function names and file paths, never request data.
"""
import argparse, collections, json, re

ap = argparse.ArgumentParser()
ap.add_argument('profile')
ap.add_argument('--skip-seconds', type=float, default=28)
ap.add_argument('--top', type=int, default=25)
a = ap.parse_args()

p = json.load(open(a.profile))
nodes = {n['id']: n for n in p['nodes']}
t = p['startTime']
selft = collections.Counter()
for s, d in zip(p['samples'], p['timeDeltas']):
    t += d
    if (t - p['startTime']) / 1e6 >= a.skip_seconds:
        selft[s] += d


def pkg(cf):
    url, fn = cf['url'], cf['functionName']
    if not url:
        return f'(native: {fn})'
    m = re.search(r'node_modules/((?:@[^/]+/)?[^/]+)', url)
    if m:
        return m.group(1)
    if url.startswith('node:'):
        return 'node:internal'
    m = re.search(r'/dist/([^/]+)/', url)
    return 'app:' + m.group(1) if m else 'app:root'


def label(cf):
    m = re.search(r'node_modules/((?:@[^/]+/)?[^/]+)/(.*)', cf['url'])
    if m:
        return f"{m.group(1)}/{m.group(2)[-32:]}:{cf['functionName']}"
    m = re.search(r'/dist/(.*)', cf['url'])
    return f"{m.group(1) if m else cf['url'][-32:] or '(native)'}:{cf['functionName']}"


total = sum(selft.values())
by_pkg = collections.Counter()
by_fn = collections.Counter()
for i, v in selft.items():
    cf = nodes[i]['callFrame']
    by_pkg[pkg(cf)] += v
    by_fn[label(cf)] += v
idle = by_pkg.get('(native: (idle))', 0)
busy = total - idle
print(f'steady state: {total / 1e6:.1f} s sampled, {idle / 1e6:.1f} s idle, {busy / 1e6:.1f} s busy')
print('\nshare of busy CPU by package')
for k, v in by_pkg.most_common(a.top):
    if k != '(native: (idle))':
        print(f'{100 * v / busy:6.1f}%  {k}')
# self time of mongoose / bson / mongodb attributed to the nearest application function above it on the stack: who asks for the documents
parent = {c: n['id'] for n in p['nodes'] for c in n.get('children', [])}
asked = collections.Counter()
for i, v in selft.items():
    u = nodes[i]['callFrame']['url']
    if not re.search(r'node_modules/(mongoose|bson|mongodb)/', u):
        continue
    j, who = i, '(no application frame)'
    while j is not None:
        cf = nodes[j]['callFrame']
        if '/dist/' in cf['url'] and 'node_modules' not in cf['url']:
            who = label(cf) + ':' + str(cf['lineNumber'])
            break
        j = parent.get(j)
    asked[who] += v
print('\nMongoose/BSON time by the application function that asked')
for k, v in asked.most_common(a.top):
    print(f'{v / 1000:8.0f} ms  {k}')
print('\nhottest functions (self time)')
for k, v in by_fn.most_common(a.top + 1):
    if '(idle)' not in k:
        print(f'{v / 1000:8.0f} ms  {k}')
