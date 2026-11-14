"""The server-inspect.yml step that hands the Cloudflare TURN keys to the server for tools/ops/tasks/70b-turn-env.sh: only when the task is listed, on ssh stdin into a mode-600 file, never echoed."""
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
WORKFLOW = os.path.join(HERE, "..", "..", "..", ".github", "workflows", "server-inspect.yml")


class WorkflowHandover(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import yaml
        cls.wf = yaml.safe_load(open(WORKFLOW))
        cls.text = open(WORKFLOW).read()
        cls.steps = cls.wf["jobs"]["ops"]["steps"]

    def step(self, prefix):
        return next(s for s in self.steps if str(s.get("name", "")).startswith(prefix))

    def test_the_secrets_are_read_only_by_the_handover_step_and_only_when_the_task_is_listed(self):
        hand = self.step("Hand the Cloudflare TURN keys")
        self.assertEqual(hand["env"]["CF_TURN_KEY_ID"], "${{ secrets.CF_TURN_KEY_ID }}")
        self.assertEqual(hand["env"]["CF_TURN_API_TOKEN"], "${{ secrets.CF_TURN_API_TOKEN }}")
        self.assertEqual(self.text.count("secrets.CF_TURN_KEY_ID"), 1)
        self.assertEqual(self.text.count("secrets.CF_TURN_API_TOKEN"), 1)
        self.assertIn("70b-turn-env", hand["run"])
        self.assertTrue(self.wf["jobs"]["ops"]["environment"] == "production")      # the secrets live in the production environment (the owner's approval gate)

    def test_the_values_go_on_ssh_stdin_into_a_mode_600_file_and_are_never_echoed(self):
        run = self.step("Hand the Cloudflare TURN keys")["run"]
        self.assertIn("umask 077; cat > \"$HOME/ops-turn.env\"", run)
        self.assertRegex(run, r"printf 'CF_TURN_KEY_ID=%s\\nCF_TURN_API_TOKEN=%s\\n' \"\$CF_TURN_KEY_ID\" \"\$CF_TURN_API_TOKEN\" \\\n\s+\| ssh")
        for line in run.splitlines():
            if line.strip().startswith("echo"):
                self.assertNotIn("$CF_TURN", line)

    def test_order_hand_over_then_run_then_remove_then_drop_the_ssh_key(self):
        names = [str(s.get("name", "")) for s in self.steps]
        i_hand = next(i for i, n in enumerate(names) if n.startswith("Hand the Cloudflare TURN"))
        i_run = names.index("Run tasks")
        i_rm = next(i for i, n in enumerate(names) if n.startswith("Remove the TURN key file"))
        i_key = names.index("Cleanup key")
        self.assertLess(i_hand, i_run); self.assertLess(i_run, i_rm); self.assertLess(i_rm, i_key)
        self.assertEqual(self.step("Remove the TURN key file")["if"], "${{ always() }}")


if __name__ == "__main__":
    unittest.main()
