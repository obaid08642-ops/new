"""tools/ops/tasks/99p-publish-agreement.sh against a fake docker/sudo and a real uploaded-release directory (tar.gz + SHA256SUMS)."""
import hashlib
import os
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "99p-publish-agreement.sh")
AR = "03_PROVIDER_AGREEMENT.ar.md"
EN = "03_PROVIDER_AGREEMENT.en.md"
SECRET = "pw-must-never-be-printed-9f3a"


def slurp(path):
    with open(path) as f:
        return f.read()


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class PublishAgreement(unittest.TestCase):
    def setUp(self):
        t = tempfile.TemporaryDirectory(); self.addCleanup(t.cleanup); self.t = t.name
        self.b = os.path.join(self.t, "bin"); os.makedirs(self.b)
        self.rel = os.path.join(self.t, "releases"); os.makedirs(self.rel)
        self.deploy = os.path.join(self.t, "deploy"); os.makedirs(self.deploy)
        self.log = os.path.join(self.t, "docker.log")
        self.state = os.path.join(self.t, "published")
        self.health = "healthy"
        with open(os.path.join(self.deploy, ".env.production"), "w") as f:
            f.write(f"MONGO_ROOT_USER=root\nMONGO_ROOT_PASSWORD={SECRET}\nDB_NAME=nabd_test\n")
        write_exec(os.path.join(self.b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        self.docker()
        self.release()

    # ---- fixtures
    def release(self, prefix="docs/legal", corrupt=False, drop=None):
        d = os.path.join(self.rel, "aa11bb22"); os.makedirs(d, exist_ok=True)
        tgz = os.path.join(d, "deploy.tgz")
        src = os.path.join(self.t, "src")
        shutil.rmtree(src, ignore_errors=True)
        os.makedirs(os.path.join(src, prefix), exist_ok=True)
        os.makedirs(os.path.join(src, "deploy"), exist_ok=True)
        for f, text in ((AR, "**الإصدار:** 1.0\nنص عربي\n"), (EN, "**Version:** 1.0\nenglish text\n")):
            if f != drop:
                with open(os.path.join(src, prefix, f), "w") as h:
                    h.write(text)
        with open(os.path.join(src, "deploy", "compose.yml"), "w") as h:
            h.write("x: 1\n")
        with tarfile.open(tgz, "w:gz") as tar:
            tar.add(os.path.join(src, "deploy"), arcname="deploy")
            if os.path.isdir(os.path.join(src, prefix)):
                tar.add(os.path.join(src, prefix.split("/")[0]), arcname=prefix.split("/")[0])
        with open(tgz, "rb") as h:
            digest = hashlib.sha256(h.read()).hexdigest()
        with open(os.path.join(d, "SHA256SUMS"), "w") as h:
            h.write(f"{'0' * 64 if corrupt else digest}  deploy.tgz\n")

    def docker(self, tool_exit=0, has_tool=True):
        health = self.health
        write_exec(os.path.join(self.b, "docker"), f'''#!/bin/bash
echo "$@" >> "{self.log}"
case "$1" in
  inspect)
    case "$*" in
      *State.Health*) echo {health};;
      *Config.Image*) echo nabdah-backend:test;;
      *Networks*) echo "nabdah_default ";;
    esac;;
  exec) {"exit 0" if has_tool else "exit 1"};;
  run)
    apply=no; envf=""; vol=""; prev=""
    for a in "$@"; do
      case "$prev" in --env-file) envf="$a";; -v) vol="$a";; esac
      case "$a" in APPLY=*) apply="${{a#APPLY=}}";; esac
      prev="$a"
    done
    echo "ENVFILE=$envf MODE=$(stat -c %a "$envf" 2>/dev/null)" >> "{self.log}"
    grep -q '^MONGO_URL=' "$envf" 2>/dev/null && echo "ENV_HAS_MONGO_URL" >> "{self.log}"
    ls "${{vol%%:*}}" >> "{self.log}" 2>/dev/null
    [ {tool_exit} -ne 0 ] && {{ echo "a version 1.0 is already published; publish a higher version"; exit {tool_exit}; }}
    if [ "$apply" = yes ]; then echo ok > "{self.state}"; echo '{{"step":"publish","version":"1.0","result":"published","published":true,"previous_version":null,"draft_retired":true,"backup_ids":["64f0c0ffee11"],"sha_ar":"aaaaaaaaaaaa","sha_en":"bbbbbbbbbbbb","acceptance_required":false}}'
    elif [ -f "{self.state}" ]; then echo '{{"step":"publish","version":"1.0","result":"unchanged","published":false,"previous_version":"1.0","draft_retired":false,"backup_ids":[],"sha_ar":"aaaaaaaaaaaa","sha_en":"bbbbbbbbbbbb","acceptance_required":false}}'
    else echo '{{"step":"publish","version":"1.0","result":"dry-run-would-publish","published":false,"previous_version":null,"draft_retired":true,"backup_ids":[],"sha_ar":"aaaaaaaaaaaa","sha_en":"bbbbbbbbbbbb","acceptance_required":false}}'; fi;;
esac
exit 0
''')

    def run_task(self, **kv):
        src = slurp(TASK)
        for k, v in kv.items():
            src = re.sub(rf'^{k}="[^"]*"', f'{k}="{v}"', src, count=1, flags=re.M)
        script = os.path.join(self.t, "task.sh")
        write_exec(script, src)
        env = dict(os.environ, PATH=self.b + os.pathsep + os.environ["PATH"], OPS_DEPLOY_DIR=self.deploy, OPS_RELEASE_DIR=self.rel)
        return subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=60)

    def runs(self):
        return [l for l in slurp(self.log).splitlines() if l.startswith("run ")] if os.path.exists(self.log) else []

    # ---- tests
    def test_dry_run_publishes_nothing_and_prints_status_lines_only(self):
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("published: no. Dry run only", p.stdout)
        self.assertIn("version 1.0: dry-run-would-publish; hashes ar=aaaaaaaaaaaa en=bbbbbbbbbbbb", p.stdout)
        self.assertIn("texts from release aa11bb22: ar sha256=", p.stdout)
        self.assertEqual(len(self.runs()), 1)
        self.assertFalse(os.path.exists(self.state))
        for line in p.stdout.splitlines():
            self.assertTrue(line.startswith(("status: publish-agreement:", "##")), line)
        self.assertNotIn(SECRET, p.stdout + p.stderr)

    def test_the_container_is_one_off_capped_and_mounts_the_release_texts_read_only(self):
        self.run_task()
        r = self.runs()[0]
        self.assertIn("--memory 300m", r)
        self.assertIn("--memory-swap 300m", r)
        self.assertIn("--oom-score-adj 1000", r)
        self.assertIn("--network nabdah_default", r)
        self.assertIn(":/legal:ro", r)
        self.assertIn("LEGAL_DOCS_DIR=/legal", r)
        self.assertIn("REQUIRE_ACCEPTANCE=no", r)
        self.assertIn("node dist/scripts/publish-provider-agreement.js", r)
        self.assertIn("nabdah-backend:test", r)
        log = slurp(self.log)
        self.assertIn("MODE=600", log)
        self.assertIn("ENV_HAS_MONGO_URL", log)
        self.assertIn(AR, log); self.assertIn(EN, log)   # both texts were visible in the mounted directory
        envf = re.search(r"ENVFILE=(\S+)", log).group(1)
        self.assertFalse(os.path.exists(envf), "the temp env file is removed at the end")

    def test_apply_publishes_prints_the_backup_id_and_verifies(self):
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("version 1.0: published", p.stdout)
        self.assertIn("backup row ids: 64f0c0ffee11", p.stdout)
        self.assertIn("draft row retired: true", p.stdout)
        self.assertIn("verified: the published row equals the texts of release aa11bb22. published: yes", p.stdout)
        self.assertEqual(len(self.runs()), 3)   # plan, apply, verify
        self.assertTrue(any("APPLY=yes" in r for r in self.runs()))
        self.assertNotIn(SECRET, p.stdout + p.stderr)

    def test_require_acceptance_yes_is_passed_on(self):
        self.run_task(REQUIRE_ACCEPTANCE="yes")
        self.assertIn("REQUIRE_ACCEPTANCE=yes", self.runs()[0])

    def test_the_texts_are_also_found_under_deploy_legal(self):
        self.release(prefix="deploy/legal")
        p = self.run_task()
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertIn("texts from release aa11bb22", p.stdout)

    def test_a_release_without_the_texts_aborts_before_any_container_runs(self):
        self.release(drop=EN)
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1)
        self.assertIn(f"does not hold docs/legal/{EN}", p.stdout)
        self.assertIn("add the two files to the release bundle", p.stdout)
        self.assertEqual(self.runs(), [])

    def test_a_bad_checksum_aborts(self):
        self.release(corrupt=True)
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1)
        self.assertIn("checksum does not match", p.stdout)
        self.assertEqual(self.runs(), [])

    def test_no_release_aborts(self):
        for root, dirs, files in os.walk(self.rel, topdown=False):
            for f in files: os.remove(os.path.join(root, f))
            for d in dirs: os.rmdir(os.path.join(root, d))
        p = self.run_task()
        self.assertEqual(p.returncode, 1)
        self.assertIn("no uploaded release", p.stdout)

    def test_an_unhealthy_backend_or_an_image_without_the_tool_aborts(self):
        self.health = "unhealthy"; self.docker()
        p = self.run_task()
        self.assertEqual(p.returncode, 1); self.assertIn("is not healthy", p.stdout)
        self.health = "healthy"; self.docker(has_tool=False)
        p = self.run_task()
        self.assertEqual(p.returncode, 1); self.assertIn("deploy the release first", p.stdout)
        self.assertEqual(self.runs(), [])

    def test_a_tool_refusal_is_reported_and_nothing_is_published(self):
        self.docker(tool_exit=1)
        p = self.run_task(APPLY="yes")
        self.assertEqual(p.returncode, 1)
        self.assertIn("the tool refused or failed (exit 1): a version 1.0 is already published", p.stdout)
        self.assertNotIn("published: yes", p.stdout)
        self.assertFalse(os.path.exists(self.state))
        self.assertEqual(len(self.runs()), 1)   # the plan failed, so no apply was attempted


if __name__ == "__main__":
    unittest.main()
