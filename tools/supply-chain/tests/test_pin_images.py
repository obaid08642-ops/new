import importlib.util
import pathlib
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('pin_images', pathlib.Path(__file__).resolve().parents[1] / 'pin_images.py')
pin_images = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pin_images)

D1 = 'sha256:' + 'a' * 64
D2 = 'sha256:' + 'b' * 64


class ParseRef(unittest.TestCase):
    def test_docker_hub_defaults(self):
        self.assertEqual(pin_images.parse_ref('node:22.23.4-alpine'), ('library/node', '22.23.4-alpine', None))
        self.assertEqual(pin_images.parse_ref('redis'), ('library/redis', 'latest', None))
        self.assertEqual(pin_images.parse_ref('getmeili/meilisearch:v1.10'), ('getmeili/meilisearch', 'v1.10', None))
        self.assertEqual(pin_images.parse_ref(f'mongo:7.0@{D1}'), ('library/mongo', '7.0', D1))


class Files(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.old_root = pin_images.ROOT
        pin_images.ROOT = self.root
        (self.root / 'Dockerfile').write_text(
            f'FROM node:22-alpine AS builder\nRUN echo hi\nFROM builder AS test\nFROM node:22-alpine@{D1} AS production\nFROM scratch\n')
        (self.root / 'compose.yml').write_text(
            'services:\n  a:\n    image: mongo:7.0   # keep this comment\n  b:\n    image: nabdah-patient-web:v50\n  c:\n    image: "busybox:1.36"\n  d:\n    image: zd-stub:${VERSION:-v1}\n  e:\n    image: redis:7-alpine@' + D2 + '\n')

    def tearDown(self):
        pin_images.ROOT = self.old_root
        self.tmp.cleanup()

    def test_check_finds_unpinned_and_skips_stages_scratch_local_and_variables(self):
        bad = pin_images.check(['Dockerfile', 'compose.yml'])
        self.assertEqual(len(bad), 3)  # node:22-alpine builder, mongo:7.0 and the quoted busybox
        self.assertTrue(any('Dockerfile:1' in b for b in bad))
        self.assertTrue(any('compose.yml:3' in b for b in bad))

    def test_pin_adds_digest_keeps_tag_and_comment_and_refreshes_old_digest(self):
        calls = []

        def fake(repo, tag):
            calls.append((repo, tag))
            return D1 if repo == 'library/node' else D2

        n = pin_images.pin(['Dockerfile', 'compose.yml'], resolve=fake)
        self.assertEqual(n, 3)
        self.assertIn(f'FROM node:22-alpine@{D1} AS builder', (self.root / 'Dockerfile').read_text())
        text = (self.root / 'compose.yml').read_text()
        self.assertIn(f'image: mongo:7.0@{D2}   # keep this comment', text)
        self.assertIn('image: nabdah-patient-web:v50\n', text)
        self.assertIn(f'image: "busybox:1.36@{D2}"', text)
        self.assertEqual(pin_images.check(['Dockerfile', 'compose.yml']), [])
        # the same repo:tag is resolved once however many times it appears
        self.assertEqual(len(calls), len(set(calls)))

    def test_pin_refreshes_a_stale_digest(self):
        pin_images.pin(['compose.yml'], resolve=lambda repo, tag: D1)
        self.assertIn(f'redis:7-alpine@{D1}', (self.root / 'compose.yml').read_text())
        self.assertNotIn(D2, (self.root / 'compose.yml').read_text())


class RealRepo(unittest.TestCase):
    def test_every_production_image_reference_is_pinned(self):
        self.assertEqual(pin_images.check(), [])

    def test_the_production_set_exists_and_has_references(self):
        refs = list(pin_images.references())
        self.assertGreater(len(refs), 15)
        for rel in pin_images.PRODUCTION_FILES:
            self.assertTrue((pin_images.ROOT / rel).exists(), rel)


if __name__ == '__main__':
    unittest.main()
