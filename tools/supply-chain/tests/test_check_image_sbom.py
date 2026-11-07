import importlib.util
import pathlib
import unittest

SPEC = importlib.util.spec_from_file_location('check_image_sbom', pathlib.Path(__file__).resolve().parents[1] / 'check_image_sbom.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


def comp(purl, type_='library'):
    return {'type': type_, 'name': purl, 'purl': purl}


def good():
    return {'bomFormat': 'CycloneDX', 'components': [comp(f'pkg:npm/p{i}@1.0.0') for i in range(40)] + [comp(f'pkg:apk/alpine/o{i}@1.0') for i in range(20)]}


class CheckImageSbom(unittest.TestCase):
    def test_a_real_looking_sbom_passes(self):
        self.assertEqual(m.check(good()), [])

    def test_packages_nested_under_application_components_are_counted(self):
        flat = good()['components']
        nested = {'bomFormat': 'CycloneDX', 'components': [{'type': 'application', 'name': 'app', 'components': flat[:40]}, {'type': 'operating-system', 'name': 'alpine', 'components': flat[40:]}]}
        self.assertEqual(m.check(nested), [])

    def test_wrong_format_empty_and_missing_layers_fail(self):
        d = good(); d['bomFormat'] = 'SPDX'
        self.assertTrue(any('bomFormat' in p for p in m.check(d)))
        self.assertTrue(any('components' in p for p in m.check({'bomFormat': 'CycloneDX', 'components': []})))
        d = good(); d['components'] = [c for c in d['components'] if 'npm' not in c['purl']] + [comp(f'pkg:apk/alpine/x{i}@1') for i in range(60)]
        self.assertTrue(any('npm' in p for p in m.check(d)))
        d = good(); d['components'] = [c for c in d['components'] if 'apk' not in c['purl']] + [comp(f'pkg:npm/y{i}@1') for i in range(60)]
        self.assertTrue(any('apk/deb' in p for p in m.check(d)))


if __name__ == '__main__':
    unittest.main()
