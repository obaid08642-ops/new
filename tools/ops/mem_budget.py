#!/usr/bin/env python3
"""Memory budget model for deploy/docker-compose.production.yml (R1, 2026-11-02: the 3.8 GB host hung, no SSH, Cloudflare 522 for hours).

The rule (docs/ops/MEMORY_BUDGET.md, docs/platform/R1-memory-budget.md):
    steady use (sum of mem_reservation of the always-on containers) + the largest one-off + the host reserve <= HOST_RAM_MB
The host size is deploy/HOST_RAM_MB (override: env HOST_RAM_MB or --host-ram-mb). The compose file keeps literal numbers (the other tests read them); this
tool computes what they must be for a host size and either checks the committed numbers (check, the CI test) or rewrites them (render --write), so an
upgrade is: echo 8192 > deploy/HOST_RAM_MB; python3 tools/ops/mem_budget.py render --write; commit.

  mem_budget.py check  [--host-ram-mb N]   exit 1 when compose/mongod.conf differ from the plan or the budget is broken
  mem_budget.py render [--host-ram-mb N] [--write]   print the plan (and write it into compose + mongod.conf)

The 3800 MB plan is the owner-approved baseline below; larger hosts scale the SCALABLE services by one factor (never below 1.0, steps of 1/16).
"""
import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COMPOSE = ROOT / "deploy/docker-compose.production.yml"
MONGOD_CONF = ROOT / "deploy/mongo/mongod.conf"
HOST_FILE = ROOT / "deploy/HOST_RAM_MB"

BASE_HOST_MB = 3800
ONE_OFF_MB = 700            # largest one-off container (catalogue apply cap, tools/ops/tasks/90-catalogue-apply.sh)
MIN_RESERVE_MB = 512        # OS, dockerd, sshd, page-cache floor; grows with the host
RESERVE_PCT = 0.10
MAX_FACTOR = 8.0
STEP = 16

# baseline at 3800 MB = the committed compose values (limit, reservation, swap allowance, node heap, scalable)
BASE = {
    "mongodb":     dict(limit=1600, res=1000, swap=0,   heap=None, scale=True),
    "redis":       dict(limit=512,  res=160,  swap=0,   heap=None, scale=True),
    "redis-cache": dict(limit=192,  res=130,  swap=0,   heap=None, scale=False),
    "meilisearch": dict(limit=1024, res=100,  swap=512, heap=None, scale=True),
    "backend":     dict(limit=576,  res=400,  swap=192, heap=416,  scale=True),
    "worker":      dict(limit=640,  res=200,  swap=256, heap=448,  scale=True),
    "fastapi":     dict(limit=384,  res=80,   swap=128, heap=None, scale=False),
    "admin-web":   dict(limit=256,  res=100,  swap=128, heap=192,  scale=False),
    "patient-web": dict(limit=448,  res=250,  swap=224, heap=320,  scale=True),
    "livekit":     dict(limit=256,  res=80,   swap=0,   heap=None, scale=False),
    "coturn":      dict(limit=128,  res=30,   swap=0,   heap=None, scale=False),
    "nginx":       dict(limit=128,  res=30,   swap=0,   heap=None, scale=False),
    "clamav":      dict(limit=1536, res=600,  swap=0,   heap=None, scale=False),   # not steady: remote scanner / window only
}
NOT_STEADY = {"clamav"}
MONGO_CACHE_GB_BASE = 0.6
OVERCOMMIT_CEILING = 2.4    # ratchet: sum of always-on limits / sum of always-on reservations; today 2.40 (6144/2560). Only goes down (docs/platform/R1-memory-budget.md: why limits cannot all sit under the host on 3.8 GB)


def reserve_mb(host):
    return max(MIN_RESERVE_MB, int(host * RESERVE_PCT))


