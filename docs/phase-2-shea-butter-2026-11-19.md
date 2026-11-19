# Shea butter enquiry support, 19 November 2026

The owner identified that Shea butter was missing from the Buyer desk commodity dropdown. It was also absent from the database constraint and public website enquiry allowlist.

Added the exact commodity label `Shea butter` to the CRM dropdown, website enquiry form and PHP validation. Grade, refining/processing, intended use and buyer specifications remain free text in Requirements; no stock availability or certification claims are introduced.

The CLI-generated migration `supabase/migrations/20261119063327_add_shea_butter.sql` expands the existing commodity constraint while preserving all previously accepted values. Apply it after the original `crm/database/001_buyer_crm.sql`; do not replay the original schema on the managed project. The migration is transactional and uses a five-second lock timeout. No records, roles, grants or RLS policies are altered.

Validation: all 23 CRM tests and syntax checks pass. Tests include selecting the new option and recording/reading back a synthetic shea butter enquiry through the restricted staff RPC. All six static website checks pass. Fourteen PHP runtime/transport tests were skipped locally because PHP CLI is unavailable; the existing CI supplies that runtime and must pass before website release.

Deployment remains pending. The Supabase connector still lists only the property initiative's projects, so it cannot apply changes to the separate Staurus Foods project. The correct Supabase browser tab is present, but Edge reported that another extension interface blocks automation. No managed schema change, hosted CRM update, production website release or external message occurred in this step.

Resume by dismissing the blocking Edge extension panel, applying the new migration to `fpseihhfrkhpbmpahqgm`, verifying the managed constraint and a rolled-back synthetic staff intake, then deploying a new protected CRM bundle. Website source changes await the existing website release process and approval; keep real buyer capture disabled until commissioning is complete.
