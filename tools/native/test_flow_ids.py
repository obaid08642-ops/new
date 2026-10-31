"""The Maestro flows only use controls that exist in the apps, and only variables the runners supply.

Run: python3 -m unittest tools/native/test_flow_ids.py      (needs PyYAML: pip install pyyaml)

For every flow in tools/native/flows (and its runFlow sub-flows) it checks that
  * the file is valid YAML and starts with the config document (appId) and the commands list,
  * every `id:` (a regular expression in Maestro) matches a testID written in the app source (patient-app/app, patient-app/src,
    packages/ui-native/src, provider-app): a literal one, a template one such as `book-slot-${i}`, or one a shared component derives
    from the testID its screen passes (the tab bar, a Segmented option, the open button of an appointment card; each rule below
    is verified against the component's source too),
  * every `runFlow: file` exists,
  * every ${VARIABLE} is one run_job.sh / run_job_ios.sh pass (EMAIL, PASSWORD, ...), or one the flow's setup script prints.
"""
import glob, os, re, unittest

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FLOWS = os.path.join(ROOT, 'tools', 'native', 'flows')
SOURCE_DIRS = ['patient-app/app', 'patient-app/src', 'packages/ui-native/src', 'provider-app']
SKIP_DIRS = {'node_modules', '__tests__', '.expo'}
RUNNER_VARS = {'EMAIL', 'EMAIL_LOCAL', 'EMAIL_DOMAIN', 'PASSWORD', 'DOCTOR_MSG', 'APP_MSG'}

TESTID = re.compile(r"""testID\s*(?:[=:]|\?\?)\s*(?:"([^"]+)"|'([^']+)'|\{\s*"([^"]+)"\s*\}|\{\s*'([^']+)'\s*\}|\{\s*`([^`]+)`\s*\})""")


def source_files():
    for d in SOURCE_DIRS:
        for base, dirs, files in os.walk(os.path.join(ROOT, d)):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            for f in files:
                if f.endswith(('.tsx', '.ts')):
                    yield os.path.join(base, f)


