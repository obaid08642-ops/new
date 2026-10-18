"""The nginx header check fails on the mistakes it exists for (python3 -m unittest tools/audit/test_nginx_headers_check.py)."""
import os
import pathlib
import subprocess
import sys
import tempfile
import textwrap
import unittest

SCRIPT = pathlib.Path(__file__).with_name('nginx_headers_check.py')
SNIP = 'include /etc/nginx/snippets/security-headers.conf;'


def run(conf: str, main: str = 'http {\n  autoindex off;\n}\n'):
    with tempfile.TemporaryDirectory() as d:
        root = pathlib.Path(d)
        (root / 'conf.d').mkdir()
        (root / 'nginx.conf').write_text(main)
        (root / 'conf.d' / 'site.conf').write_text(textwrap.dedent(conf))
        p = subprocess.run([sys.executable, str(SCRIPT)], env={**os.environ, 'NGINX_ROOT': d}, capture_output=True, text=True)
        return p.returncode, p.stdout


class NginxHeadersCheck(unittest.TestCase):
    def test_a_static_site_with_the_snippet_everywhere_passes(self):
        code, out = run(f'''
            server {{ listen 443 ssl; server_name a.test; root /srv; {SNIP}
              location / {{ try_files $uri /index.html; add_header Cache-Control "public"; {SNIP} }} }}''')
        self.assertEqual(code, 0, out)

    def test_a_location_with_its_own_add_header_that_drops_the_snippet_fails(self):
        code, out = run(f'''
            server {{ listen 443 ssl; server_name a.test; root /srv; {SNIP}
              location / {{ try_files $uri /index.html; add_header Cache-Control "public"; }} }}''')
        self.assertEqual(code, 1)
        self.assertIn('nginx drops the inherited headers', out)

    def test_a_static_site_without_the_snippet_fails(self):
        code, out = run('server { listen 443 ssl; server_name a.test; root /srv; location / { try_files $uri /index.html; } }')
        self.assertEqual(code, 1)
        self.assertIn('server level', out)

    def test_a_proxied_app_is_left_alone_so_its_own_headers_stand(self):
        code, out = run('server { listen 443 ssl; server_name app.test; location / { proxy_pass http://app; add_header X-Cache hit; } }')
        self.assertEqual(code, 0, out)

    def test_an_aliased_well_known_file_with_a_cache_header_needs_the_snippet(self):
        code, _ = run('server { listen 443 ssl; server_name a.test; location = /.well-known/x { alias /srv/x; add_header Cache-Control "public"; } }')
        self.assertEqual(code, 1)

    def test_autoindex_on_fails_and_a_missing_autoindex_off_fails(self):
        code, out = run('server { listen 443 ssl; server_name a.test; location / { autoindex on; proxy_pass http://app; } }')
        self.assertEqual(code, 1)
        self.assertIn('autoindex on', out)
        code, out = run('server { listen 443 ssl; server_name a.test; location / { proxy_pass http://app; } }', main='http { }\n')
        self.assertEqual(code, 1)
        self.assertIn('autoindex off', out)

    def test_the_repository_passes(self):
        p = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True)
        self.assertEqual(p.returncode, 0, p.stdout)


if __name__ == '__main__':
    unittest.main()
