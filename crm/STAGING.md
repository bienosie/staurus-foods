# Phase 2B: staging preparation and API verification

This stage prepares a protected CRM bundle and tests the application against a real, disposable PostgreSQL/PostgREST pair. It does not provision or activate managed Supabase, create real staff accounts, or send enquiry email.

## Integration checks

The `postgres-http` CI job runs PostgreSQL 17 and PostgREST v16.6 with synthetic identities. It checks anonymous and forged-token rejection, simultaneous duplicate submissions, the dashboard's nested organisation/contact query, outsider/viewer restrictions, stage changes and stale writes, sample/quote readback, audit records and staff revocation.

No workflow secret is required. Both services exist only within that job. The harness refuses non-loopback database hosts and any database name other than `sf_crm_test`. The signing key and database credentials are disposable fixtures. The synthetic Auth functions and locally signed JWTs do **not** verify managed Supabase Auth, real staff login, CloudNext delivery or backup restoration.

## Protected staging package

Supply these process environment values from private configuration:

| Variable | Purpose |
| --- | --- |
| `SF_CRM_URL` | Exact selected project's HTTPS Supabase origin |
| `SF_CRM_PUBLISHABLE_KEY` | Public publishable key or legacy anon JWT, never a privileged secret |
| `SF_CRM_AUTH_FILE` | Absolute existing password-file path under the host's private-auth directory, outside web roots |

Run `npm run build:staging` from `crm/` using a clean checkout. It produces `dist/crm-staging-<full-source-sha>/` and refuses overwrites. It includes only four application files, generated public configuration, `.htaccess`, robots.txt and a checksum manifest. Migrations, development servers, fixtures, dependencies and administrative scripts are excluded.

Apache controls require HTTP authentication, disable indexing/caching, and restrict API connections to the selected Supabase origin. Missing header-module support fails visibly. Before upload, independently verify the private authentication file and a distinct staging destination. Afterwards verify anonymous rejection for the page, configuration, all assets and manifest, then authenticated access and security headers. Generated `.htaccess` is not evidence the host honours it.

Do not copy this bundle over the public website. Use a separate staging directory with a verified target. Website workflows still package only `site/`.

## Read-only hosted checks

`npm run verify:hosted` checks actual Auth responses and database reads after managed staging is ready. It requires:

- `SF_CRM_ENVIRONMENT=staging`.
- `SF_CRM_EXPECTED_PROJECT_REF` matching `SF_CRM_URL` exactly.
- `SF_CRM_PUBLISHABLE_KEY`.
- Distinct current user tokens: `SF_CRM_EDITOR_TOKEN`, `SF_CRM_VIEWER_TOKEN`, `SF_CRM_OUTSIDER_TOKEN`.

Use authenticated-user access tokens from that project, supplied securely as process environment values. Never paste them into chat, shell arguments, Git or reports. No service-role key is needed. The verifier checks each user with Auth, expected membership and all six table read contracts. Staff reads use `limit=0`; outsider reads must return no rows. Reports contain check results, not buyer data or tokens. Redirects are refused.

Only reads and the stable read-only `sf_access_role` RPC are called. There are no invitations, permission changes, buyer writes or messages. Invalid inputs, failed checks or network errors produce a non-zero exit. Reports identify operations not tested.

## Remaining dependency and commissioning

Managed staging was provisioned on 17 November 2026 in the separate Staurus Foods account. The schema is already applied. See [the managed staging receipt](../docs/phase-2-managed-staging-receipt-2026-11-17.md) for the exact target, source hash, hosted permission checks and remaining work. Do not rerun the non-idempotent initial schema or assume the connected Supabase app has switched from the property account.

Next arrange staff access through a supported secure flow, deploy the protected bundle and record managed Auth/HTTP checks. An authorised synthetic website-to-database-and-inbox test, backup/restore rehearsal and rollback checks are still required before live activation.

Technical references checked 17 November 2026:
- https://docs.postgrest.org/en/stable/references/configuration.html
- https://docs.postgrest.org/en/stable/references/errors.html
- https://github.com/PostgREST/postgrest/releases/tag/v16.6
- https://supabase.com/docs/reference/javascript/auth-getuser
