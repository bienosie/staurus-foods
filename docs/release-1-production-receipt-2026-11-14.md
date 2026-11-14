# Staurus Foods Release 1 production receipt

Date: 14 November 2026 (Europe/London, GMT).

## Release outcome

Production is live at https://staurusfoods.com/. The existing approved-production workflow completed successfully on 14 November 2026 at approximately 08:28 GMT.

- Published source commit: `89a60834c0e8dc2261e6cd85343ffd8f36c22b4c`.
- Validation: https://github.com/bienosie/staurus-foods/actions/runs/43572895839 (success; four tests).
- Immutable preview deployment: https://github.com/bienosie/staurus-foods/actions/runs/43568505482 (success).
- Production release: https://github.com/bienosie/staurus-foods/actions/runs/43575780672 (success).
- Production job: `132389569668`.
- Production artifact: `approved-production-89a60834c0e8dc2261e6cd85343ffd8f36c22b4c`, artifact ID `14106182772`.
- Approval: owner Stephen authorised production on 13 November 2026, recorded in the handoff, and reaffirmed launch in Chat Edge on 14 November 2026. After seeing the authenticated InPrivate preview, the owner expressly authorised proceeding while normal Edge preview sign-in behaviour was deferred.

## A. Preview recovery

Root cause: the preview AuthUserFile directive referenced a file that did not exist under that exact name. CloudNext error log at 07:51:24 GMT on 14 November 2026 reported:

`AH01620: Could not open password file: /home/sites/10b/f/ffe8ba666a/private-auth/.htpasswd`

The private directory actually contained `.htpasswd.txt` (76 bytes, mode 0644; parent directory mode 0755). The existing preview directive was corrected to that actual filename. The password entry was not replaced or disclosed. AuthName was subsequently changed to `Staurus Foods Release 1 Preview` to request a fresh browser authentication challenge. Basic authentication, `Require valid-user`, `Options -Indexes` and the X-Robots-Tag noindex header remain active.

Anonymous requests to both the 7641df9 and 89a6083 preview roots returned 401. Deliberately invalid diagnostic credentials returned 401. The owner successfully authenticated in InPrivate. Access logs at 08:10:41 GMT recorded account `staurus-preview` receiving HTTP 200 for the release-candidate raw cashew page, CSS, JavaScript and logo; the cashew photograph and favicon also returned 200. The owner supplied a screenshot of the rendered page. Earlier post-repair homepage and commodity overview requests also returned 200.

Normal Edge continued to show 401 without a sign-in prompt. This remains a browser-session issue for later investigation. Full authenticated HTTP checks of all twelve preview pages and authenticated checks of the earlier preview were not completed. The owner explicitly accepted this limitation for launch. Source and remote preview checksum parity remained enforced by the production workflow.

Reviewed preview: https://preview.staurusfoods.com/89a60834c0e8dc2261e6cd85343ffd8f36c22b4c/

## B. GitHub readiness and release

The main head at dispatch matched the published SHA above. The indexable production source passed all four repository tests and the production build. No draft noindex instructions or preview banner entered the production bundle. The workflow extracted the reviewed site source, checked that the SHA was an ancestor of main, verified remote preview source parity and checksums, staged uploads and verified the final production file checksums. No deployment safeguards were removed.

This receipt is a documentation-only follow-up commit; it does not change the deployed site source.

## C. CloudNext and backup

Hosting remains CloudNext/20i Linux, account WEB363598.

Verified account home: `/home/sites/10b/f/ffe8ba666a/`.

Separate real directories:

- Production: `/home/sites/10b/f/ffe8ba666a/public_html`.
- Preview document root: `/home/sites/10b/f/ffe8ba666a/preview-site` (confirmed in StackCP Subdomains).
- Authentication: `/home/sites/10b/f/ffe8ba666a/private-auth`.
- Backup: `/home/sites/10b/f/ffe8ba666a/private-backups`.

Verified backup/receipt directory:

`/home/sites/10b/f/ffe8ba666a/private-backups/20261114T082630249409Z-89a60834c0e8dc2261e6cd85343ffd8f36c22b4c`

The deployment receipt records the source SHA, approval, actor `bienosie`, run ID `43575780672` and prior state of all affected paths. Production was empty before this first launch, so all previous-file entries are null; there were no existing website files to copy. The workflow nevertheless created and verified the private receipt before publishing.

Workflow log confirms `Verified pre-release backup created` and `Production files verified`.

SFTP uses port 22 and pinned known-host verification with Paramiko RejectPolicy. The independently confirmed RSA fingerprint was verified by run https://github.com/bienosie/staurus-foods/actions/runs/43412863015:

`SHA256:KlbVjzb5BI2vyBtX3kK0ZDSCdHAQLWZpIC15HD+26xU`

Successful preview and production connections retained host verification.

## D. Public verification

Homepage HTTPS returned 200. Every one of the 24 production bundle files returned HTTP 200 and matched its expected SHA-256 checksum, including all twelve HTML pages, four commodity landing pages, company, quality, enquiry, trade fairs, privacy and terms, corporate logo, commodity photographs, CSS, JavaScript, robots.txt and sitemap.xml. The public release.json exactly matched the built production manifest.

