# Release 1 public launch handoff — 13 November 2026

**Owner instruction:** Publish the Staurus Foods website to https://staurusfoods.com. The prior preview was approved visually, and the official buyer mailbox was confirmed operational. The current public-ready source incorporates SEO and legal-copy changes, so only a **matching fresh protected preview** can be used as the release fingerprint.

## Verified source preparation
- 12 HTML pages have been edited to remove draft noindex and `approval-preview` metadata and temporary footer copy.
- `site/robots.txt` now allows crawling and advertises `https://staurusfoods.com/sitemap.xml`.
- `site/sitemap.xml` contains the 12 canonical production URLs.
- `site/assets/main.js` prepares enquiries to `info@staurusfoods.com` using `mailto:`. This is **not** an automatic server submission. The user must send the email.
- The privacy and website terms pages have substantive public copy. Legal professional review is advisable; no unverified certifications, price guarantees or trading claims are added.
- `tests/test_site.py` now tests the indexable source; `scripts/build.py --preview` adds noindex, form-disabling controls and a restrictive preview `robots.txt` separately.
- The existing source SHA pinned to the former protected preview `a5b330e...` is obsolete for release. Do **not** use it.

## Deploy correctly without bypassing safeguards
1. Inspect the latest **Validate Staurus Foods static site** result on `main`. Must be green for final head.
2. Confirm the **Staurus Foods preview** workflow on `main` has built the latest source SHA and uploaded the immutable preview `https://preview.staurusfoods.com/<full-new-SHA>/`. If it did not auto-run, ensure `PREVIEW_ENABLED=true` and manually dispatch the existing preview workflow.
3. Verify fresh preview authenticated 200 HTML, all images/nav, and unauthenticated 401. Check that draft-only preview banner and noindex are active on preview. Verify form cannot transmit from preview.
4. Record the exact **full 40-character SHA** of the successful, reviewed preview and the owner approval: owner authorised launch in the Staurus Foods conversation on 13 November 2026. The release workflow requires both `reviewed_sha` and `approval_reference`.
5. Before enabling any live release, confirm `BACKUP_DIR` is the private path, `PREVIEW_DIR` and `PRODUCTION_DIR` are separate and all required SFTP secrets configured. Do not reuse unrelated hosting account paths or credentials.
6. Set GitHub `LIVE_RELEASE_ENABLED=true` only for the authorised release window, then dispatch `.github/workflows/release.yml` on `main` with the reviewed SHA and truthful approval reference. The release script verifies source parity with the preview, backs up affected existing live files, stages and verifies uploads and attempts rollback on failure.
7. Verify public `https://staurusfoods.com/` and representative pages return 200, canonical apex HTTPS, image links, `robots.txt` allows crawling and sitemap responds with XML. Test company mailbox and end-to-end buyer email drafting/sending. Restore `LIVE_RELEASE_ENABLED=false` after release.
8. Only after live 200 verification, verify property ownership and submit sitemap in Google Search Console and Bing Webmaster Tools. IndexNow notifications can then be configured; these services do not guarantee indexing.

## Stop conditions
- Source or CI red, fresh preview missing or unpublished.
- Private paths or backup not verified.
- `SFTP_KNOWN_HOSTS` mismatch, auth failure or remote write restrictions.
- Any attempt to rely on former SHA a5b330e.
- Inability to record actual release approval and final preview review.
- Server-side 403/404 after upload or missing indexable pages.

No secrets, private keys or access tokens in this document.
