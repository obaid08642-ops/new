#!/usr/bin/env python3
"""Static guard for the disk-safety rules of deploy/docker-compose.production.yml (incident 2026-10-16, issue #1603).

The root disk filled because a container wrote into its own layer without a cap and logs were kept in 5 x 50 MB per
container. These rules keep that from coming back; CI runs this on every change to deploy/ (compose limits):

  1. every service logs with json-file, max-size <= 20m and max-file <= 3
  2. patient-web: read-only root filesystem, every tmpfs has an explicit size <= 256m, the ISR cache is Redis
     (NEXT_CACHE_REDIS_URL set) and its image is built with the Redis cache handler (Dockerfile.patient-web)
  3. redis-cache: allkeys-lru with a maxmemory, nothing saved (no RDB, no AOF), no volume, read-only root filesystem
  4. the main redis never evicts queue keys: its config does not use allkeys-lru

Usage: check-compose-limits.py [compose.yml] [Dockerfile.patient-web] [redis.conf]; exit 1 on any broken rule.
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
compose_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "deploy/docker-compose.production.yml"
dockerfile_path = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "deploy/docker/Dockerfile.patient-web"
redis_conf_path = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "deploy/redis/redis.conf"

MAX_LOG_SIZE_MB = 20
MAX_LOG_FILES = 3
MAX_TMPFS_MB = 256
failures = []


def fail(msg):
    failures.append(msg)
    print(f"FAIL {msg}")


def megabytes(text):
    m = re.fullmatch(r"(\d+)([kKmMgG]?)[bB]?", str(text).strip())
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2).lower()
    return n * {"": 1 / (1024 * 1024), "k": 1 / 1024, "m": 1, "g": 1024}[unit]


compose = yaml.safe_load(compose_path.read_text())
services = compose["services"]

# 1. logs
for name, svc in services.items():
    log = svc.get("logging") or {}
    opts = log.get("options") or {}
    size, files = megabytes(opts.get("max-size", "")), opts.get("max-file")
    if log.get("driver") != "json-file":
        fail(f"{name}: logging driver is {log.get('driver')!r}, must be json-file with a cap")
    elif size is None or size > MAX_LOG_SIZE_MB:
        fail(f"{name}: log max-size {opts.get('max-size')!r} (must be <= {MAX_LOG_SIZE_MB}m)")
    elif files is None or int(files) > MAX_LOG_FILES:
        fail(f"{name}: log max-file {files!r} (must be <= {MAX_LOG_FILES})")
print(f"logs: {len(services)} services checked (json-file, <= {MAX_LOG_SIZE_MB}m x {MAX_LOG_FILES})")

# 2. patient-web
web = services.get("patient-web", {})
if web.get("read_only") is not True:
    fail("patient-web: read_only must be true (nothing may grow the container layer)")
for t in web.get("tmpfs", []) or []:
    m = re.search(r"size=(\w+)", t)
    if not m or megabytes(m.group(1)) is None or megabytes(m.group(1)) > MAX_TMPFS_MB:
        fail(f"patient-web: tmpfs {t!r} needs an explicit size <= {MAX_TMPFS_MB}m")
if not str((web.get("environment") or {}).get("NEXT_CACHE_REDIS_URL", "")).startswith("redis://"):
    fail("patient-web: NEXT_CACHE_REDIS_URL must point at redis-cache (ISR cache is not on the disk)")
if "redis-cache" not in str((web.get("environment") or {}).get("NEXT_CACHE_REDIS_URL", "")):
    fail("patient-web: NEXT_CACHE_REDIS_URL must be the capped redis-cache instance, not the main redis")
if not re.search(r"^ARG NEXT_CACHE_HANDLER=redis\s*$", dockerfile_path.read_text(), re.M):
    fail("Dockerfile.patient-web: ARG NEXT_CACHE_HANDLER must default to redis")
print("patient-web: read-only root, capped tmpfs, Redis ISR cache")

# 3. redis-cache
rc = services.get("redis-cache")
if not rc:
    fail("redis-cache service is missing")
else:
    cmd = " ".join(str(c) for c in rc.get("command", []))
    if "allkeys-lru" not in cmd:
        fail("redis-cache: maxmemory-policy must be allkeys-lru")
    if not re.search(r"--maxmemory\s+\S+", cmd):
        fail("redis-cache: needs --maxmemory")
    args = [str(c) for c in rc.get("command", [])]
    if "--save" not in args or args[args.index("--save") + 1] != "":
        fail("redis-cache: must not save RDB snapshots (--save \"\")")
    if "--appendonly no" not in cmd:
        fail("redis-cache: must not write an AOF (--appendonly no)")
    if rc.get("volumes"):
        fail("redis-cache: must not mount a volume")
    if rc.get("read_only") is not True:
        fail("redis-cache: read_only must be true")
print("redis-cache: allkeys-lru, maxmemory, no persistence, no volume")

# 4. the main redis keeps queues: never allkeys-lru
conf = redis_conf_path.read_text()
if re.search(r"^\s*maxmemory-policy\s+allkeys", conf, re.M):
    fail("redis.conf: the main redis must not use an allkeys-* policy (it would evict queue keys)")

if failures:
    print(f"compose limits: {len(failures)} rule(s) broken")
    sys.exit(1)
print("compose limits: OK")
