"""tools/ops/tasks/97-translate-content.sh STEP=plan against a fake docker: the plan reads the packaged external answers too (one file for both), aborts when the image has none."""
import os
import stat
import subprocess
import tempfile
import unittest

TASK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tasks", "97-translate-content.sh")


def write_exec(path, text):
    with open(path, "w") as f:
        f.write(text)
    os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)


class TranslatePlanExternal(unittest.TestCase):
    def run_task(self, settings, image_has_external=True):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        d = tmp.name
        b = os.path.join(d, "bin"); os.makedirs(b)
        work = os.path.join(d, "work"); os.makedirs(work)
        inn = os.path.join(d, "in"); os.makedirs(inn)
        for n in ("requests.jsonl", "responses.jsonl"):
            with open(os.path.join(work, n), "w") as f:
                f.write("{}\n")
        log = os.path.join(d, "docker.log")
        write_exec(os.path.join(b, "sudo"), '#!/bin/bash\n[ "$1" = -n ] && shift\nexec "$@"\n')
        write_exec(os.path.join(b, "docker"), f'''#!/bin/bash
echo "$*" >> "{log}"
case "$1" in
  inspect) echo healthy;;
  exec)
    case "$*" in
      *"ls dist/modules/medicines/data/translations-external/*.jsonl >/dev/null"*) {"exit 0" if image_has_external else "exit 1"};;
      *"| wc -l"*) echo 3;;
      *"translate-product-content.js plan"*) echo '{{"step":"plan","accepted":5,"total_items":8}}';;
    esac;;
esac
exit 0
''')
        src = open(TASK).read()
        for k, v in settings.items():
            src = src.replace(f'{k}="packaged"', f'{k}="{v}"', 1) if k == "EXTERNAL" else src
        script = os.path.join(d, "97.sh")
        with open(script, "w") as f:
            f.write(src.replace("\nset -u\nSTEP=\"gaps\"", "\nset -u\nSTEP=\"plan\"", 1))
        env = dict(os.environ, PATH=b + os.pathsep + os.environ["PATH"], HOME=d, OPS_CATALOGUE_DIR=inn, OPS_TRANSLATE_DIR=work)
        p = subprocess.run(["bash", script], env=env, capture_output=True, text=True, timeout=30)
        return p, open(log).read() if os.path.exists(log) else ""

    def test_plan_passes_the_packaged_external_dir(self):
        p, calls = self.run_task({})
        self.assertIn("translate-product-content.js plan", calls, p.stdout + p.stderr)
        self.assertIn("--external=dist/modules/medicines/data/translations-external", calls)
        self.assertIn("plan also reads the packaged external answers", p.stdout)

    def test_external_off_is_provider_answers_only(self):
        p, calls = self.run_task({"EXTERNAL": ""})
        self.assertIn("translate-product-content.js plan", calls, p.stdout + p.stderr)
        self.assertNotIn("--external", calls)

    def test_aborts_when_the_image_has_no_external_answers(self):
        p, calls = self.run_task({}, image_has_external=False)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ABORT the running image has no", p.stdout)
        self.assertNotIn("translate-product-content.js plan", calls)


if __name__ == "__main__":
    unittest.main()
