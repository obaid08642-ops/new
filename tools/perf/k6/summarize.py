"""P14.27: one markdown report from a ladder.sh run (k6 --summary-export per step + CPU samples).
  python3 tools/perf/k6/summarize.py <dir> <vus> [<vus> ...]
In k6's summary export a threshold value of true means the threshold FAILED.
Exits 1 when the first (lightest) step has failed requests or is missing: then the scenario itself is broken, not slow."""
import json, os, sys

TARGETS = [('public_api', 'public reads', 300), ('logged_in_api', 'logged-in reads', 500), ('chat', 'chat', 500),
           ('call_join', 'call join', 500), ('checkout', 'add to cart', 800), ('booking', 'booking', 800),
           ('payment_webhook', 'payment webhook', 800)]


def checks(group, out):
    for c in (group.get('checks') or {}).values():
        out[c['name']] = (out.get(c['name'], (0, 0))[0] + c['passes'], out.get(c['name'], (0, 0))[1] + c['fails'])
    for g in (group.get('groups') or {}).values():
        checks(g, out)
    return out


def cpu(path):
    rows = [list(map(int, l.split())) for l in open(path) if l.strip()] if os.path.exists(path) else []
    if not rows:
        return '-', '-'
    col = lambda i: f"{round(sum(r[i] for r in rows) / len(rows))} / {max(r[i] for r in rows)}"
    return col(0), col(1)


def main(d, steps):
    head = ['VUs', 'req/s'] + [f'{label} p95 (<{t})' for _, label, t in TARGETS] + ['errors', 'all targets met', 'backend CPU avg / max %', 'Mongo CPU avg / max %']
    print('| ' + ' | '.join(head) + ' |')
    print('|' + '---|' * len(head))
    per_endpoint, ceiling, first_break, failed_checks = {}, None, None, {}
    broken = not os.path.exists(os.path.join(d, f'step-{steps[0]}.json'))
    for vus in steps:
        p = os.path.join(d, f'step-{vus}.json')
        if not os.path.exists(p):
            continue
        m = json.load(open(p))['metrics']
        failed = [k for k, v in m.items() if any((v.get('thresholds') or {}).values()) and not k.startswith('http_req_duration{')]
        row = [str(vus), f"{m['http_reqs']['rate']:.0f}"]
        for key, _, target in TARGETS:
            v = m.get(key, {}).get('p(95)')
            row.append('-' if not v else (f'**{v:.0f}**' if v >= target else f'{v:.0f}'))
        err = m.get('scenario_errors', {}).get('value', 0)
        row += [f'{100 * err:.2f}%', 'yes' if not failed else 'no: ' + ', '.join(sorted(failed)), *cpu(os.path.join(d, f'cpu-{vus}.txt'))]
        print('| ' + ' | '.join(row) + ' |')
        if vus == steps[0] and err > 0:
            broken = True
        if not failed:
            ceiling = vus
        elif first_break is None:
            first_break = vus
        for k, v in m.items():
            if k.startswith('http_req_duration{name:'):
                per_endpoint.setdefault(k[len('http_req_duration{name:'):-1], {})[vus] = v['p(95)']
        for name, (passes, fails) in checks(json.load(open(p)).get('root_group', {}), {}).items():
            if fails:
                failed_checks.setdefault(vus, []).append(f'{name} {fails}/{passes + fails}')
    print()
    print('p95 per request (ms):')
    print()
    print('| request | ' + ' | '.join(f'{v} VUs' for v in steps) + ' |')
    print('|' + '---|' * (len(steps) + 1))
    for name, by in sorted(per_endpoint.items(), key=lambda kv: -max(kv[1].values())):
        print(f'| {name} | ' + ' | '.join(f"{by[v]:.0f}" if v in by else '-' for v in steps) + ' |')
    print()
    print(f'Ceiling (last step with every target met): {ceiling or "below the first step"} VUs; first step that broke a target: {first_break or "none"}.')
    for vus, items in failed_checks.items():
        print(f'Failed requests at {vus} VUs: ' + ', '.join(items))
    return 1 if broken else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], [int(x) for x in sys.argv[2:]]))
