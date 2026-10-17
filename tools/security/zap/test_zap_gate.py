"""Phase 16.8 - the ZAP gate fails on a high finding and on a scan that did not run."""
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import zap_gate  # noqa: E402


def report(*alerts):
    return {'site': [{'@name': 'http://127.0.0.1:8002', 'alerts': list(alerts)}]}


def alert(pid, code, name='x'):
    return {'pluginid': str(pid), 'name': name, 'riskcode': str(code), 'riskdesc': 'x', 'instances': [{}]}


class Gate(unittest.TestCase):
    def test_high_fails(self):
        high, _, _ = zap_gate.evaluate([report(alert(40018, 3, 'SQL Injection'))], {})
        self.assertEqual(len(high), 1)

    def test_medium_and_low_pass(self):
        high, medium, _ = zap_gate.evaluate([report(alert(10038, 2), alert(10021, 1))], {})
        self.assertEqual((len(high), len(medium)), (0, 1))

    def test_accepted_high_passes_but_a_stale_acceptance_fails(self):
        high, _, stale = zap_gate.evaluate([report(alert(40018, 3))], {'40018': 'reason'})
        self.assertEqual((high, stale), ([], []))
        _, _, stale = zap_gate.evaluate([report(alert(10038, 2))], {'40018': 'reason'})
        self.assertEqual(stale, ['40018'])

    def test_flat_report_shape(self):
        self.assertEqual(len(zap_gate.alerts_of({'alerts': [alert(1, 3)]})), 1)

    def test_empty_site_list_is_an_error(self):
        with self.assertRaises(ValueError):
            zap_gate.alerts_of({'site': []})

    def run_cli(self, content):
        with tempfile.TemporaryDirectory() as d:
            p = pathlib.Path(d) / 'r.json'
            if content is not None:
                p.write_text(json.dumps(content))
            return subprocess.run([sys.executable, str(HERE / 'zap_gate.py'), str(p)], capture_output=True, text=True).returncode

    def test_cli_exit_codes(self):
        self.assertEqual(self.run_cli(report(alert(1, 1))), 0)
        self.assertEqual(self.run_cli(report(alert(40018, 3))), 1)
        self.assertEqual(self.run_cli(None), 1)               # no report
        self.assertEqual(self.run_cli({'site': []}), 1)       # scan reached nothing
        self.assertEqual(self.run_cli({'foo': 1}), 1)


if __name__ == '__main__':
    unittest.main()
