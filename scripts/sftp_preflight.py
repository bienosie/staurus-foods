"""Staurus Foods read-only CloudNext SFTP preflight. No upload/write operations."""
import json, os, stat, tempfile
from pathlib import Path

def configured(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError("Missing required configuration: " + name)
    return value

def main():
    import paramiko
    host = configured("SFTP_HOST")
    user = configured("SFTP_USER")
    known_hosts = configured("SFTP_KNOWN_HOSTS")
    if os.environ.get("SFTP_PORT", "22") != "22":
        raise ValueError("Port must be 22")
    with tempfile.TemporaryDirectory() as temp:
        known = Path(temp) / "known_hosts"
        known.write_text(known_hosts + "\n")
        known.chmod(0o600)
        client = paramiko.SSHClient()
        client.load_host_keys(str(known))
        if not client.get_host_keys().lookup(host):
            raise ValueError("Host not independently pinned in known_hosts")
        client.set_missing_host_key_policy(paramiko.RejectPolicy())
        try:
            options = dict(hostname=host, username=user, port=22,
                allow_agent=False, look_for_keys=False, timeout=20, auth_timeout=20,
                banner_timeout=20)
            private_key = os.environ.get("SFTP_PRIVATE_KEY", "").strip()
            if private_key:
                keyfile = Path(temp) / "deploy_key"
                keyfile.write_text(private_key + "\n")
                keyfile.chmod(0o600)
                options["key_filename"] = str(keyfile)
            else:
                options["password"] = configured("SFTP_PASSWORD")
            client.connect(**options)
            with client.open_sftp() as sftp:
                path = os.environ.get("INSPECT_DIRECTORY", ".")
                if not path or "\x00" in path or ".." in path.split("/"):
                    raise ValueError("Invalid inspection directory")
                attrs = sftp.lstat(path)
                if not stat.S_ISDIR(attrs.st_mode):
                    raise ValueError("Target must be an existing real directory")
                items = []
                for item in sftp.listdir_iter(path):
                    kind = "directory" if stat.S_ISDIR(item.st_mode) else "file" if stat.S_ISREG(item.st_mode) else "other"
                    items.append({"name": item.filename, "type": kind})
                    if len(items) == 100:
                        break
                print("READ-ONLY PREFLIGHT PASSED")
                print(json.dumps({"directory": sftp.normalize(path), "entries": items, "metadata_only": True}, indent=2))
        finally:
            client.close()

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print("READ-ONLY PREFLIGHT FAILED: " + type(e).__name__)
        raise SystemExit(1)
