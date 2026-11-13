# Staurus Foods Limited | Buyer-facing website approval build v2

**Domain:** staurusfoods.com  
**Hosting:** CloudNext (existing live hosting stays unchanged)  
**Status:** PREVIEW / NOT APPROVED FOR PRODUCTION

## Included
Eight static HTML pages: Home, Commodities, About, Quality, Buyer Enquiry, Trade Fairs, Privacy, Terms. Official owner-supplied Staurus symbol is embedded in WebP, with PNG favicon. Commodity imagery is from supplied files. Responsive CSS and navigation. No framework required.

## Critical blockers before publishing
1. The buyer form presently invokes an email application with a placeholder destination (`REPLACE_WITH_VERIFIED_COMPANY_EMAIL` in `assets/main.js`). It DOES NOT submit a buyer lead to a server. Confirm receiving mailbox and configure a tested, spam-protected endpoint or a verified mailto fallback. Never silently drop buyer leads.
2. The preview uses `noindex,nofollow` on all pages and `Disallow: /` in robots.txt. Replace these before production launch, once the domain resolves and pages are approved.
3. Add final canonical URLs, production XML sitemap, and final SEO / Organization schema to production. Verify business address, active CAC/NEPC status and supporting product claims before publication.
4. Update trade fair schedule using organiser-confirmed dates before publishing.
5. Verify photo provenance, supplier ownership, specification claims, legal pages and consent wording.
6. Backup CloudNext document root and mail/DNS settings. Validate SFTP connection, deploy to non-production staging first, test, secure owner approval, then release via GitHub Actions with rollback. Do not assume same CloudNext credentials as another property.

## Deployment plan
Recommended repository `bienosie/staurus-foods` (NOT created here). Keep private. Use independent CloudNext SFTP host, username, secret and docroot in GitHub Actions. Public production must only be updated after approved preview, backup, and connectivity test.
