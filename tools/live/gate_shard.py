#!/usr/bin/env python3
"""Split the live gate's journeys into N shards of about equal running time.

usage: printf '%s\n' j_a j_b ... | python3 gate_shard.py <shard 1..N> <N>   -> the journeys of that shard, one per line, in the input's order.

The split is deterministic (the same input and weights always give the same shards, so every shard job agrees on it without talking
to the others): heaviest journey first onto the lightest shard (ties go to the lower shard). The weights are the measured seconds
in gate_weights.txt; a journey that is not listed there counts DEFAULT_SECONDS.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SECONDS = 20


def load_weights(path=os.path.join(HERE, 'gate_weights.txt')):
    weights = {}
    if os.path.exists(path):
        with open(path, encoding='utf8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                name, seconds = line.split()[:2]
                weights[name] = float(seconds)
    return weights


def split(journeys, n, weights=None):
    """The journeys of every shard (a list of n lists), each in the order of `journeys`."""
    weights = load_weights() if weights is None else weights
    order = {j: i for i, j in enumerate(journeys)}
    load = [0.0] * n
    shards = [[] for _ in range(n)]
    for j in sorted(journeys, key=lambda j: (-weights.get(j, DEFAULT_SECONDS), j)):
        k = min(range(n), key=lambda i: (load[i], i))
        shards[k].append(j)
        load[k] += weights.get(j, DEFAULT_SECONDS)
    return [sorted(s, key=order.__getitem__) for s in shards]


if __name__ == '__main__':
    shard, n = int(sys.argv[1]), int(sys.argv[2])
    names = [line.strip() for line in sys.stdin if line.strip()]
    for j in split(names, n)[shard - 1]:
        print(j)
