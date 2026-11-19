# Phase 2 managed staging receipt, 17 November 2026

## Target and cost

Stephen authorised a separate Staurus Foods account using info@staurusfoods.com after the existing property account reached its two-active-free-project limit. The original connector's $0 quote did not establish quota eligibility; its project-creation attempt failed and created nothing.

The owner completed account verification and the database-password/project-creation steps in the browser. The new target was observed healthy on the Free plan, Nano compute, in London (`eu-west-2`):

- Organisation: Staurus Foods, `bjqmqphegfctsmdvwqlv`.
- Project: `staurus-foods-crm-staging`, `fpseihhfrkhpbmpahqgm`.
- Dashboard: https://supabase.com/dashboard/project/fpseihhfrkhpbmpahqgm
- API origin: https://fpseihhfrkhpbmpahqgm.supabase.co

No paid plan, add-on, repository integration or additional branch was enabled. The dashboard's `main Production` label identifies the default Supabase branch; this project is designated for CRM staging and is not connected to the live website.

## Schema applied

The Table Editor showed no public tables before installation. The reviewed `crm/database/001_buyer_crm.sql` from source commit `1a705ff2e348259afc8ea165e937734b20e6bf86` was applied through the project's SQL Editor and returned success.

Source SQL SHA-256: `fadf8fb61e47b5e2fb11f596007da73eea2f85fec5341622f197fd0e2cdf2b1e`.

This was a manual SQL application, not a Supabase CLI/MCP migration-history entry. Do not apply the non-idempotent schema again. No buyers or staff memberships were seeded.

## Hosted checks observed

| Check | Result |
| --- | --- |
| Six CRM tables present, each with row-level security | Passed |
| Anonymous SELECT/INSERT/UPDATE/DELETE table privileges | All absent |
| Authenticated staff DELETE privileges | All absent |
| Private-schema access for anonymous/authenticated roles | Both absent |
| Anonymous execution of intake and progress functions | Both absent |
| Direct authenticated contact/enquiry writes | Absent |
| CRM policies | 16 |
| Enquiries and staff memberships | 0 and 0 |
| Anonymous SQL-role reads of all six tables and intake call | Rejected with insufficient privilege |
| Authenticated non-member SQL role | No staff role, no rows, intake/progress rejected |

The role checks ran in transactions that were rolled back, with a synthetic non-member claim and no saved test records. They exercise the hosted database's permission checks, but do not prove genuine Auth login, JWT verification or HTTP/PostgREST behaviour. Those remain separate commissioning checks.

## Authentication and advisor hardening

Project creation used explicit table grants: automatic exposure of new tables was disabled, automatic RLS enabled and the Data API enabled. Public application sign-ups were subsequently disabled. Anonymous sign-ins and manual identity linking were already disabled; email confirmation remained enabled.

Supabase's generated `public.rls_auto_enable()` event-trigger helper had unnecessary client execution privileges. Applied this platform-specific hardening without modifying its implementation or disabling the event trigger:

```sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Subsequent SQL checks returned false for both client-role execute privileges. The rerun Security Advisor reported **0 errors and 3 warnings**, down from 5 warnings. The remaining warnings identify the intentionally callable `SECURITY DEFINER` functions `sf_access_role`, `sf_create_enquiry` and `sf_progress_enquiry`. They use fixed empty search paths and internal staff checks; the hosted non-member denial checks passed. Retain these findings for review alongside genuine staff/login tests, rather than treating the advisor as entirely clear.

Advisor: https://supabase.com/dashboard/project/fpseihhfrkhpbmpahqgm/advisors/security
Reference: https://supabase.com/docs/guides/observability/advisors

## Remaining work

The connected Supabase app still lists only the original property account. Browser access was used for this separate account; do not target the property projects for CRM changes.

Next: provision the owner's application login securely, explicitly assign CRM membership, complete managed editor/viewer/non-member Auth and HTTP checks, configure and deploy the protected staging bundle, test website-to-CRM/email delivery with authorised synthetic data, and rehearse backup/restore and rollback. Public signup being disabled means staff must be provisioned administratively.

No CRM web deployment, live enquiry capture, staff invitation, buyer email, production release or paid upgrade was performed in this stage. The existing 47 isolated/CI checks are recorded separately and are not counted as new managed-service tests.

## Owner access and public HTTP checks

The owner subsequently created the application Auth user for info@staurusfoods.com and explicitly confirmed this was to be the CRM administrator account. The account was checked for the observed UUID and a verified email before adding its membership. Readback confirmed `role=admin`, `active=true`, `email_confirmed=true`. The user's password was neither requested in chat nor read by the agent. This application login is separate from the Supabase platform account and the database password.

Using only the project's public publishable key, actual HTTPS requests to each of the six `/rest/v1/sf_*` table endpoints returned **401 / PostgreSQL code 42501**. All six anonymous read-denial checks passed. The real `/auth/v1/settings` response also confirmed `disable_signup=true` and anonymous sign-ins disabled. These are managed HTTP checks, not locally simulated responses. They do not yet verify authenticated administrator login or viewer/editor separation.

Built the protected CRM bundle from clean source commit `3be1475d4745c9ecbbbb0bbc24cbb4f4d344f2de`, with seven hashed application/control files plus the release manifest. Configuration contains only the dedicated staging origin and its public publishable key. Its Basic-auth file path is the previously verified `/home/sites/10b/f/ffe8ba666a/private-auth/.htpasswd.txt`; that file and protection still require current host verification before upload.

Deployment paused because Edge reported that another extension UI was open on the CloudNext tab and blocked automation. No CloudNext file was uploaded or changed. Dismiss that panel before resuming host inspection. Retain the existing website and immutable previews, select a separate CRM staging destination, verify authentication and headers, then perform genuine staff sign-in and managed role tests.