def round_step(v):
    return int(v // STEP * STEP)


def plan(host):
    """-> (factor, {service: dict(limit,res,swap,heap)}, mongo_cache_gb). Raises ValueError when the host cannot hold the baseline."""
    if host < BASE_HOST_MB:
        raise ValueError(f"HOST_RAM_MB {host} is below the {BASE_HOST_MB} MB baseline plan")
    free = host - reserve_mb(host) - ONE_OFF_MB
    fixed = sum(v["res"] for n, v in BASE.items() if n not in NOT_STEADY and not v["scale"])
    scal = sum(v["res"] for n, v in BASE.items() if n not in NOT_STEADY and v["scale"])
    f = min(MAX_FACTOR, max(1.0, int((free - fixed) / scal * 16) / 16))
    out = {}
    for n, v in BASE.items():
        k = f if v["scale"] else 1.0
        limit = round_step(v["limit"] * k) if k != 1.0 else v["limit"]
        res = round_step(v["res"] * k) if k != 1.0 else v["res"]
        swap = round_step(v["swap"] * k) if k != 1.0 else v["swap"]
        heap = (min(round_step(v["heap"] * k), int(limit * 0.75)) if k != 1.0 else v["heap"]) if v["heap"] else None
        out[n] = dict(limit=limit, res=res, swap=swap, heap=heap)
    cache = round(MONGO_CACHE_GB_BASE * f / 0.05) * 0.05
    return f, out, round(cache, 2)


def read_compose():
    return COMPOSE.read_text()


def block_span(text, name):
    m = re.search(rf"(?ms)^  {re.escape(name)}:\n(.*?)(?=^  [a-z][a-z0-9-]*:\n|^[a-z]|\Z)", text)
    return (m.start(1), m.end(1)) if m else None


def current(text):
    cur = {}
    for n in BASE:
        s, e = block_span(text, n)
        body = text[s:e]
        g = lambda k: (re.search(rf"(?m)^    {k}: *(\d+)m", body) or [None, None])[1]
        heap = re.search(r"--max-old-space-size=(\d+)", body)
        limit, res, ms = g("mem_limit"), g("mem_reservation"), g("memswap_limit")
        cur[n] = dict(limit=int(limit) if limit else None, res=int(res) if res else None,
                      swap=(int(ms) - int(limit)) if ms and limit else 0, heap=int(heap.group(1)) if heap else None)
    return cur


def mongo_cache():
    return float(re.search(r"cacheSizeGB:\s*([0-9.]+)", MONGOD_CONF.read_text()).group(1))


def problems(host, cur, cache):
    """Every way the committed numbers break the plan or the budget. Empty list = pass."""
    bad = []
    try:
        f, want, want_cache = plan(host)
    except ValueError as e:
        return [str(e)]
    for n, w in want.items():
        c = cur[n]
        if c != w:
            bad.append(f"{n}: compose has {c}, plan for {host} MB is {w}")
    if abs(cache - want_cache) > 1e-9:
        bad.append(f"mongod cacheSizeGB is {cache}, plan for {host} MB is {want_cache}")
    steady = sum(c["res"] for n, c in cur.items() if n not in NOT_STEADY)
    if steady + ONE_OFF_MB + reserve_mb(host) > host:
        bad.append(f"budget broken: steady {steady} + one-off {ONE_OFF_MB} + reserve {reserve_mb(host)} > {host}")
    limits = sum(c["limit"] for n, c in cur.items() if n not in NOT_STEADY)
    ratio = limits / steady
    if ratio > OVERCOMMIT_CEILING + 1e-9:
        bad.append(f"sum of always-on limits {limits} MB is {ratio:.2f}x the reservations {steady} MB; ceiling {OVERCOMMIT_CEILING}")
    return bad


def render(host, write):
    f, want, cache = plan(host)
    print(f"host {host} MB, reserve {reserve_mb(host)} MB, one-off {ONE_OFF_MB} MB, scale factor {f}, mongod cacheSizeGB {cache}")
    print(f"{'service':<12} {'limit':>6} {'reserv':>6} {'swap+':>6} {'heap':>5}")
    for n, v in want.items():
        print(f"{n:<12} {v['limit']:>6} {v['res']:>6} {v['swap']:>6} {str(v['heap'] or ''):>5}")
    if not write:
        return
    text = read_compose()
    for n, v in want.items():
        s, e = block_span(text, n)
        body = text[s:e]
        body = re.sub(r"(?m)^(    mem_limit: *)\d+m", rf"\g<1>{v['limit']}m", body)
        body = re.sub(r"(?m)^(    mem_reservation: *)\d+m", rf"\g<1>{v['res']}m", body)
        body = re.sub(r"(?m)^(    memswap_limit: *)\d+m", rf"\g<1>{v['limit'] + v['swap']}m", body)
        if v["heap"]:
            body = re.sub(r"--max-old-space-size=\d+", f"--max-old-space-size={v['heap']}", body)
        text = text[:s] + body + text[e:]
    COMPOSE.write_text(text)
    MONGOD_CONF.write_text(re.sub(r"cacheSizeGB:\s*[0-9.]+", f"cacheSizeGB: {cache}", MONGOD_CONF.read_text()))
    print("written: compose + mongod.conf")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["check", "render"])
    ap.add_argument("--host-ram-mb", type=int)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    host = a.host_ram_mb or int(os.environ.get("HOST_RAM_MB") or HOST_FILE.read_text().strip())
    if a.cmd == "render":
        render(host, a.write)
        return 0
    bad = problems(host, current(read_compose()), mongo_cache())
    for b in bad:
        print("FAIL", b)
    if not bad:
        print(f"memory budget ok for {host} MB (reserve {reserve_mb(host)}, one-off {ONE_OFF_MB})")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
