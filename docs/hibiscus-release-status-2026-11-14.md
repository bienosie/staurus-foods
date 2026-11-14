# Hibiscus Release 1 deployment receipt

14 November 2026, GMT. Production deployed successfully; hosting cache cleared and all 26 public file checks passed.

## A. Preview recovery

- Original HTTP 500 root cause: AuthUserFile referenced a missing `.htpasswd` file. CloudNext log at 07:51:24 GMT recorded `AH01620: Could not open password file: /home/sites/10b/f/ffe8ba666a/private-auth/.htpasswd`.
- The actual existing password file was `.htpasswd.txt`. Corrected that reference; retained the existing password entry, Basic authentication, Require valid-user, Options -Indexes and preview noindex headers. No credentials were disclosed.
- Exact reviewed preview: https://preview.staurusfoods.com/6e9ad0531f9388edf209194ab8a8caf742990d75/
- Reviewed and published source SHA: `6e9ad0531f9388edf209194ab8a8caf742990d75`.
- Authenticated verification succeeded in https://github.com/bienosie/staurus-foods/actions/runs/43588925119 , attempt 2, job 132429681522.
- Anonymous and deliberately incorrect credentials returned 401. Correct credentials returned 200 for the manifest and all 26 files, including all 13 HTML pages. Manifest equality, SHA-256 hashes, local links, noindex controls, disabled preview forms, disabled directory listing and private-path protection passed.
- Log at 11:15:31 GMT: PASS authenticated HTTP checks, immutable file hashes, internal links, anonymous/incorrect credential rejection, noindex, disabled preview forms and private path protection.
- Attempt 1 of that run suffered an SFTP read connection drop before HTTP verification; retry verified the identical immutable preview. Earlier run 43584117516 uploaded the preview but lacked the HTTP password secret. These are superseded by the successful verification above.
- Normal Edge's missing password prompt remains a browser-session issue. Server authentication is now independently verified.

## B. GitHub

- All four pinned-source tests passed locally and in GitHub. Production extraction uses the reviewed source's matching tests and builder.
- The approved scope is exactly 13 HTML pages, including hibiscus. Later main changes involving Insights and Africa-wide copy were not substituted into this pinned operation.
- Workflow head at dispatch: `c7c7b6ed52d9badea01a1e7ed4a3498201dead68`. Site source is the pinned SHA above; this documentation commit does not change published content.
- Production workflow: https://github.com/bienosie/staurus-foods/actions/runs/43589696603 , job 132431599083, SUCCESS.
- Owner reference: Stephen's 13 November 2026 production authorisation plus the authorised hibiscus Release 1 addendum on 14 November 2026 in the Staurus Foods conversation; preview verification run and attempt were recorded in the input.
- The prior candidate 89a60834c0e8dc2261e6cd85343ffd8f36c22b4c was not redeployed for this addendum.

## C. CloudNext

Hosting remains CloudNext/20i Linux, account WEB363598.

| Purpose | Verified directory |
| --- | --- |
| Production | /home/sites/10b/f/ffe8ba666a/public_html |
| Preview | /home/sites/10b/f/ffe8ba666a/preview-site |
| Authentication | /home/sites/10b/f/ffe8ba666a/private-auth |
| Private backups | /home/sites/10b/f/ffe8ba666a/private-backups |

The deployment enforces separate real production, preview and backup directories, rejects symlinks, checks remote preview parity and uses pinned SSH known-host verification.

Verified pre-release backup:
`/home/sites/10b/f/ffe8ba666a/private-backups/20261114T112307434875Z-6e9ad0531f9388edf209194ab8a8caf742990d75`

Receipt: the directory above plus `/deployment-receipt.json`. It records reviewed source, owner approval reference, actor, run ID and previous-file hashes. The script copies and checksum-verifies all affected existing files before production replacement.

Log at 11:26:50 GMT confirms Verified pre-release backup created and Production files verified.

SFTP port 22 retained host verification. Independently verified RSA identity:
`SHA256:KlbVjzb5BI2vyBtX3kK0ZDSCdHAQLWZpIC15HD+26xU`.
The production run retained Paramiko RejectPolicy and existing known-host pin.

