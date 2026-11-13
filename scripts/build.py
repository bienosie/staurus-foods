"""Build a reproducible static bundle; preview controls never enter production."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil


def digest(data):
    return hashlib.sha256(data).hexdigest()


def validate(source):
    files = sorted(p for p in source.rglob('*') if p.is_file() and p.name != 'README.md')
    if any(p.is_symlink() for p in source.rglob('*')):
        raise ValueError('Symlinks are not permitted in the site bundle')
    for page in ('index.html', 'commodities.html', 'enquire.html', 'about.html', 'quality.html', 'trade-fairs.html', 'privacy.html', 'terms.html', 'raw-cashew-nuts.html', 'cocoa-beans.html', 'sesame-seeds.html', 'soya-beans.html'):
        text = (source / page).read_text()
        for name in re.findall(r"(?:href|src)=[\"']([^\"']+)[\"']", text):
            if name.startswith(('#', 'https:', 'http:', 'mailto:', 'data:', '${')):
                continue
            target = name.split('#')[0].split('?')[0]
            if target and not (source / target).is_file():
                raise ValueError(f'{page}: missing local asset {target}')
    for path in files:
        if path.suffix not in {'.html', '.css', '.js', '.pdf', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.txt', '.xml'}:
            raise ValueError(f'Unexpected deployable file: {path}')
        if path.suffix == '.pdf' and not path.read_bytes().startswith(b'%PDF-'):
            raise ValueError(f'Invalid PDF: {path.name}')
    return files


def build(source, output, sha, preview=False):
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('A full 40-character source commit SHA is required')
    files = validate(source)
    if not preview:
        index = (source / 'index.html').read_text().lower()
        robots = (source / 'robots.txt').read_text().lower()
        if 'noindex' in index or 'disallow: /' in robots:
            raise ValueError('Production blocked: remove draft noindex/robots restrictions only after final approval')
        js = source / 'assets' / 'main.js'
        if js.exists() and 'REPLACE_WITH_VERIFIED_COMPANY_EMAIL' in js.read_text():
            raise ValueError('Production blocked: buyer form receiver is not configured')
    if output.exists():
        raise ValueError('Output directory must be new')
    output.mkdir(parents=True)
    source_hashes = {}
    for path in files:
        rel = path.relative_to(source).as_posix()
        data = path.read_bytes()
        source_hashes[rel] = digest(data)
        target = output / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        if preview and path.suffix == '.html':
            text = data.decode('utf-8')
            controls = '''<meta name="robots" content="noindex,nofollow,noarchive">
<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'">
<script>
document.addEventListener('submit', function(e) {
  e.preventDefault(); e.stopImmediatePropagation();
  alert('Preview only. No enquiry or subscription has been sent.');
}, true);
</script>'''
            text = text.replace('<head>', '<head>\n' + controls, 1)
            banner = f'''<aside style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff3cc;color:#222;padding:10px 16px;font:14px/1.4 sans-serif;text-align:center">Client preview {sha[:12]}. Forms are disabled. Quote this version when approving.</aside>'''
            text = text.replace('</body>', banner + '\n</body>')
            target.write_text(text)
    if preview:
        (output / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
    manifest = {'source_sha': sha, 'mode': 'preview' if preview else 'production',
                'source_files': source_hashes,
                'files': {p.relative_to(output).as_posix(): digest(p.read_bytes())
                          for p in sorted(output.rglob('*')) if p.is_file()}}
    (output / 'release.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=Path('site'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    manifest = build(args.source, args.output, args.sha, args.preview)
    print(f"Validated and built {len(manifest['source_files'])} source files ({manifest['mode']})")
