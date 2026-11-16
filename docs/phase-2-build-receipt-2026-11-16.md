# Phase 2A build receipt, 16 November 2026

## Scope

Implemented the buyer CRM described in `docs/release-2-buyer-crm.md`: private staff interface, six business entities, permission controls, atomic intake, follow-up workflow, sample/quotation records and audit metadata. Added an optional website adapter, disabled by default. See `crm/README.md` for full commissioning requirements and limits.

## Verification completed

- 15 Node checks passed: PostgreSQL transactions and RLS in disposable PGlite; API credential handling; interface loading, filtering, text escaping and sign-out cleanup.
- 20 Python/PHP checks passed with no skips: existing website checks, existing email handler tests and six additional CRM transport cases. PHP 8.2 CLI was extracted from the official Debian package into temporary scratch storage for local checks; no production server was changed.
- Both production and protected-preview website bundles build successfully, with 31 files each. The staff CRM and its test fixtures are excluded from both website bundles.
- Browser visual inspection of the desktop dashboard and enquiry detail completed. Synthetic sign-in, opening the detail view and saving a stage change were observed working. Test page explicitly states it contains synthetic data and has no live connection.
- Source format checks passed. Browser layout was inspected on desktop only; narrow-screen visual verification remains a commissioning item.

## Delivery state

Review branch: `feature/phase-2-buyer-crm`.

Stephen explicitly authorised publishing this CRM source to the existing public
`bienosie/staurus-foods` repository on 16 November 2026, replying "authorised" to
the source-publication approval request. This authorisation covers pushing the
review branch and opening its pull request. No database, staff account or live
CRM deployment has been created. The public website has not been changed by
this build.

## Next milestone

Push the authorised branch and run GitHub CI. Then commission a Staurus Foods-specific staging database and staff accounts, verify hosted Auth/PostgREST and end-to-end enquiry delivery, rehearse backup/restore and confirm privacy/retention arrangements. Use the existing website release safeguards for the optional adapter. Do not enable live capture based solely on isolated test results.
