# Release 1 public launch handoff — 13 November 2026

**Owner instruction:** Publish the Staurus Foods website to https://staurusfoods.com. The prior preview was approved visually, and the official buyer mailbox was confirmed operational. The current public-ready source incorporates SEO and legal-copy changes, so only a **matching fresh protected preview** can be used as the release fingerprint.

## Verified source preparation
- 13 HTML pages have been edited to remove draft noindex and `approval-preview` metadata and temporary footer copy.
- `site/robots.txt` now allows crawling and advertises `https://staurusfoods.com/sitemap.xml`.
- `site/sitemap.xml` contains the 12 canonical production URLs.
- `site/assets/main.js` prepares enquiries to `info@staurusfoods.com` using `mailto:`. This is **not** an automatic server submission. The user must send the email.
- The privacy and website terms pages have substantive public copy. Legal professional review is advisable; no unverified certifications, price guarantees or trading claims are added.
- `tests/test_site.py` now tests the indexable source; `scripts/build.py --preview` adds noindex, form-disabling controls and a restrictive preview `robots.txt` separately.
- The existing source SHA pinned to the former protected preview `a5b330e...` is obsolete for release. Do **not** use it.
- **14 November 2026 change:** Dried hibiscus flowers (zobo/roselle) are now a priority initial commodity. The site has a dedicated `hibiscus-flowers.html` page, an original botanical illustration, homepage and commodities placement, enquiry form selection and a 13-URL sitemap. This changes the approved source. **Do not deploy or approve candidate `89a60834c0e8dc2261e6cd85343ffd8f36c22b4c` as the final version.** Obtain a fresh successful preview built from the latest head including hibiscus and record its new full SHA. If a release workflow is in progress, stop until the new version is approved.

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

## 14 November 2026: Africa-wide positioning and Insights change

The owner clarified that the long-term proposition is **African food and agricultural commodity sourcing**, with **Nigeria as the initial operating/supplier base**, not an exclusively Nigerian brand. Updated the homepage and company narrative accordingly. Retained precise Nigerian origin references on actual initial commodity product pages; no claims of established operations in other African countries.

Added a public **Insights** section and two buyer-oriented guides: `insights.html`, `insights-hibiscus-buyers.html` and `insights-trial-order.html`. The sitemap now has **16 URLs** and both website build and test page lists include these files. New articles focus on African sourcing, dried hibiscus standards, and first trial orders. This is a material post-approval source change.

**DO NOT release the previously reviewed SHA or claim the new 16-page site has already been previewed.** Re-run the latest source CI, publish its matching immutable protected preview, verify all new pages, obtain approval for that exact full SHA, then run guarded CloudNext production with backup. The production enabled switch must remain false while preview/release checks fail.

## 14 November 2026: Hibiscus asset and direct buyer enquiry release gate

Owner requested replacement of the old illustrated hibiscus image with the owner-supplied dried calyces photograph and direct website submission (no mail application).

- HTML references now target `site/assets/hibiscus-product.webp`. **This WebP is not yet present in GitHub** and must be imported from `Staurus_Foods_Hibiscus_Image_Import.zip`, including the exact directory path, before CI passes or release continues.
- Enquiry form now POSTs to `api/enquiry.php` with inline success/failure. PHP endpoint was committed; it validates required fields, checks the product list and privacy acknowledgement, throttles submissions and attempts local PHP `mail()` delivery to `info@staurusfoods.com`.
- No CRM, database or paid form service is required for this phase.
- A `mail()` return of true means accepted by the local mail transport, **not independently delivered**. Test a valid enquiry through the live CloudNext PHP runtime and verify receipt in the actual mailbox. Test invalid submissions, honeypot, repeat sends/rate limit and failure messaging. CloudNext's PHP delivery support must be confirmed; if not reliable, implement authenticated SMTP with credentials held outside web roots, never in Git.
- Preview build must continue disabling form submissions, including its PHP endpoint stub. Do not test live email sending against the preview.
- PHP 8.1+ runtime is needed by the handler (`str_starts_with`, `never` type); verify CloudNext PHP version and ensure error messages do not disclose private information.
- Update privacy notice and check actual retention/logging characteristics before go-live.
- An earlier preview SHA is **not** an approval of these new files. Require the new image, latest CI, fresh immutable preview, owner visual approval and verified backup before live release.
