# Shea butter website publication, 19 November 2026

Published the owner's authorised shea butter enquiry update to https://staurusfoods.com/enquire.html . Source: `27600b6806d027927a7a3deea6c9807f4a04292a`, merged through PR #3. Scope: public commodity dropdown, PHP allowlist and runtime test. Existing inbox delivery is preserved. This release does not activate the Phase 2 CRM relay or publish the staff interface.

## Release evidence

- [Validation CI #116](https://github.com/bienosie/staurus-foods/actions/runs/44479889100): passed, including PHP runtime tests.
- [Pinned preview #14](https://github.com/bienosie/staurus-foods/actions/runs/44480101987): passed. All 16 pages, authenticated HTTP checksums, protected paths and disabled preview submissions verified. All 32 desktop/mobile page checks passed; enquiry screenshots at both sizes were visually reviewed.
- [Production release #6](https://github.com/bienosie/staurus-foods/actions/runs/44483638328): passed. Job `135421654160` verified the reviewed source, pre-release backup and production file hashes. Completion logged at 08:03 UTC.
- Verified backup: `/home/sites/10b/f/ffe8ba666a/private-backups/20261119T075841381433Z-27600b6806d027927a7a3deea6c9807f4a04292a`.
- `LIVE_RELEASE_ENABLED=false` was saved and confirmed after deployment. `PREVIEW_ENABLED` and `PREVIEW_PROTECTION_VERIFIED` remain true.
- Live browser selection of Shea butter verified. A normal reload was needed to replace the browser's cached previous form. Screenshot: `evidence/shea-live-form-2026-11-19.jpg`. No live enquiry was submitted.
- Independent public HTTP verification passed for all 30 manifest entries: 29 static files matched their exact hashes, and the PHP endpoint rejected GET with 405. All 16 pages have their intended production canonical URLs, valid internal targets and no noindex controls. Public and CRM previews still require authentication; private paths remain hidden. Evidence: `evidence/shea-production-http-2026-11-19.json`. The first scan incorrectly expected an index.html canonical for the homepage; the checker was corrected to the existing root canonical and the complete scan then passed.

## Phase 2 continuation

Authenticated CRM HTTP file parity passed separately in [CRM checks #20](https://github.com/bienosie/staurus-foods/actions/runs/44480630174). Seven readable files exactly match the rebuilt deployed bundle; anonymous access is rejected and security headers are present. The owner has confirmed login and the Shea butter dropdown.

The broader CRM remains in protected staging. Managed Auth role separation, authenticated buyer write/readback, backup restoration and end-to-end inbox commissioning are still required before live capture. The source and evidence remain in draft PR #2.
