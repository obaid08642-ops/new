#!/usr/bin/env python3
"""Monthly capacity review (20.10): reads the sampler's lines (deploy/scripts/capacity-sample.sh) and decides which
scale-out step of docs/perf/SCALE_ARCHITECTURE.md §6 the numbers trigger.

  review.py samples.jsonl [--days 30] [--step2-done] [--costs costs.json --month YYYY-MM] [--out note.md]

Exit: 0 = no step triggered, 3 = a step is triggered, 2 = not enough data to say (never "all good" on thin data).
Triggers (§6):  step 2  CPU > 70 % sustained (an hour or more, on 3+ days) or the MongoDB cache miss ratio rising;
                step 3  p95 > 400 ms at peak on 3+ days after step 2;   step 4  more than 50,000 open sockets.
Guardrails (not steps, but a month with one is not "fine"): disk > 80 %, RAM > 85 % average, event-loop lag > 100 ms,
5xx share > 0.5 %, Redis evictions."""
import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone

SUSTAINED_SAMPLES = 4          # 4 x 15 min = an hour
DAYS_NEEDED = 3                # a trigger must show on this many distinct days
MIN_DAYS_OF_DATA = 7


def day(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")


def p95_from_buckets(prev, cur):
    """p95 (ms) of the requests between two cumulative bucket snapshots; None on a counter reset or too few requests."""
    keys = [k for k in cur if k != "+Inf"]
    keys.sort(key=float)
    total = cur.get("+Inf", 0) - prev.get("+Inf", 0)
    if total < 100:
        return None
    for k in keys + ["+Inf"]:
        d = cur.get(k, 0) - prev.get(k, 0)
        if d < 0:
            return None
        if k != "+Inf" and d >= 0.95 * total:
            return float(k)
    return float(keys[-1]) if keys else None


def analyse(rows, days=30, step2_done=False):
    rows = sorted((r for r in rows if r.get("ts")), key=lambda r: r["ts"])
    if rows:
        rows = [r for r in rows if r["ts"] >= rows[-1]["ts"] - days * 86400]
    out = {"samples": len(rows), "first": rows[0]["ts"] if rows else None, "last": rows[-1]["ts"] if rows else None}
    out["days_of_data"] = len({day(r["ts"]) for r in rows})

    # step 2: sustained CPU
    run, cpu_days = 0, set()
    for r in rows:
        if (r.get("cpu_busy_pct") or 0) > 70:
            run += 1
            if run >= SUSTAINED_SAMPLES:
                cpu_days.add(day(r["ts"]))
        else:
            run = 0
    cpus = [r["cpu_busy_pct"] for r in rows if r.get("cpu_busy_pct") is not None]
    out["cpu"] = {"days_over": sorted(cpu_days), "max": max(cpus) if cpus else None, "avg": sum(cpus) / len(cpus) if cpus else None}

    # step 2: MongoDB cache miss ratio per day (page reads into cache / pages requested), rising?
    rd, rq = defaultdict(float), defaultdict(float)
    for a, b in zip(rows, rows[1:]):
        ma, mb = a.get("mongo"), b.get("mongo")
        if ma and mb:
            dr, dq = mb["cache_read"] - ma["cache_read"], mb["cache_req"] - ma["cache_req"]
            if dr >= 0 and dq > 0:
                rd[day(b["ts"])] += dr
                rq[day(b["ts"])] += dq
    ratios = {d: rd[d] / rq[d] for d in rq if rq[d] > 0}
    ds = sorted(ratios)
    first = [ratios[d] for d in ds[:7]]
    lastn = [ratios[d] for d in ds[-7:]]
    rising = False
    if len(ds) >= 14:
        f, l = sum(first) / len(first), sum(lastn) / len(lastn)
        rising = l >= 1.5 * f and l >= 0.005
    out["mongo_miss"] = {"first7": sum(first) / len(first) if first else None, "last7": sum(lastn) / len(lastn) if lastn else None, "rising": rising, "days": len(ds)}

    # step 3: p95 at the daily peak, error share, event loop
    peaks, req, err = defaultdict(float), 0.0, 0.0
    for a, b in zip(rows, rows[1:]):
        pa, pb = a.get("api"), b.get("api")
        if not pa or not pb or (pb.get("uptime_s") or 0) < (pa.get("uptime_s") or 0):
            continue
        p = p95_from_buckets(pa["buckets"], pb["buckets"])
        if p is not None:
            peaks[day(b["ts"])] = max(peaks[day(b["ts"])], p)
        req += pb["requests"] - pa["requests"]
        err += pb["errors"] - pa["errors"]
    over = sorted(d for d, p in peaks.items() if p > 400)
    out["p95"] = {"peak": max(peaks.values()) if peaks else None, "days_over_400": over, "step2_done": step2_done, "days": len(peaks)}
    out["error_share"] = err / req if req > 0 else None
    loops = [r["api"]["event_loop_ms"] for r in rows if r.get("api") and r["api"].get("event_loop_ms") is not None]
    out["event_loop_max"] = max(loops) if loops else None

    # step 4: sockets
    ws = [r["api"]["ws"] for r in rows if r.get("api") and r["api"].get("ws") is not None]
    out["ws_max"] = max(ws) if ws else None

    # guardrails
    disks = [r["disk_used_pct"] for r in rows if r.get("disk_used_pct") is not None]
    mems = [r["mem_used_pct"] for r in rows if r.get("mem_used_pct") is not None]
    out["disk_max"] = max(disks) if disks else None
    out["mem_avg"] = sum(mems) / len(mems) if mems else None
    evs = [r["redis"]["evicted_keys"] for r in rows if r.get("redis") and r["redis"].get("evicted_keys") is not None]
    out["redis_evicted_delta"] = (evs[-1] - evs[0]) if len(evs) > 1 and evs[-1] >= evs[0] else None

    # verdict
    steps = []
    if len(cpu_days) >= DAYS_NEEDED:
        steps.append((2, f"CPU over 70% for an hour or more on {len(cpu_days)} days"))
    if rising:
        steps.append((2, "MongoDB cache miss ratio rising (last 7 days 1.5x the first 7 and over 0.5%)"))
    if len(over) >= DAYS_NEEDED and step2_done:
        steps.append((3, f"p95 over 400 ms at peak on {len(over)} days after step 2"))
    if out["ws_max"] is not None and out["ws_max"] > 50000:
        steps.append((4, f"{int(out['ws_max'])} open sockets"))
    out["steps"] = steps
    out["status"] = "insufficient" if out["days_of_data"] < MIN_DAYS_OF_DATA else ("triggered" if steps else "none")
    out["warnings"] = [w for w in [
        "disk above 80% at some point" if (out["disk_max"] or 0) > 80 else "",
        "RAM above 85% on average" if (out["mem_avg"] or 0) > 85 else "",
        "event-loop lag above 100 ms" if (out["event_loop_max"] or 0) > 100 else "",
        "5xx share above 0.5%" if (out["error_share"] or 0) > 0.005 else "",
        "Redis evicted keys during the window" if (out["redis_evicted_delta"] or 0) > 0 else "",
        f"p95 over 400 ms on {len(over)} days but step 2 is not done yet: do step 2 first" if len(over) >= DAYS_NEEDED and not step2_done else "",
    ] if w]
    return out


def fmt(v, unit="", nd=1):
    return "not measured" if v is None else (f"{v:.{nd}f}{unit}" if isinstance(v, float) else f"{v}{unit}")


def note(a, month, costs=None):
    iso = lambda t: datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%d %H:%M") if t else "n/a"
    L = [f"# Capacity and cost review, {month}", "",
         f"Data: {a['samples']} samples over {a['days_of_data']} days ({iso(a['first'])} to {iso(a['last'])} UTC), from `deploy/scripts/capacity-sample.sh`.", ""]
    if a["status"] == "insufficient":
        L += [f"**Not enough data to decide** ({a['days_of_data']} days; at least {MIN_DAYS_OF_DATA} needed). No step is triggered or cleared by this note.", ""]
    L += ["## Scale-out triggers (`SCALE_ARCHITECTURE.md` §6)", "",
          "| Step | Metric | Threshold | This month | Triggered |", "|---|---|---|---|---|",
          f"| 2 | CPU busy, 15-min samples | > 70 % for 1 h+ on 3+ days | max {fmt(a['cpu']['max'], ' %')}, avg {fmt(a['cpu']['avg'], ' %')}, {len(a['cpu']['days_over'])} days over | {'YES' if len(a['cpu']['days_over']) >= DAYS_NEEDED else 'no'} |",
          f"| 2 | MongoDB cache miss ratio | rising (last 7 d >= 1.5x first 7 d and > 0.5 %) | first 7 d {fmt(a['mongo_miss']['first7'] and a['mongo_miss']['first7'] * 100, ' %', 2)}, last 7 d {fmt(a['mongo_miss']['last7'] and a['mongo_miss']['last7'] * 100, ' %', 2)} ({a['mongo_miss']['days']} days) | {'YES' if a['mongo_miss']['rising'] else 'no'} |",
          f"| 3 | API p95 at the daily peak | > 400 ms on 3+ days, after step 2 | peak {fmt(a['p95']['peak'], ' ms', 0)}, {len(a['p95']['days_over_400'])} days over (step 2 {'done' if a['p95']['step2_done'] else 'not done'}) | {'YES' if len(a['p95']['days_over_400']) >= DAYS_NEEDED and a['p95']['step2_done'] else 'no'} |",
          f"| 4 | Open sockets (this process) | > 50,000 | max {fmt(a['ws_max'], '', 0)} | {'YES' if (a['ws_max'] or 0) > 50000 else 'no'} |",
          "| 5 | Region resilience | business need or regulation | owner decision | n/a |", ""]
    L += ["## Guardrails", "", f"- Disk used: max {fmt(a['disk_max'], ' %', 0)}; RAM used: avg {fmt(a['mem_avg'], ' %', 0)}; event-loop lag max {fmt(a['event_loop_max'], ' ms', 0)}; 5xx share {fmt(a['error_share'] and a['error_share'] * 100, ' %', 3)}; Redis evictions {fmt(a['redis_evicted_delta'], '', 0)}."]
    L += [f"- WARNING: {w}" for w in a["warnings"]] or []
    L += ["", "## Verdict", ""]
    if a["status"] == "triggered":
        L += [f"- **Step {s} is triggered:** {why}." for s, why in a["steps"]]
        L += ["", "Next: open the scale-out step in `SCALE_ARCHITECTURE.md` §6, size it from the numbers above, re-run the capacity workflow after it (`load-test-<date>.md`)."]
    elif a["status"] == "none":
        L += ["No scale-out step is triggered this month."]
    else:
        L += ["Undecided: keep the sampler running."]
    if costs:
        L += ["", "## Cost", "", "| Line | This month | Last month | Change |", "|---|---|---|---|"]
        for line, cur in costs["current"].items():
            prev = costs.get("previous", {}).get(line)
            chg = "n/a" if not prev else f"{(cur - prev) / prev * 100:+.0f} %" + (" (over 20 %: explain)" if abs((cur - prev) / prev) > 0.2 else "")
            L.append(f"| {line} | {cur:g} | {prev if prev is not None else 'n/a'} | {chg} |")
    return "\n".join(L) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("samples")
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--step2-done", action="store_true")
    ap.add_argument("--costs")
    ap.add_argument("--month", default=datetime.now(timezone.utc).strftime("%Y-%m"))
    ap.add_argument("--out")
    args = ap.parse_args(argv)
    rows = [json.loads(l) for l in open(args.samples) if l.strip()]
    a = analyse(rows, args.days, args.step2_done)
    costs = None
    if args.costs:
        allc = json.load(open(args.costs))
        keys = sorted(allc)
        if args.month in allc:
            i = keys.index(args.month)
            costs = {"current": allc[args.month], "previous": allc[keys[i - 1]] if i else {}}
    text = note(a, args.month, costs)
    if args.out:
        open(args.out, "w").write(text)
    else:
        print(text)
    return {"none": 0, "triggered": 3, "insufficient": 2}[a["status"]]


if __name__ == "__main__":
    sys.exit(main())
