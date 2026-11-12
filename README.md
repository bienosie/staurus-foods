# Staurus Foods Limited — Website

Corporate website source for **staurusfoods.com**.

Production hosting: **CloudNext**, deployed over **SFTP port 22** after a verified backup and explicit approval. This repository is separate from Surviving the Wait and other Staurus websites.

## Deployment status

- Source package: Staurus Foods website approval v2, pending upload into `site/` and review.
- Production: **disabled**. No CloudNext credentials or remote directory paths stored in Git.
- Preview: **disabled** until an isolated, server-side protected preview root is verified.
- Buyer enquiry form: must not be represented as operational until delivery and anti-spam are tested.
- Search indexing: remains blocked in the supplied approval draft until production go-live.

## Controls

Run the manual **SFTP preflight** first. The discovery step retrieves *unverified* public SSH host keys; compare fingerprints against a separately trusted CloudNext source before setting `SFTP_KNOWN_HOSTS`. The inspect operation is read-only and uses separate Staurus Foods credentials.

GitHub secrets to configure: `SFTP_HOST`, `SFTP_USER`, `SFTP_PASSWORD` (or a private key after tooling is updated), `SFTP_KNOWN_HOSTS`.

GitHub variables: `SFTP_PORT=22`, `PREVIEW_DIR`, `PRODUCTION_DIR`, `BACKUP_DIR`, `PREVIEW_BASE_URL`, `PREVIEW_ENABLED=false`, `LIVE_RELEASE_ENABLED=false`.

**Never reuse Surviving the Wait credentials, GitHub secrets or web directory.**