def read(path):
    with open(path if os.path.isabs(path) else os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def source_ids():
    """The testIDs written in the apps; a template one (`x-${i}`) is kept as a regular expression that matches what it makes."""
    out = set()
    for path in source_files():
        for m in TESTID.finditer(read(path)):
            value = next(g for g in m.groups() if g)
            if len(re.sub(r'\$\{[^}]*\}', '', value)) >= 3:   # a template that is all variable (`${id}`) would match any id
                out.add(value)
    return out


def derived_ids():
    """testIDs that shared components build from the one their screen passes (each rule is checked against the component source)."""
    out = set()
    # BottomTabBar -> TabBar: `${testID}-${item.key}` for the tab ids of MainTabBar
    tab_bar = read('packages/ui-native/src/shells/TabBar.tsx')
    main = read('patient-app/src/components/navigation/MainTabBar.tsx')
    assert tab_bar.count('testID={testID ? `${testID}-${item.key}` : undefined}') == 2
    assert 'testID="main-tab-bar"' in main
    out |= {f'main-tab-bar-{t}' for t in re.findall(r"\{ id: '(\w+)', art:", main)}
    # Segmented: `${testID}-${o.value}` for the option values of the screen's Segmented
    assert '`${testID}-${o.value}`' in read('packages/ui-native/src/components/Controls.tsx')
    appointments = read('patient-app/app/consultations/appointments.tsx')
    assert 'testID="appointments-tabs"' in appointments
    out |= {f'appointments-tabs-{v}' for v in re.findall(r"\{ value: '(\w+)', label: k\('consult\.appt\.", appointments)}
    confirm = read('patient-app/src/components/BookingConfirmForm.tsx')
    assert 'testID="booking-pay-method"' in confirm
    out |= {f'booking-pay-method-{v}' for v in re.findall(r"\{ value: '(\w+)', label: k\('consult\.confirm\.", confirm)}
    # ApptCard: the card's own testID, and `${testID}-open` on its pressable
    assert 'testID={testID ? `${testID}-open` : undefined}' in read('patient-app/src/components/consult/ConsultKit.tsx')
    assert 'testID={`appointment-${a.id}`}' in appointments
    out.add('appointment-${a.id}-open')
    return out


def sample(template):
    """What a template testID makes for one item: `book-slot-${i}` -> `book-slot-x`."""
    return re.sub(r'\$\{[^}]*\}', 'x', template)


def id_exists(flow_id, ids):
    """A Maestro id is a regular expression matched against the whole testID."""
    flow_pattern = re.compile(re.sub(r'\$\{[A-Z_]+\}', 'x', flow_id))
    for src in ids:
        if flow_pattern.fullmatch(sample(src)):
            return True
        # a literal id in the flow against a template id in the source (appointment-<id>-open)
        if '${' in src and re.fullmatch(re.sub(r'\\\$\\\{[^}]*\\\}', '.+', re.escape(src)), re.sub(r'\$\{[A-Z_]+\}', 'x', flow_id)):
            return True
    return False


def load(path):
    docs = list(yaml.safe_load_all(read(path)))
    assert len(docs) == 2 and isinstance(docs[0], dict) and docs[0].get('appId') and isinstance(docs[1], list), f'{path}: needs the appId config document and the commands'
    return docs[1]


def walk(commands):
    """Every command of a flow, nested ones (runFlow when/commands, repeat, ...) included."""
    for c in commands:
        yield c
        if isinstance(c, dict):
            for v in c.values():
                if isinstance(v, dict) and isinstance(v.get('commands'), list):
                    yield from walk(v['commands'])


def selectors(node):
    """Every `id:` in a command (visible / notVisible / tapOn / scrollUntilVisible.element ...)."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'id' and isinstance(value, str):
                yield value
            elif key != 'commands':
                yield from selectors(value)
    elif isinstance(node, list):
        for item in node:
            yield from selectors(item)


def flow_files():
    return sorted(glob.glob(os.path.join(FLOWS, '*.yaml')) + glob.glob(os.path.join(FLOWS, 'lib', '*.yaml')))


class FlowIds(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ids = source_ids() | derived_ids()

    def test_every_flow_is_valid_yaml(self):
        files = flow_files()
        self.assertGreaterEqual(len(files), 6)
        for path in files:
            load(path)

    def test_every_patient_flow_id_exists_in_the_app(self):
        for path in flow_files():
            if os.path.basename(path).startswith('provider_'):
                continue   # provider-app has no testIDs on its sign-in screens: its flow uses their text
            for command in walk(load(path)):
                for flow_id in selectors(command):
                    self.assertTrue(id_exists(flow_id, self.ids), f'{os.path.relpath(path, ROOT)}: no testID "{flow_id}" in the app source')

    def test_sub_flows_exist(self):
        for path in flow_files():
            for command in walk(load(path)):
                if isinstance(command, dict) and isinstance(command.get('runFlow'), (str, dict)):
                    target = command['runFlow'] if isinstance(command['runFlow'], str) else command['runFlow'].get('file')
                    if target:
                        self.assertTrue(os.path.exists(os.path.join(os.path.dirname(path), target)), f'{path}: runFlow {target} is missing')

    def test_variables_are_supplied(self):
        for path in flow_files():
            text = read(path)
            name = os.path.basename(path)
            setup = os.path.join(ROOT, 'tools', 'native', 'setup', name.replace('.yaml', '.py'))
            supplied = set(RUNNER_VARS)
            if os.path.exists(setup):
                supplied |= set(re.findall(r'json\.dumps\(\{\s*[\'"](\w+)[\'"]', read(setup)))
            for var in re.findall(r'\$\{(\w+)\}', text):
                if os.path.dirname(path).endswith('lib'):
                    continue   # a sub-flow gets the variables of the flow that calls it
                self.assertIn(var, supplied, f'{name}: ${{{var}}} is supplied by neither the runners nor a setup script')

    def test_the_checker_rejects_a_missing_id(self):
        self.assertFalse(id_exists('no-such-control-anywhere', self.ids))
        self.assertTrue(id_exists('login-submit', self.ids))
        self.assertTrue(id_exists('book-slot-.*', self.ids))


if __name__ == '__main__':
    unittest.main()
