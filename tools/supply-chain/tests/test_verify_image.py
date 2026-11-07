import os
import pathlib
import stat
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[3]
SCRIPT = ROOT / 'deploy' / 'scripts' / 'verify-image.sh'
D = 'sha256:' + 'c' * 64
IMG = f'ghcr.io/o/nabd-backend@{D}'


def run(image, fake_body):
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        cosign = t / 'cosign'
        cosign.write_text('#!/usr/bin/env bash\necho "$@" >> "$LOG"\n' + fake_body)
        cosign.chmod(cosign.stat().st_mode | stat.S_IEXEC)
        log = t / 'log'
        env = {**os.environ, 'COSIGN': str(cosign), 'LOG': str(log), 'REPO': 'o/new'}
        p = subprocess.run(['bash', str(SCRIPT), image] if image else ['bash', str(SCRIPT)], env=env, capture_output=True, text=True)
        return p, (log.read_text() if log.exists() else '')


class VerifyImage(unittest.TestCase):
    def test_refuses_a_tag_and_a_missing_or_short_digest_without_calling_cosign(self):
        for bad in ['', 'ghcr.io/o/nabd-backend:v1', 'ghcr.io/o/nabd-backend', 'ghcr.io/o/nabd-backend@sha256:abc']:
            p, log = run(bad, 'exit 0\n')
            self.assertEqual(p.returncode, 2, bad)
            self.assertEqual(log, '')

    def test_ok_when_signature_and_sbom_attestation_verify_for_this_repo_workflow(self):
        p, log = run(IMG, 'exit 0\n')
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertIn('verify ', log)
        self.assertIn('verify-attestation --type cyclonedx', log)
        self.assertIn('https://token.actions.githubusercontent.com', log)
        self.assertIn('o/new/\\.github/workflows/image-publish\\.yml', log)
        self.assertIn(IMG, log)

    def test_fails_when_the_signature_does_not_verify_and_never_looks_at_the_attestation(self):
        p, log = run(IMG, 'exit 1\n')
        self.assertEqual(p.returncode, 1)
        self.assertIn('NO valid signature', p.stderr)
        self.assertNotIn('verify-attestation', log)

    def test_fails_when_signed_but_the_sbom_attestation_is_missing(self):
        p, _ = run(IMG, 'if [ "$1" = verify-attestation ]; then exit 1; fi\nexit 0\n')
        self.assertEqual(p.returncode, 1)
        self.assertIn('NO CycloneDX SBOM attestation', p.stderr)


if __name__ == '__main__':
    unittest.main()
