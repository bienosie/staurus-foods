# Shea butter enquiry support, 19 November 2026

The owner identified that Shea butter was missing from the Buyer desk commodity dropdown. It was also absent from the database constraint and public website enquiry allowlist.

Added the exact commodity label `Shea butter` to the CRM dropdown, website enquiry form and PHP validation. Grade, refining/processing, intended use and buyer specifications remain free text in Requirements; no stock availability or certification claims are introduced.

The CLI-generated migration `supabase/migrations/20261119063327_add_shea_butter.sql` expands the existing commodity constraint while preserving all previously accepted values. Apply it after the original `crm/database/001_buyer_crm.sql`; do not replay the original schema on the managed project. The migration is transactional and uses a five-second lock timeout. No records, roles, grants or RLS policies are altered.

Validation: all 23 CRM tests and syntax checks pass. Tests include selecting the new option and recording/reading back a synthetic shea butter enquiry through the restricted staff RPC. All six static website checks pass. Fourteen PHP runtime/transport tests were skipped locally because PHP CLI is unavailable; the existing CI supplies that runtime and must pass before website release.

## Deployed and verified

The owner cleared the browser blocker. Applied the migration through the SQL Editor of the separate Staurus Foods staging project `fpseihhfrkhpbmpahqgm`. The original constraint was inspected first, and the final constraint was read back with Shea butter included. This was a manual SQL application, not a migration-history entry.

Verified the hosted RPCs under the authenticated database role and the existing administrator's claim inside a rolled-back transaction: shea butter intake, staff readback, idempotent retry, status progression and rejection of a stale version all passed. This is a database-role simulation, not a browser or Auth token test. Follow-up queries confirmed row-level security remains enabled and zero test contacts or intake requests remained. An initial rehearsal failed to parse because the SQL editor retained part of the preceding text; it was replaced using select-all and paste and exact clipboard comparison before the successful run. The failed rehearsal did not save test data.

GitHub Phase 2 buyer CRM checks #16 passed for source `7c8635486ca85df1c0cecdc30d820cbb6770f99a`: https://github.com/bienosie/staurus-foods/actions/runs/44473257827 . This covers the PHP and PostgreSQL HTTP checks unavailable in the local runtime.

Installed a new protected CRM bundle at:

https://preview.staurusfoods.com/crm-7c8635486ca85df1c0cecdc30d820cbb6770f99a/

Installed `.htaccess` first and confirmed authentication before the other files; installed `index.html` last. All eight editor buffers matched the built bundle, the final listing confirmed all files, and the saved `app.js` was reopened and compared in full. All eight anonymous HTTP access and security-header checks passed. Evidence: `docs/evidence/crm-shea-butter-access-2026-11-19.json`. Screenshot: `docs/evidence/crm-shea-butter-database-2026-11-19.jpg`.

The previous preview releases remain unchanged. Owner browser verification of the new dropdown is still pending; the connected browser does not expose the working InPrivate session. The public website changes remain prepared in the branch and await the website release process. No production website publication, outbound message or live CRM capture activation occurred. Broader Phase 2 commissioning remains incomplete.