The desktop homepage rendered with every image loaded and no horizontal overflow at 1526px. A 390px mobile viewport showed no horizontal overflow; the navigation menu opened and exposed the expected links. The temporary viewport override was reset.

The live enquiry page displays the required fields and explains its email preparation behaviour. An isolated execution of the exact published main.js with test-only form data generated a mailto to `info@staurusfoods.com`, with correct commodity subject and enquiry details, and omitted the honeypot. No test email was sent. Native email-client opening and mailbox receipt remain to be checked with the owner.

Public requests to the authentication-file and private-backup receipt paths returned 404. `/assets/` returned 403, preserving disabled directory listing. The preview root continued to return 401 without credentials.

## E. SEO commissioning

The public sitemap is valid XML with twelve canonical production URLs. robots.txt returns 200, permits all user agents and advertises https://staurusfoods.com/sitemap.xml. All twelve HTML canonicals use the production apex HTTPS domain. The public HTML and response headers contain no noindex controls. OAI-SearchBot is not excluded by the published robots rules; indexing or AI-search placement is not guaranteed.

Google Search Console was accessible in the existing account, but staurusfoods.com was not already listed. Domain verification was prepared. The pending TXT value is:

`google-site-verification=q4jc4tsnm7lLNm81HH1eZ-QKxEYjIukxmeBpMjY7xR8`

At launch, DNS verification was pending. In the subsequent commissioning session on 14 November 2026, the owner signed into CloudNext and the Google TXT record above was added to the apex through StackCP. A before/after comparison confirmed all twelve existing DNS records, including MX and SPF, were unchanged; there are now thirteen records. Google confirmed Ownership verified using the Domain name provider method. The TXT record must remain in place. The sitemap was submitted, processed successfully, and Google reported twelve discovered pages. The live homepage test confirmed URL is available to Google and Page can be indexed. The index inspection still showed historical pre-launch redirect data. Cashew and cocoa inspections showed Discovered - currently not indexed; sesame and soya showed URL is unknown to Google in their inspection snapshots. No indexing claim is made and no manual indexing request was sent.

Bing commissioning completed in the subsequent session on 14 November 2026. Signed in using the same Google account as Search Console. Direct CNAME verification was used, without granting a new Google Search Console data-import permission. Added `1670ecb6a5c6935ee72d7084c3052c45.staurusfoods.com` CNAME to `verify.bing.com.`. StackCP confirmed save, and all thirteen pre-existing records were preserved (fourteen records after this addition). The site became accessible in Bing Webmaster Tools following verification. Submitted `https://staurusfoods.com/sitemap.xml`; Bing lists one sitemap, status Processing, zero reported errors/warnings and zero URLs discovered at the receipt time. This is submission confirmation, not evidence of completed processing or indexing. Bing AI Performance showed zero citations and zero average cited pages, with its displayed data ending 13 November 2026 before this launch. IndexNow is not configured; it was assessed as a useful future addition to the controlled publication workflow. No key file, API key or paid service was introduced.

A request using the official OAI-SearchBot user-agent string returned 200 for robots.txt, the homepage and raw cashew page, with no X-Robots-Tag restrictions. This tests that request path and user-agent handling only; it does not establish access from all published OpenAI crawler IPs or guarantee ChatGPT inclusion.

## F. Safety and follow-up

`LIVE_RELEASE_ENABLED` was restored to `false` immediately after successful release and the false value was read back from GitHub repository variables. Preview protection remains active. Production hosting, email configuration and MX were not changed. DNS remained unchanged during launch; the subsequent Google commissioning added only the verification TXT record and preserved all pre-existing records. No purchases, hosting upgrades, new certifications or Release 2 CRM work occurred.

Outstanding items do not prevent the verified public site being live:

1. Diagnose normal Edge preview HTTP-auth prompt behaviour later.
2. Google domain verification, sitemap submission and homepage/commodity URL inspection completed. Keep the verification TXT record. Monitor indexing after Google's next crawls.
3. Bing verification and sitemap submission completed. Monitor processing and indexing. Consider IndexNow notifications for future approved releases.
4. Owner-assisted native mail-client and inbox delivery test.

## AI search recommendations following commissioning

Recommended next work, not deployed changes:

1. Expand each commodity page with buyer-useful specification tables using only verified partner data; distinguish requested specifications from available lot evidence and avoid invented grades, capacities, MOQ or certifications.
2. Add concise buyer questions and answers about samples, independent inspection, ordering steps, payment clearance and contractual shipment terms. Publish only terms actually approved by the owner and sourcing partner.
3. Strengthen consistent company identity and visible evidence: verified contact information, registration reference, official profiles, relevant product/lot documentation where publishable, and accurate Organization structured data matching visible text.
4. Add free IndexNow notifications to the existing approved deployment process when undertaking a source-tested release. Do not replace sitemap submission or bypass preview/backup controls.
5. Measure search discovery, qualified buyer enquiries and Bing AI citations. No recurring automation was created by this commissioning.

Evidence used: Bing Webmaster Guidelines (https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a), Google AI features guidance (https://developers.google.com/search/docs/appearance/ai-features), OpenAI crawler documentation (https://developers.openai.com/api/docs/bots), and Bing AI Performance documentation (https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c). Search indexing, AI citations and recommendations are not guaranteed. Special AI text files or paid SEO subscriptions are not prerequisites for Google AI search eligibility.
