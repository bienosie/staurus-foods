"""Read-only checksum and access checks for the fixed CloudNext CRM origin."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.request

ORIGIN = 'https://preview.staurusfoods.com/'
FILES = {'index.html', 'app.js', 'api.js', 'styles.css', 'config.js', 'robots.txt', '.htaccess'}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def read_bundle(bundle):
    manifest = json.loads((bundle / 'release.json').read_text())
    sha = manifest.get('source_sha', '')
    if manifest.get('mode') != 'crm-staging' or not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('Invalid staging manifest')
    if set(manifest.get('files', {})) != FILES:
        raise ValueError('Unexpected staging files')
    for name, checksum in manifest['files'].items():
        if hashlib.sha256((bundle / name).read_bytes()).hexdigest() != checksum:
            raise ValueError('Local bundle checksum mismatch')
    return manifest


def verify(bundle, username, password, opener=None):
    manifest = read_bundle(bundle)
    if not username or not password or ':' in username:
        raise ValueError('Preview credentials required')
    base = ORIGIN + 'crm-' + manifest['source_sha'] + '/'
    opener = opener or urllib.request.build_opener(NoRedirect)
    token = base64.b64encode((username + ':' + password).encode()).decode()
    checks = []

    def get(name, auth=False):
        # Paths come only from the exact allowlist, never from hosted content.
        headers = {'Cache-Control': 'no-cache', 'User-Agent': 'StaurusFoods-CRM-Verification/1.0'}
        if auth:
            headers['Authorization'] = 'Basic ' + token
        try:
            with opener.open(urllib.request.Request(base + name, headers=headers), timeout=30) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, b''

    def security(headers):
        csp = headers.get('Content-Security-Policy', '')
        directives = dict((part.strip().split(' ', 1) + [''])[:2] for part in csp.split(';') if part.strip())
        if not ('no-store' in headers.get('Cache-Control', '')
                and 'noindex' in headers.get('X-Robots-Tag', '')
                and headers.get('X-Content-Type-Options') == 'nosniff'
                and headers.get('X-Frame-Options') == 'DENY'
                and headers.get('Referrer-Policy') == 'no-referrer'
                and directives.get('connect-src') == 'https://fpseihhfrkhpbmpahqgm.supabase.co'
                and directives.get('frame-ancestors') == "'none'"):
            raise ValueError('Staging security headers differ')

    for name in sorted(FILES - {'.htaccess'}) + ['release.json']:
        status, headers, _ = get(name)
        if status != 401 or not headers.get('WWW-Authenticate', '').startswith('Basic'):
            raise ValueError('Anonymous staging access was not rejected')
        security(headers)
        status, headers, body = get(name, True)
        if status != 200:
            raise ValueError('Authenticated staging access failed')
        security(headers)
        expected = (bundle / name).read_bytes()
        if body != expected:
            raise ValueError('Hosted staging bytes differ: ' + name)
        checks.append({'file': name, 'anonymous': 401, 'authenticated': 200, 'checksum': 'passed'})
    status, _, _ = get('.htaccess', True)
    if status not in {403, 404}:
        raise ValueError('Apache configuration exposed')
    return {'source_sha': manifest['source_sha'], 'base_url': base, 'passed': True,
            'checks': checks, 'apache_config_hidden': True,
            'not_tested': ['Supabase Auth', 'buyer writes', 'inbox delivery', 'backup restore']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', required=True, type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.bundle, os.environ.get('PREVIEW_HTTP_USER', 'staurus-preview'),
                                os.environ.get('PREVIEW_HTTP_PASSWORD', '')), indent=2))
    except Exception:
        # Never emit request objects, headers, credentials or hosted response bodies.
        raise SystemExit('CRM HTTP verification failed. Check staging access, headers and bundle parity.')
