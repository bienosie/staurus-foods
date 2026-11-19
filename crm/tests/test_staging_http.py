import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

spec = importlib.util.spec_from_file_location('staging_http', Path(__file__).parents[1] / 'scripts/verify-staging-http.py')
http = importlib.util.module_from_spec(spec)
spec.loader.exec_module(http)


class Response:
    def __init__(self, status, headers, body=b''):
        self.status, self.headers, self.body = status, headers, body
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self): return self.body


class StagingHTTP(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.bundle = Path(self.temp.name)
        self.manifest = {'mode': 'crm-staging', 'source_sha': 'a' * 40, 'files': {}}
        for name in http.FILES:
            data = ('fixture ' + name).encode()
            (self.bundle / name).write_bytes(data)
            self.manifest['files'][name] = hashlib.sha256(data).hexdigest()
        self.save_manifest()
        self.requests = []
        self.headers = {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
                        'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
                        'Referrer-Policy': 'no-referrer',
                        'Content-Security-Policy': "connect-src https://fpseihhfrkhpbmpahqgm.supabase.co; frame-ancestors 'none'"}

    def save_manifest(self):
        (self.bundle / 'release.json').write_text(json.dumps(self.manifest))

    def open(self, request, timeout):
        self.requests.append(request)
        name = request.full_url.rsplit('/', 1)[1]
        if not request.has_header('Authorization'):
            return Response(401, {**self.headers, 'WWW-Authenticate': 'Basic realm="test"'})
        if name == '.htaccess': return Response(403, {})
        return Response(200, self.headers, (self.bundle / name).read_bytes())

    def test_parity_and_credentials_only_on_fixed_origin(self):
        result = http.verify(self.bundle, 'test-user', 'test-password', self)
        self.assertTrue(result['passed'])
        self.assertEqual(len(result['checks']), 7)
        self.assertTrue(all(r.full_url.startswith(http.ORIGIN + 'crm-' + 'a' * 40 + '/') for r in self.requests))
        self.assertTrue(all(r.get_method() == 'GET' for r in self.requests))
        self.assertNotIn('test-password', json.dumps(result))

    def test_untrusted_manifest_rejected_before_network(self):
        for field, value in [('source_sha', '../other'), ('files', {'https://outside.invalid': 'a' * 64})]:
            with self.subTest(field=field):
                with patch.dict(self.manifest, {field: value}):
                    self.save_manifest()
                    with self.assertRaises(ValueError): http.verify(self.bundle, 'u', 'p', self)
        self.assertEqual(self.requests, [])

    def test_changed_file_or_headers_fail(self):
        original = self.open
        def changed(request, timeout):
            response = original(request, timeout)
            if response.status == 200: response.body += b'changed'
            return response
        with patch.object(self, 'open', changed):
            with self.assertRaises(ValueError): http.verify(self.bundle, 'u', 'p', self)
        self.headers['Content-Security-Policy'] = "connect-src *; frame-ancestors 'none'"
        with self.assertRaises(ValueError): http.verify(self.bundle, 'u', 'p', self)

    def test_redirects_not_followed(self):
        self.assertIsNone(http.NoRedirect().redirect_request(None, None, 302, 'Found', {}, 'https://outside.invalid'))
        def redirect(request, timeout):
            raise urllib.error.HTTPError(request.full_url, 302, 'Found', {'Location': 'https://outside.invalid'}, None)
        with patch.object(self, 'open', redirect):
            with self.assertRaises(ValueError): http.verify(self.bundle, 'u', 'p', self)


if __name__ == '__main__': unittest.main()
