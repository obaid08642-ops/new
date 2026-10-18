#!/usr/bin/env python3
"""Picks what a disaster recovery restores (20.8): the newest dump whose oplog start is covered by an unbroken chain of
oplog slices, the slices to replay, and the recovery point objective the chain actually delivers.

Input (JSON on stdin): {"now": <epoch s>, "dumps": [{"key","base":"S I"}], "slices": [{"key","modified": <epoch s>}],
"target": <epoch s, optional: restore to this moment>, "window": <seconds, default 86400>}
Output (JSON): {"ok", "dump", "base", "slices": [keys in replay order], "end": "S I", "rpo_seconds", "error"}
Slice keys look like oplog/oplog_<fromSec>.<fromInc>_<toSec>.<toInc>.bson.gz.gpg"""
import json
import re
import sys

NAME = re.compile(r"oplog_(\d+)\.(\d+)_(\d+)\.(\d+)\.bson\.gz\.gpg$")


def parse(entries):
    out = []
    for e in entries:
        m = NAME.search(e["key"])
        if m:
            f, t = (int(m[1]), int(m[2])), (int(m[3]), int(m[4]))
            out.append({"key": e["key"], "from": f, "to": t, "modified": e["modified"]})
    return sorted(out, key=lambda s: (s["from"], s["to"]))


def chain_from(slices, base):
    """Slices that start at or before `base` and follow each other without a gap."""
    first = [s for s in slices if s["from"] <= base < s["to"] or (s["from"] <= base and s["to"] == base)]
    if not first:
        return []
    chain = [min(first, key=lambda s: s["from"])]
    while True:
        nxt = [s for s in slices if s["from"] == chain[-1]["to"]]
        if not nxt:
            return chain
        chain.append(nxt[0])


def rpo(slices, now, window):
    """Worst gap between two uploads inside the window, or since the newest upload."""
    times = sorted(s["modified"] for s in slices if s["modified"] >= now - window)
    if not times:
        return None
    gaps = [b - a for a, b in zip(times, times[1:])] + [now - times[-1]]
    return max(gaps)


def plan(doc):
    now = doc["now"]
    window = doc.get("window", 86400)
    slices = parse(doc.get("slices", []))
    dumps = []
    for d in doc.get("dumps", []):
        try:
            s, i = d["base"].split()
            dumps.append({"key": d["key"], "base": (int(s), int(i))})
        except (ValueError, KeyError):
            continue
    target = doc.get("target")
    for d in sorted(dumps, key=lambda x: x["key"], reverse=True):
        chain = chain_from(slices, d["base"])
        if target is not None:
            chain = [s for s in chain if s["from"][0] < target]
        if chain:
            r = rpo(chain, now, window)
            return {"ok": True, "dump": d["key"], "base": "%d %d" % d["base"], "slices": [s["key"] for s in chain],
                    "end": "%d %d" % chain[-1]["to"], "rpo_seconds": int(r) if r is not None else None, "error": ""}
    return {"ok": False, "dump": "", "base": "", "slices": [], "end": "", "rpo_seconds": None,
            "error": "no dump has an unbroken oplog chain from its start (dumps: %d, slices: %d)" % (len(dumps), len(slices))}


if __name__ == "__main__":
    print(json.dumps(plan(json.load(sys.stdin))))
