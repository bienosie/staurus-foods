# Staurus Foods Limited — Website

Buyer-facing website for **staurusfoods.com**. Production remains on **CloudNext/20i StackCP**, with GitHub Actions deployment over SFTP port 22 only after independent verification, client approval and pre-release backup.

## CloudNext confirmation received 12 November 2026

CloudNext support explicitly confirmed:
- Host for this account: `ssh.gb.stackcp.com` (reported in the hosting handback)
- **RSA 2048 SSH host-key SHA256 fingerprint:** `SHA256:hKxyk+232nxSLX/gRKox2f3tvTvDOHAu/BMcGMG9cNc`
- Production document root: `/home/sites/10b/f/ffe8ba666a/public_html`
- Preview directory `/home/sites/10b/f/ffe8ba666a/preview-site/`: provider confirms it is accessible in principle, but login/path traversal not yet demonstrated
- POSIX rename: provider believes supported; **not tested**

Note: fingerprint verification is **not** the same as a valid OpenSSH `known_hosts` entry. Obtain public host-key bytes from `ssh-keyscan`, calculate fingerprint, compare **RSA key** fingerprint exactly to CloudNext's confirmed value, and only then configure `SFTP_KNOWN_HOSTS`. Do not trust an unmatched Ed25519 key solely because the RSA fingerprint matched.

## Preview and backup handback

- Preview URL: `https://preview.staurusfoods.com`
- Preview path: `/home/sites/10b/f/ffe8ba666a/preview-site`
- Private backups: `/home/sites/10b/f/ffe8ba666a/private-backups`
- Private authentication files: `/home/sites/10b/f/ffe8ba666a/private-auth`
- Webspace snapshot reported completed: **12 Nov 2026, 16:25:39** in StackCP Timeline Backups
- Database snapshot completion: **not confirmed**
- Preview unauthenticated URLs return HTTP 401, including PDF and robots.txt; authenticated access **not yet verified**, so `PREVIEW_PROTECTION_VERIFIED=false`
- Production was reported untouched (HTTP 403) and no deployment had run

## Workflow status

- Read-only SFTP preflight supports `SFTP_PRIVATE_KEY` or `SFTP_PASSWORD`.
- Preview and production deployment scripts adapted from the separately owned Surviving the Wait project; do not copy credentials, keys, directory paths or secrets.
- Website source approval package v2 remains **not committed to `site/`**.
- Buyer enquiry form must be independently confirmed operational before production.
- Draft noindex and unconfigured buyer form prevent the production build from passing.

## GitHub environment/secret setup

Environments reported created: `preview`, `production`; all deployment switches remain disabled.

Secrets to configure securely: `SFTP_HOST`, `SFTP_USER`, `SFTP_KNOWN_HOSTS`, and **`SFTP_PRIVATE_KEY`** or `SFTP_PASSWORD` if supported by the hosting security policy.

Repository variables reported configured:
- `SFTP_PORT=22`
- `PREVIEW_DIR=/home/sites/10b/f/ffe8ba666a/preview-site`
- `PRODUCTION_DIR=/home/sites/10b/f/ffe8ba666a/public_html`
- `BACKUP_DIR=/home/sites/10b/f/ffe8ba666a/private-backups`
- `PREVIEW_BASE_URL=https://preview.staurusfoods.com`
- `PREVIEW_PROTECTION_VERIFIED=false`
- `PREVIEW_ENABLED=false`
- `LIVE_RELEASE_ENABLED=false`

## Gates before deployment

1. Set up the preview password file and verify authentication succeeds as well as unauthenticated 401s.
2. Configure separate Staurus Foods SFTP credentials/SSH key securely (no secret material in Git).
3. Match the scanned RSA key fingerprint to CloudNext's independently provided fingerprint and pin the public key.
4. Run **read-only SFTP preflight**, verify path visibility; subsequently test POSIX rename using disposable files outside production.
5. Upload site source and actual assets to the repository and pass CI/SEO/form checks.
6. Enable preview only after protection verified; receive approval against the full SHA.
7. Keep production disabled until a reviewed release, completed backup and approval.

**Do not deploy the production website or enable either switch merely because CloudNext supplied the fingerprint.**
