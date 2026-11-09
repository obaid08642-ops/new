import os, plistlib, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(__file__))
import calls_static_check as c

PERMS = c.PERMS
XML = '<manifest xmlns:android="http://schemas.android.com/apk/res/android">' + ''.join(f'<uses-permission android:name="{p}"/>' for p in PERMS) + '''
<application><service android:name="io.wazo.callkeep.VoiceConnectionService" android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE">
<intent-filter><action android:name="android.telecom.ConnectionService"/></intent-filter></service></application></manifest>'''

A = 'http://schemas.android.com/apk/res/android'
DUMP = 'N: android=%s (line=2)\n  E: manifest (line=2)\n' % A + ''.join(
    f'    E: uses-permission (line=7)\n      A: {A}:name(0x01010003)="{p}" (Raw: "{p}")\n' for p in PERMS) + f'''    E: application (line=20)
      E: service (line=30)
        A: {A}:name(0x01010003)="io.wazo.callkeep.VoiceConnectionService" (Raw: "io.wazo.callkeep.VoiceConnectionService")
        A: {A}:permission(0x01010006)="android.permission.BIND_TELECOM_CONNECTION_SERVICE" (Raw: "android.permission.BIND_TELECOM_CONNECTION_SERVICE")
        E: intent-filter (line=34)
          E: action (line=35)
            A: {A}:name(0x01010003)="android.telecom.ConnectionService" (Raw: "android.telecom.ConnectionService")
      E: service (line=40)
        A: {A}:name(0x01010003)="com.other.Service" (Raw: "com.other.Service")
'''


def write(text, suffix):
    f = tempfile.NamedTemporaryFile('w', suffix=suffix, delete=False, encoding='utf8'); f.write(text); f.close(); return f.name


class AndroidChecks(unittest.TestCase):
    def test_xml_all_pass(self):
        r = c.android_checks(write(XML, '.xml'))
        self.assertTrue(all(r.values()), r)

    def test_aapt_dump_all_pass(self):
        r = c.android_checks(write(DUMP, '.txt'))
        self.assertTrue(all(r.values()), r)

    def test_missing_service_and_permission_fail(self):
        r = c.android_checks(write(XML.replace('io.wazo.callkeep.VoiceConnectionService', 'x.Y').replace('MANAGE_OWN_CALLS', 'OTHER'), '.xml'))
        self.assertFalse(r['service:connection']); self.assertFalse(r['service:bind-permission']); self.assertFalse(r['perm:android.permission.MANAGE_OWN_CALLS'])

    def test_service_without_the_telecom_permission_fails(self):
        r = c.android_checks(write(DUMP.replace('BIND_TELECOM_CONNECTION_SERVICE', 'SOMETHING_ELSE'), '.txt'))
        self.assertTrue(r['service:connection']); self.assertFalse(r['service:bind-permission'])

    def test_a_second_service_does_not_take_the_first_ones_action(self):
        r = c.android_checks(write(DUMP.replace('io.wazo.callkeep.VoiceConnectionService', 'a.B', 1), '.txt'))
        self.assertFalse(r['service:connection'])

    def test_an_action_outside_any_service_does_not_crash(self):
        # a real APK has activities with <action> intent filters; the parser used to raise KeyError: 'svc' on the first one
        dump = DUMP.replace('    E: application (line=20)\n', f'    E: application (line=20)\n      E: activity (line=21)\n        E: intent-filter (line=22)\n          E: action (line=23)\n            A: {A}:name(0x01010003)="android.intent.action.MAIN" (Raw: "android.intent.action.MAIN")\n', 1)
        self.assertTrue(c.android_checks(write(dump, '.txt'))['service:connection'])


class IosChecks(unittest.TestCase):
    def plist(self, modes):
        d = tempfile.mkdtemp(); p = os.path.join(d, 'Info.plist')
        with open(p, 'wb') as f: plistlib.dump({'UIBackgroundModes': modes, 'CFBundleExecutable': 'App'}, f)
        return p

    def test_modes(self):
        self.assertEqual(c.ios_checks(self.plist(['voip', 'remote-notification', 'audio'])), {'plist:voip': True, 'plist:remote-notification': True})
        self.assertFalse(c.ios_checks(self.plist(['audio']))['plist:voip'])


class Cli(unittest.TestCase):
    def run_cli(self, *a):
        return subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'calls_static_check.py'), *a], capture_output=True, text=True)

    def test_exit_codes(self):
        self.assertEqual(self.run_cli('android', write(XML, '.xml'), '--app', 'patient').returncode, 0)
        bad = self.run_cli('android', write(XML.replace('USE_FULL_SCREEN_INTENT', 'X'), '.xml'), '--app', 'patient')
        self.assertEqual(bad.returncode, 1); self.assertIn('FAIL  android patient  perm:android.permission.USE_FULL_SCREEN_INTENT', bad.stdout)
        self.assertEqual(self.run_cli().returncode, 2)


if __name__ == '__main__':
    unittest.main()
