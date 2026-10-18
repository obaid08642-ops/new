#!/usr/bin/env python3
"""Expand/contract rule for database migrations (20.9), checked on every PR that touches backend/scripts/migrations.

A rolling deploy runs the OLD and the NEW code side by side against one database, so a migration may never break the
old code. Two steps:  expand (add / copy / backfill; old and new code both work)  then, in a LATER release,
contract (drop / rename / unset / delete what nothing reads any more).

Rules for a migration file:
  apply-flag   it changes data only with --apply (a dry run is the default);
  contract     if it drops, renames, unsets or deletes (dropCollection, .drop(), $rename, $unset, deleteMany, deleteOne,
               dropIndex, renameCollection, dropDatabase), its header must say which earlier migration was the expand step:
               `// contract-of: <earlier-migration-file>`.
Files written before this rule are listed in tools/ci/migration-safety.baseline (file + rule). The baseline only shrinks:
a listed violation that no longer exists must be removed from it, a new violation fails the check."""
import os
import re
import sys

DESTRUCTIVE = re.compile(r"dropCollection|\.drop\(\)|dropDatabase|\$rename|\$unset|deleteMany|deleteOne|dropIndex|renameCollection")
CONTRACT_OF = re.compile(r"^\s*//\s*contract-of:\s*(\S+\.(?:ts|js))\s*$", re.M)


def violations(directory):
    out = set()
    names = sorted(f for f in os.listdir(directory) if f.endswith((".ts", ".js")))
    for f in names:
        text = open(os.path.join(directory, f), encoding="utf-8").read()
        if "--apply" not in text:
            out.add((f, "apply-flag"))
        if DESTRUCTIVE.search(text):
            m = CONTRACT_OF.search(text)
            if not (m and m.group(1) in names and m.group(1) < f):
                out.add((f, "contract"))
    return out


def load_baseline(path):
    if not os.path.exists(path):
        return set()
    rows = (l.split("#")[0].split() for l in open(path, encoding="utf-8"))
    return {tuple(r) for r in rows if len(r) == 2}


def main(directory, baseline_path):
    found = violations(directory)
    base = load_baseline(baseline_path)
    new = sorted(found - base)
    gone = sorted(base - found)
    for f, rule in new:
        print(f"FAIL {f}: {rule} " + ("(add `// contract-of: <earlier expand migration>`)" if rule == "contract" else "(change data only with --apply)"))
    for f, rule in gone:
        print(f"FAIL {f}: {rule} is fixed or the file is gone, remove it from the baseline (it only shrinks)")
    print(f"migration safety: {len(found)} known violations (baseline {len(base)}), {len(new)} new")
    return 1 if new or gone else 0


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(here, "..", "..")
    sys.exit(main(os.path.join(root, "backend", "scripts", "migrations"), os.path.join(here, "migration-safety.baseline")))
