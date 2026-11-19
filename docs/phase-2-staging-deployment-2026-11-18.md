# CRM protected staging deployment, 18 November 2026

## Deployed target

- URL: https://preview.staurusfoods.com/crm-3be1475d4745c9ecbbbb0bbc24cbb4f4d344f2de/
- Host folder: `/home/sites/10b/f/ffe8ba666a/preview-site/crm-3be1475d4745c9ecbbbb0bbc24cbb4f4d344f2de/`.
- Application bundle source: `3be1475d4745c9ecbbbb0bbc24cbb4f4d344f2de`.
- Supabase staging project: `fpseihhfrkhpbmpahqgm`, London, Free plan.

The CloudNext browser blocker was cleared. Before deployment, the private authentication file `.htpasswd.txt` was confirmed present (76 bytes) in `private-auth`; its contents were not read or changed. The existing preview-root `.htaccess` was inspected and retained. The release folder was newly created and was empty before installation. Existing website previews and production files were not edited.

Installed `.htaccess` first and verified its HTTP 401 challenge and headers before installing application files. Then installed `api.js`, `app.js`, `styles.css`, `config.js`, `robots.txt`, `release.json` and finally `index.html` through the hosting file editor. Each editor buffer was compared exactly against its local bundle content before saving. The final file-manager listing confirmed all eight files. This is editor/save verification; authenticated HTTP checksum parity is still pending.

The bundle uses only the staging project URL and public publishable key. It contains no server secret, database password, staff password, test fixture, PHP handler or database migration.

## HTTP protection verified

Anonymous requests to the folder, `index.html`, `api.js`, `app.js`, `styles.css`, `config.js`, `robots.txt` and `release.json` all returned **401** with Basic authentication required. All eight responses also passed:

- `Cache-Control: no-store`.
- `X-Robots-Tag: noindex, nofollow, noarchive`.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- CSP connections restricted to `https://fpseihhfrkhpbmpahqgm.supabase.co`.

A request with deliberately invalid Basic credentials also returned 401. Requests refused redirects. Detailed results are in `docs/evidence/crm-staging-access-2026-11-18.json`.

## Sign-in handoff and remaining checks

The preview browser currently receives the expected Unauthorized response. The owner must authenticate with the existing website-preview credentials, then sign in to the Buyer desk with the separate CRM credentials for info@staurusfoods.com. No password needs to be shared in chat. The CRM membership was already verified as active administrator in the preceding managed-staging receipt.

After sign-in, verify authenticated file delivery, actual Supabase login, dashboard reads, synthetic intake and progress, duplicate retries, stale-write protection, viewer/editor/non-member separation, mobile layout and audit records. Backup/restore, rollback and authorised website-to-CRM-and-inbox delivery checks remain outstanding. Do not describe this stage as fully commissioned or enable real buyer capture on this evidence alone.

No paid resource, staff invitation, buyer message, production website release or live CRM relay activation occurred during this deployment.
