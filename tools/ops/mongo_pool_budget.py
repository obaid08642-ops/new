#!/usr/bin/env python3
"""R7: the MongoDB connection budget. Every process that talks to mongod opens up to maxPoolSize connections (plus ~2 monitor connections per server); mongod
refuses new ones above maxIncomingConnections (deploy/mongo/mongod.conf) and each costs about 1 MB. Before this check the Node driver default (200 per process) let
api + worker ask for 400 against a limit of 300.

  mongo_pool_budget.py [--api-replicas N] [compose.yml] [mongod.conf]     exit 1 when the worst case does not fit

worst case = sum over clients of (maxPoolSize + MONITOR) x replicas + TOOLS_RESERVE   <= maxIncomingConnections
memory     = worst case x 1 MB                                                          <= 25 % of the mongodb container limit
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
NODE_DEFAULT_POOL = 200      # mongo-options.ts default when MONGO_MAX_POOL_SIZE is not set
UNKNOWN_CLIENT_POOL = 100    # a Python/other driver we cannot read (pymongo default maxPoolSize)
MONITOR = 4                  # monitor + RTT connections the driver keeps per server
TOOLS_RESERVE = 50           # mongosh sessions, nightly dump, oplog slices, catalogue apply, ops tasks
MB_PER_CONNECTION = 1
MEM_SHARE = 0.25


def mb(v):
    m = re.fullmatch(r"(\d+)([mMgG])", str(v).strip())
    return int(m.group(1)) * (1024 if m.group(2).lower() == "g" else 1)


def analyse(compose, conf_text, api_replicas=1):
    services = compose["services"]
    limit = int(re.search(r"maxIncomingConnections:\s*(\d+)", conf_text).group(1))
    rows, total = [], TOOLS_RESERVE
    for name, svc in services.items():
        env = svc.get("environment") or {}
        if isinstance(env, list):
            env = dict(e.split("=", 1) for e in env if "=" in e)
        if "MONGO_URL" not in env:
            continue
        node = name in ("backend", "worker") or "NODE_OPTIONS" in env
        pool = int(env.get("MONGO_MAX_POOL_SIZE") or (NODE_DEFAULT_POOL if node else UNKNOWN_CLIENT_POOL))
        copies = api_replicas if name == "backend" else 1
        rows.append((name, pool, copies))
        total += (pool + MONITOR) * copies
    mem_limit = mb(services["mongodb"]["mem_limit"])
    problems = []
    if total > limit:
        problems.append(f"worst case {total} connections > maxIncomingConnections {limit}")
    if total * MB_PER_CONNECTION > MEM_SHARE * mem_limit:
        problems.append(f"worst case {total} connections x {MB_PER_CONNECTION} MB > {int(MEM_SHARE * 100)} % of the mongodb limit {mem_limit} MB")
    return limit, total, rows, problems


def main(argv):
    reps = 1
    if "--api-replicas" in argv:
        i = argv.index("--api-replicas")
        reps = int(argv[i + 1])
        del argv[i:i + 2]
    compose_path = Path(argv[1]) if len(argv) > 1 else ROOT / "deploy/docker-compose.production.yml"
    conf_path = Path(argv[2]) if len(argv) > 2 else ROOT / "deploy/mongo/mongod.conf"
    limit, total, rows, problems = analyse(yaml.safe_load(compose_path.read_text()), conf_path.read_text(), reps)
    for name, pool, copies in rows:
        print(f"  {name}: maxPoolSize {pool} x {copies}")
    print(f"worst case {total} of {limit} connections (tools reserve {TOOLS_RESERVE})")
    for p in problems:
        print("FAIL", p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
