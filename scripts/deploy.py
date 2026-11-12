"""SFTP deployment with pinned host keys, immutable previews and verified backups."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import posixpath
import stat
import tempfile


def required(name):
    value = os.environ.get(name, '').strip()
    if not value:
        raise ValueError(f'Missing configuration: {name}')
    return value


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def exists(sftp, path):
    try:
        sftp.lstat(path)
        return True
    except OSError as error:
        if error.errno == 2:
            return False
        raise


def read(sftp, path):
    with sftp.open(path, 'rb') as handle:
        return handle.read()


def write(sftp, path, data):
    with sftp.open(path, 'wb') as handle:
        handle.write(data)
    if sha256(read(sftp, path)) != sha256(data):
        raise ValueError('Remote upload verification failed')


def mkdirs(sftp, path):
    parent = posixpath.dirname(path)
    if parent != path and not exists(sftp, parent):
        mkdirs(sftp, parent)
    if not exists(sftp, path):
        sftp.mkdir(path)
    if not stat.S_ISDIR(sftp.lstat(path).st_mode):
        raise ValueError('Expected a real directory, not a symlink')


def root(sftp, name):
    path = required(name)
    if not path.startswith('/') or '..' in PurePosixPath(path).parts or path == '/':
        raise ValueError(f'{name} must be a specific absolute directory')
    path = posixpath.normpath(path)
    if not stat.S_ISDIR(sftp.lstat(path).st_mode):
        raise ValueError(f'{name} must already exist and not be a symlink')
    return sftp.normalize(path)


def disjoint(*paths):
    for index, a in enumerate(paths):
        for b in paths[index + 1:]:
            if a == b or a.startswith(b + '/') or b.startswith(a + '/'):
                raise ValueError('Preview, production and backup directories must be separate')


def verify(sftp, directory, files):
    for rel, checksum in files.items():
        if sha256(read(sftp, directory + '/' + rel)) != checksum:
            raise ValueError(f'Remote checksum mismatch: {rel}')


def deploy(sftp, bundle, production=False, approval=''):
    manifest = json.loads((bundle / 'release.json').read_text())
    sha = manifest['source_sha']
    import re
    if not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('Invalid source SHA')
    for rel, checksum in manifest['files'].items():
        if rel.startswith('/') or '..' in PurePosixPath(rel).parts:
            raise ValueError('Unsafe bundle path')
        if sha256((bundle / rel).read_bytes()) != checksum:
            raise ValueError('Local bundle checksum mismatch')
    preview_root = root(sftp, 'PREVIEW_DIR')
    production_root = root(sftp, 'PRODUCTION_DIR')
    disjoint(preview_root, production_root)
    preview = preview_root + '/' + sha
    if not production:
        if manifest['mode'] != 'preview':
            raise ValueError('Expected preview bundle')
        if required('PREVIEW_PROTECTION_VERIFIED') != 'true':
            raise ValueError('Verify server-side preview password protection first')
        if exists(sftp, preview):
            old = json.loads(read(sftp, preview + '/release.json'))
            if old != manifest:
                raise ValueError('Immutable preview already exists with different content')
            verify(sftp, preview, manifest['files'])
            print('Identical verified preview already exists; no changes made')
            return
        temporary = preview_root + '/.upload-' + sha
        if exists(sftp, temporary):
            raise ValueError('Incomplete prior upload requires inspection before retry')
        mkdirs(sftp, temporary)
        for rel in list(manifest['files']) + ['release.json']:
            mkdirs(sftp, posixpath.dirname(temporary + '/' + rel))
            write(sftp, temporary + '/' + rel, (bundle / rel).read_bytes())
        sftp.rename(temporary, preview)
        verify(sftp, preview, manifest['files'])
        print('Preview uploaded and verified: ' + sha)
        return
    if manifest['mode'] != 'production' or required('LIVE_RELEASE_ENABLED') != 'true':
        raise ValueError('Production release is not enabled')
    if len(approval.strip()) < 12:
        raise ValueError('Record client approver, date and approval reference')
    reviewed = json.loads(read(sftp, preview + '/release.json'))
    if reviewed.get('mode') != 'preview' or reviewed.get('source_sha') != sha or reviewed.get('source_files') != manifest['source_files']:
        raise ValueError('Production source does not match the reviewed preview')
    verify(sftp, preview, reviewed['files'])
    backup_root = root(sftp, 'BACKUP_DIR')
    disjoint(preview_root, production_root, backup_root)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = backup_root + '/' + stamp + '-' + sha
    mkdirs(sftp, backup)
    files = sorted(manifest['files'], key=lambda x: (x == 'index.html', x)) + ['release.json']
    previous = {}
    # Snapshot every affected file before changing any live file.
    for rel in files:
        live = production_root + '/' + rel
        if exists(sftp, live):
            if not stat.S_ISREG(sftp.lstat(live).st_mode):
                raise ValueError('Refusing to overwrite a symlink or non-file')
            data = read(sftp, live)
            previous[rel] = sha256(data)
            mkdirs(sftp, posixpath.dirname(backup + '/' + rel))
            write(sftp, backup + '/' + rel, data)
        else:
            previous[rel] = None
    receipt = {'source_sha': sha, 'approval': approval, 'previous_files': previous,
               'actor': os.environ.get('GITHUB_ACTOR', 'local'),
               'run_id': os.environ.get('GITHUB_RUN_ID', 'local')}
    write(sftp, backup + '/deployment-receipt.json', json.dumps(receipt, indent=2).encode())
    print('Verified pre-release backup created: ' + backup)
    # Stage all bytes first. POSIX rename support is required for replacement.
    for rel in files:
        live = production_root + '/' + rel
        mkdirs(sftp, posixpath.dirname(live))
        write(sftp, live + '.pending-' + sha, (bundle / rel).read_bytes())
    changed = []
    try:
        for rel in files:
            live = production_root + '/' + rel
            # Include uncertain outcomes in recovery if the connection drops.
            changed.append(rel)
            sftp.posix_rename(live + '.pending-' + sha, live)
        verify(sftp, production_root, manifest['files'])
    except Exception:
        print('Release failed; attempting recovery from the verified backup')
        for rel in reversed(changed):
            live = production_root + '/' + rel
            if previous[rel] is not None:
                write(sftp, live + '.recovery-' + sha, read(sftp, backup + '/' + rel))
                sftp.posix_rename(live + '.recovery-' + sha, live)
            elif exists(sftp, live):
                mkdirs(sftp, posixpath.dirname(backup + '/new-files/' + rel))
                sftp.rename(live, backup + '/new-files/' + rel)
        raise
    print('Production files verified. Check public pages and CDN before closing the release.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--production', action='store_true')
    args = parser.parse_args()
    import paramiko
    with tempfile.TemporaryDirectory() as temp:
        known = Path(temp) / 'known_hosts'
        known.write_text(required('SFTP_KNOWN_HOSTS') + '\n')
        client = paramiko.SSHClient()
        client.load_host_keys(str(known))
        client.set_missing_host_key_policy(paramiko.RejectPolicy())
        options = {'hostname': required('SFTP_HOST'), 'port': int(os.getenv('SFTP_PORT', '22')),
                   'username': required('SFTP_USER'), 'allow_agent': False, 'look_for_keys': False,
                   'timeout': 30, 'auth_timeout': 30, 'banner_timeout': 30}
        key = os.getenv('SFTP_PRIVATE_KEY', '')
        if key:
            keyfile = Path(temp) / 'key'
            keyfile.write_text(key + '\n')
            keyfile.chmod(0o600)
            options['key_filename'] = str(keyfile)
        else:
            options['password'] = required('SFTP_PASSWORD')
        try:
            client.connect(**options)
            with client.open_sftp() as sftp:
                deploy(sftp, args.bundle, args.production, os.getenv('APPROVAL_REFERENCE', ''))
        finally:
            client.close()
