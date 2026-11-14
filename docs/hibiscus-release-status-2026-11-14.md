# Hibiscus Release 1 addendum status

14 November 2026, Europe/London.

## Exact release scope

Owner-requested source SHA: `6e9ad0531f9388edf209194ab8a8caf742990d75`.

This revision contains thirteen HTML pages and thirteen unique canonical sitemap entries, including hibiscus-flowers.html. Later main commits add Insights and Africa-wide source changes; those are outside this explicitly pinned thirteen-page operation and have not been substituted for the reviewed source.

Hibiscus is retained in homepage priority products, catalogue and buyer form. The hibiscus page's title, description, canonical and JSON-LD WebPage URL match the intended production URL. Local links and assets resolve. The illustration is explicitly labelled as an illustration, not stock photography or evidence of inventory. Copy does not assert available stock, certified grades or laboratory results. The enquiry JavaScript supports hibiscus preselection.

## Verification completed

- All four local repository tests passed against the pinned revision.
- Local preview and production builds each contain twenty-six source files.
- The sitemap has exactly thirteen unique URLs matching the thirteen HTML pages.
- A local rehearsal of the revised approved-release extraction, reviewed tests and reviewed builder passed and produced the identical production manifest.
- GitHub pinned preview run: https://github.com/bienosie/staurus-foods/actions/runs/43584117516 .
- GitHub job `132414980659`: reviewed ancestor pin, four tests, preview build and immutable preview upload/checksum verification all passed.
- GitHub log at 10:14:16 GMT: `Preview uploaded and verified: 6e9ad0531f9388edf209194ab8a8caf742990d75`.
- Protected preview URL: https://preview.staurusfoods.com/6e9ad0531f9388edf209194ab8a8caf742990d75/ .
- Anonymous request returned 401 with Basic realm `Staurus Foods Release 1 Preview` and X-Robots-Tag noindex/nofollow/noarchive.
- Deliberately invalid diagnostic credentials returned 401.

## Precise remaining blocker

The overall pinned preview workflow is not green. Its last authenticated HTTP verification step stopped because preview HTTP credentials are not configured in GitHub. It did not report a site-content or upload failure. No authenticated thirteen-page HTTP success is claimed.

The latest pinned-preview workflow defaults to the established username `staurus-preview` and needs one repository secret: `PREVIEW_HTTP_PASSWORD`. The owner must enter the existing preview password securely in GitHub, not chat. An optional `PREVIEW_HTTP_USER` secret can override the default if the username changes. After entry, dispatch a new pinned preview run on current main with the same source_sha, rather than rerunning the older workflow definition that still required both secrets.

The HTTP check is read-only. It rejects redirects, restricts credential-bearing requests to preview.staurusfoods.com, validates exact manifest/file hashes and source SHA, checks all HTML/internal links and assets, verifies noindex and disabled preview forms, and checks anonymous/invalid credential rejection and private-path protection. It does not remove or change Basic authentication.

The approved production workflow now extracts the reviewed site's matching tests and builder, so later main requirements do not get mixed into a pinned release. Deployment still uses the current controlled SFTP deployment script with pinned host verification, remote preview source/checksum parity, verified private backup and production file verification.

## Production state and next actions

LIVE_RELEASE_ENABLED was confirmed false before work and has not been enabled during this addendum. The existing live release remains unchanged; hibiscus has not yet been published by this operation. The prior source SHA 89a60834c0e8dc2261e6cd85343ffd8f36c22b4c will not be used for this addendum.

After secure credential entry: run authenticated preview verification to green, review the exact pinned preview, open the controlled production window, run the existing approved-release workflow with the pinned source and owner addendum approval reference, verify a fresh private backup and all thirteen live pages/assets/checksums, restore LIVE_RELEASE_ENABLED=false and resubmit the thirteen-page sitemap in Google and Bing. No certification, inventory or export-grade claims may be added without evidence.