## D. Public website

- Homepage HTTPS: 200. Live release.json: 200, source SHA matches reviewed hibiscus release, 26 files.
- All 13 HTML pages return 200 and exactly match production SHA-256 hashes: homepage, catalogue, hibiscus, raw cashew, cocoa, sesame, soya, about, quality, enquiry, trade fairs, privacy and terms.
- Final public verification: all 26 ordinary, unversioned bundle URLs returned HTTP 200 and exactly matched the reviewed production SHA-256 hashes. The live release.json exactly matched the reviewed production manifest. Homepage / also matched index.html.
- Resolved a post-deployment cache issue: older JavaScript and CSS were served with origin/CDN cache HIT headers. After the owner signed in, the Staurus Foods hosting-package CDN purge reported CDN Purge Successful in CloudNext. Both normal asset URLs then returned the expected current hashes with origin and CDN MISS headers. A complete 26-file verification subsequently passed. No source changes or second production upload were required.
- Corporate logo, commodity photographs and labelled hibiscus botanical illustration load. Hibiscus illustration is not represented as stock photography or evidence of available inventory.
- Desktop hibiscus layout rendered correctly with loaded images. At 390 by 844, the mobile page had no horizontal overflow, readable content and a working navigation menu. The temporary viewport override was reset.
- Hibiscus CTA opens enquire.html?commodity=hibiscus. Dried hibiscus flowers is present in the form. A fresh browser load at the www hostname visibly selected Dried hibiscus flowers automatically. An older apex browser session retained the previously cached JavaScript; returning visitors may need to refresh their browser cache. The ordinary apex asset URL is independently verified as the correct new bytes.
- An isolated execution of the exact reviewed JavaScript passed hibiscus query preselection and prepared a mailto enquiry to info@staurusfoods.com with subject Staurus Foods buyer enquiry: Dried hibiscus flowers, the expected form details, and the honeypot omitted. No email was sent. Native email-client opening and inbox receipt remain owner-assisted checks, not claimed complete.
- No unverified inventory, laboratory certification or export-grade claims were added.

## E. SEO

- XML sitemap: 200, valid XML, exactly 13 unique canonical URLs including hibiscus.
- robots.txt: 200, User-agent *, Allow /, sitemap advertised at https://staurusfoods.com/sitemap.xml.
- All 13 page canonicals use https://staurusfoods.com; production HTML has no draft noindex controls.
- Google domain property remains verified. Updated sitemap resubmission succeeded and Google reports Success, 13 discovered pages.
- Google hibiscus URL inspection: Discovered - currently not indexed. Live test at 11:32 GMT: URL is available to Google; Page can be indexed. No indexing or ranking guarantee is implied.
- Bing site remains verified. Re-submitted the existing sitemap; processing subsequently completed with Success, 13 URLs discovered and zero sitemap errors/warnings.
- robots rules allow Googlebot, bingbot and OAI-SearchBot. Request tests establish ordinary public access, not access from every crawler IP or guaranteed AI citations.
- IndexNow remains unconfigured. Recommended future addition through a separately reviewed release; no paid SEO service or new credential was introduced.

## F. Safety and follow-up

LIVE_RELEASE_ENABLED was restored to false after successful production deployment and read back from GitHub repository variables. Preview protection remains enabled. Email, MX and DNS were not changed during this addendum. Existing Google TXT and Bing CNAME verification records remain as previously commissioned.

The production release, private backup, protected preview and final 26-file public integrity checks have passed. All 13 pages, including hibiscus, are live. The hosting cache issue is resolved. There is no remaining production release blocker.

Recommended future release improvement: fingerprint CSS/JavaScript URLs in a separately reviewed build so returning visitors automatically receive changed assets without relying on browser-cache expiry. This was not introduced into the pinned 6e9ad053 release.

Further follow-up: native email application/inbox delivery test with owner; search indexing and AI citation monitoring; normal Edge preview prompt behaviour. No hosting move, upgrade, purchases, unrelated DNS changes or CRM development occurred.
