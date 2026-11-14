# Trade and international contact release, 14 November 2026

## Published source
`784c9e9c9c01e18950f5a82bc650829f9a77adba`

Stephen explicitly authorised publication in the Chat Edge execution brief on 14 November 2026, reaffirming the original 13 November owner authorisation. The exact source was deployed to an immutable protected preview and then released.

## Evidence
- Validation #113 passed: https://github.com/bienosie/staurus-foods/actions/runs/43632553624
- Pinned preview #12 passed: https://github.com/bienosie/staurus-foods/actions/runs/43634056923
- Expanded pinned preview #13 passed: https://github.com/bienosie/staurus-foods/actions/runs/43634169180
- Production #5 succeeded at 20:07 GMT: https://github.com/bienosie/staurus-foods/actions/runs/43635289465
- Production job: 132570641936.
- Production artifact: 14129608137.
- Full preview screenshot/report artifact: 14130036405.
- Preview source: https://preview.staurusfoods.com/784c9e9c9c01e18950f5a82bc650829f9a77adba/

The only subsequent pre-release main change was verification tooling commit `105ffa871e0d8d68a4f6630e1dc8440e98ef5165`, extending the existing pinned workflow to 16 pages at desktop 1440x1000 and mobile 390x844. Website source remained unchanged. The report confirms 32 successful page/layout checks, images, mobile navigation, footer telephone links and the WhatsApp destination.

Authenticated HTTP checks verified the immutable bundle, all 16 pages, internal links, image checksums, noindex, disabled preview forms and anonymous/invalid-credential rejection. Screenshot review confirmed readable footer contact blocks and customer-facing trade content. The preview-only fixed banner overlaps the floating WhatsApp button, especially on mobile. This banner is absent from the production build.

## Backup and deployment safeguards
Configured separate locations:
- Production: `/home/sites/10b/f/ffe8ba666a/public_html`
- Preview: `/home/sites/10b/f/ffe8ba666a/preview-site`
- Backup: `/home/sites/10b/f/ffe8ba666a/private-backups`

Verified backup:
`/home/sites/10b/f/ffe8ba666a/private-backups/20261114T200258346064Z-784c9e9c9c01e18950f5a82bc650829f9a77adba`

Production log explicitly confirms `Verified pre-release backup created` and `Production files verified`. Existing pinned host checks, source parity, verified staging, backup and rollback safeguards were retained.

## Public HTTP checks completed
A read-only post-release script successfully checked:
- Public release manifest has the exact published SHA and production mode.
- Every non-PHP manifest file returned HTTPS 200 and matched its SHA-256 checksum.
- All 16 HTML pages have expected canonical URLs, internal links and no noindex controls.
- All 16 pages include `tel:+2348070710922`, `tel:+447892105439`, and `tel:+12103294634`.
- Footer and floating WhatsApp links point to `https://wa.me/2348070710922`.
- Trade page contains customer-facing content without internal attendance rationales.
- Homepage matches its manifest checksum.
- robots.txt permits crawling and advertises the sitemap.
- Sitemap has 16 URLs.

No telephone call, WhatsApp message or enquiry email was sent. The PHP endpoint was not exercised in this contact-copy release.

## Remaining operational follow-up
The browser stopped responding after dispatch. `LIVE_RELEASE_ENABLED` was last confirmed `true` for this release. Restoration to `false` is NOT yet verified. Restore it immediately through:
https://github.com/bienosie/staurus-foods/settings/variables/actions/LIVE_RELEASE_ENABLED

Final live desktop/mobile visual and click-through checks remain incomplete because of the browser connection failure. The final anonymous preview HTTP recheck was blocked by the execution network proxy (CONNECT 403), not an observed preview server response. Pre-release protection tests passed, and the production workflow does not change preview authentication.
