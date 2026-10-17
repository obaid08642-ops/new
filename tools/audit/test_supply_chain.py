"""Phase 16.7 - the supply-chain checks catch what they claim to catch."""
import importlib.util
import json
import pathlib
import subprocess
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, HERE / f'{name}.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class PinActions(unittest.TestCase):
    def setUp(self):
        self.mod = load('pin_actions')
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.mod.ROOT = self.root

    def run_check(self, text):
        wf = self.root / 'wf.yml'
        wf.write_text(text)
        self.mod.FILES = [wf]
        return self.mod.check()

    def test_tag_is_refused(self):
        self.assertEqual(self.run_check('steps:\n  - uses: actions/checkout@v4\n'), 1)

    def test_branch_is_refused(self):
        self.assertEqual(self.run_check('steps:\n  - uses: some/action@main\n'), 1)

    def test_sha_with_comment_passes(self):
        sha = 'a' * 40
        self.assertEqual(self.run_check(f'steps:\n  - uses: actions/checkout@{sha} # v4\n'), 0)

    def test_sha_without_comment_is_refused(self):
        self.assertEqual(self.run_check(f'steps:\n  - uses: actions/checkout@{"b" * 40}\n'), 1)

    def test_local_and_docker_actions_are_skipped(self):
        self.assertEqual(self.run_check('steps:\n  - uses: ./.github/actions/x\n  - uses: docker://alpine:3\n'), 0)

    def test_the_repository_is_pinned(self):
        real = load('pin_actions')
        self.assertEqual(real.check(), 0)


class Lockfiles(unittest.TestCase):
    def test_repository_is_clean(self):
        mod = load('lockfile_check')
        self.assertEqual(mod.check_locks() + mod.check_installs(), [])

    def test_npm_install_fallback_is_caught(self):
        mod = load('lockfile_check')
        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            (root / '.github' / 'workflows').mkdir(parents=True)
            (root / '.github' / 'workflows' / 'x.yml').write_text(
                'steps:\n  - run: npm ci || npm install\n  - run: npm install --no-save typescript\n  - run: npm --prefix a install\n  - run: pnpm install\n')
            mod.ROOT = root
            found = mod.check_installs()
        self.assertEqual(len(found), 3, found)   # the fallback, the --prefix install and the unfrozen pnpm; --no-save is allowed


class Sbom(unittest.TestCase):
    def test_complete_sbom_passes_and_incomplete_fails(self):
        mod = load('check_sbom')
        deps = json.loads((mod.ROOT / 'admin' / 'package.json').read_text())['dependencies']
        good = {'bomFormat': 'CycloneDX', 'specVersion': '1.6', 'components': [{'name': 'app', 'components': [{'name': n} for n in deps]}]}
        self.assertEqual(mod.problems('admin', good), [])
        short = {'bomFormat': 'CycloneDX', 'specVersion': '1.6', 'components': [{'name': n} for n in list(deps)[1:]]}
        self.assertTrue(any('missing' in p for p in mod.problems('admin', short)))
        self.assertTrue(mod.problems('admin', {'bomFormat': 'SPDX'}))


class AuditGate(unittest.TestCase):
    def test_baseline_is_well_formed(self):
        b = json.loads((HERE / 'audit-baseline.json').read_text())
        self.assertEqual(set(b['apps']), {'backend', 'admin', 'patient-web', 'patient-app', 'provider-app'})
        for app, entries in b['apps'].items():
            for sev in entries.values():
                self.assertIn(sev, ('high', 'critical'), app)
        for app in ('backend', 'patient-app', 'provider-app'):
            if b['apps'][app]:
                self.assertTrue(b['reasons'].get(app), f'{app} has baseline entries but no reason')

    def test_unknown_app_is_a_usage_error(self):
        r = subprocess.run(['node', str(HERE / 'audit_gate.mjs'), 'nope'], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


if __name__ == '__main__':
    unittest.main()
