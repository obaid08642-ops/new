#!/usr/bin/env python3
"""The sharded live gate must run every journey exactly once (no journey dropped or doubled) and keep the shards about equally long.

Run: python3 tools/live/test_gate_shards.py   (live-gate.yml runs it in the aggregating job `live`)
"""
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gate_shard  # noqa: E402

SHARD_COUNTS = (2, 3, 4, 5)


def run_gate(arg, **env):
    base = {k: v for k, v in os.environ.items() if k not in ('GATE_SHARDS', 'GATE_SHARD')}
    out = subprocess.run(['bash', 'run_gate.sh', arg], cwd=HERE, env={**base, **env}, capture_output=True, text=True, check=True)
    return out.stdout.split()


class GateShards(unittest.TestCase):
    def test_every_journey_runs_in_exactly_one_shard(self):
        full = run_gate('--list')
        self.assertGreater(len(full), 60, 'the gate lists its journeys')
        shared = sorted(j for j in full if j != 'j_log_scan')
        for n in SHARD_COUNTS:
            seen = []
            for i in range(1, n + 1):
                got = run_gate('--print-shard', GATE_SHARDS=str(n), GATE_SHARD=str(i))
                self.assertEqual(got[-1], 'j_log_scan', f'shard {i}/{n}: the log scan runs last, over that shard\'s own backend log')
                seen += [j for j in got if j != 'j_log_scan']
            self.assertEqual(sorted(seen), shared, f'{n} shards: the same journeys, each once')

    def test_unsharded_gate_is_unchanged(self):
        full = run_gate('--list')
        self.assertEqual(run_gate('--print-shard')[-2:], ['j_admin_clicks', 'j_log_scan'])
        self.assertEqual(sorted(run_gate('--print-shard')), sorted(full))

    def test_shards_are_balanced(self):
        weights = gate_shard.load_weights()
        names = [j for j in run_gate('--list') if j != 'j_log_scan']
        for n in SHARD_COUNTS:
            totals = [sum(weights.get(j, gate_shard.DEFAULT_SECONDS) for j in s) for s in gate_shard.split(names, n)]
            mean = sum(totals) / n
            heaviest_journey = max(weights.get(j, gate_shard.DEFAULT_SECONDS) for j in names)
            self.assertLessEqual(max(totals), max(1.15 * mean, heaviest_journey + mean * 0.5), f'{n} shards: {totals}')


if __name__ == '__main__':
    unittest.main()
