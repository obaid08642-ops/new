#!/usr/bin/env python3
"""Phase 16.8 - the ZAP gate: 0 high findings.

  python3 tools/security/zap/zap_gate.py <report.json> [<report.json> ...]

Reads ZAP's traditional JSON report (`-J`: {"site": [{"alerts": [...]}]}; the flat {"alerts": [...]} form too) and
  - FAILS on any alert of risk High (riskcode 3) unless tools/security/zap/accepted.json lists its pluginid with a reason,
  - FAILS when a report is missing, unreadable or has no site (a scan that did not run is not a pass),
  - prints every Medium alert so the review sees them, and FAILS on an accepted entry that no longer appears (the list only shrinks).
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
HIGH = 3
MEDIUM = 2


def alerts_of(report):
    if isinstance(report.get('site'), list):
        sites = report['site']
        if not sites:
            raise ValueError('the report has no site: the scan did not reach the target')
        return [a for s in sites for a in (s.get('alerts') or [])]
    if isinstance(report.get('alerts'), list):
        return report['alerts']
    raise ValueError('not a ZAP report (no "site" and no "alerts")')


def risk(alert):
    try:
        return int(alert.get('riskcode'))
    except (TypeError, ValueError):
        desc = str(alert.get('riskdesc', ''))
        return {'High': 3, 'Medium': 2, 'Low': 1}.get(desc.split(' ')[0], 0)


def describe(alert, limit=3):
    """Where a finding is and what ZAP matched: the part of the report a person needs to act on it."""
    out = []
    for inst in (alert.get('instances') or [])[:limit]:
        evidence = str(inst.get('evidence') or '').replace('\n', ' ')[:160]
        other = str(inst.get('otherinfo') or '').replace('\n', ' ')[:200]
        out.append(f"\n      at {inst.get('method', '')} {inst.get('uri', '')}" + (f"\n         evidence: {evidence}" if evidence else '') + (f"\n         info: {other}" if other else ''))
    solution = str(alert.get('solution') or '').replace('\n', ' ')[:200]
    return ''.join(out) + (f"\n      fix: {solution}" if solution else '')


def evaluate(reports, accepted):
    high, medium, seen = [], [], set()
    for report in reports:
        for a in alerts_of(report):
            pid = str(a.get('pluginid') or a.get('alertRef') or '')
            seen.add(pid)
            r = risk(a)
            name = f"{a.get('name') or a.get('alert')} (plugin {pid}, {len(a.get('instances') or [])} instance(s))"
            if r >= HIGH and pid not in accepted:
                high.append(name + describe(a))
            elif r == MEDIUM:
                medium.append(name)
    stale = sorted(p for p in accepted if p not in seen)
    return high, medium, stale


def main(argv):
    paths = argv[1:]
    if not paths:
        print('usage: zap_gate.py <report.json> ...')
        return 2
    accepted = json.loads((HERE / 'accepted.json').read_text())['accepted']
    reports = []
    for p in paths:
        f = pathlib.Path(p)
        if not f.exists():
            print(f'FAIL: {p} does not exist - the scan produced no report')
            return 1
        try:
            reports.append(json.loads(f.read_text()))
            alerts_of(reports[-1])
        except (ValueError, json.JSONDecodeError) as e:
            print(f'FAIL: {p}: {e}')
            return 1
    high, medium, stale = evaluate(reports, accepted)
    for m in medium:
        print('medium:', m)
    for h in high:
        print('HIGH  :', h)
    for s in stale:
        print(f'FAIL: accepted plugin {s} no longer appears, remove it from tools/security/zap/accepted.json')
    print(f'high findings: {len(high)}; medium: {len(medium)}; accepted high: {sum(1 for _ in accepted)}')
    return 1 if high or stale else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
