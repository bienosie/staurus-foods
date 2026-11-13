# Release 1 launch: Search engine and AI discovery

**Status:** preparation only. Do not submit blocked preview pages or declare site indexed.

## Technical release
- Keep `preview.staurusfoods.com` behind server authentication and noindex.
- Confirm working buyer enquiry mailbox and test the form before launch.
- Site pages: home, commodities, raw cashew nuts, cocoa beans, sesame seeds, soya beans, company, quality, enquiries, trade fairs, terms and privacy.
- Verify page titles, meta descriptions, canonical URLs, clear company/contact claims, alt text and internal links.
- Generate `sitemap.xml` listing only approved production pages.
- Under an approved live release, replace robots `Disallow: /` with crawl permission and `Sitemap: https://staurusfoods.com/sitemap.xml`, and remove all draft noindex directives. **Never do this in the preview.**
- Resolve the preferred canonical host (apex or www) with redirects, HTTPS, 200 status and no redirect chains.
- Validate structured data consistent with the page's visible facts, mobile usability and load performance.

## Search discovery sequence (after successful live publication)
1. Google Search Console: verify the domain property via DNS; submit sitemap; inspect representative pages; monitor indexing and queries.
2. Bing Webmaster Tools: verify/import the property; submit sitemap and configure IndexNow to notify participating engines when content changes.
3. Check crawlers and CDN do not block OpenAI's `OAI-SearchBot`; permit normal public indexing where appropriate. This affects eligibility for ChatGPT search citation, not guaranteed appearance.
4. Bing/Copilot and Google AI features rely heavily on normal index eligibility, clear source material and useful, factual content. No dedicated AI schema, fabricated reviews or llms.txt file is required.
5. Provide original, documented product sourcing information and useful answers to buyer questions. Update pages after actual lab results and verified product availability.
6. Add Google Analytics 4 only with compliant consent settings, and record source, medium and enquiry conversion where permitted.
7. Weekly: Google coverage and sitemap errors; Bing diagnostics and IndexNow, referral sessions, qualified enquiries, sample requests and converted orders.

## Phase 2 CRM is separate
See `docs/release-2-buyer-crm.md`. Do not add a client-visible API key or unprotected buyer database.

## Sources
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://www.bing.com/webmasters/help/?topicid=62f2860b
- https://developers.openai.com/api/docs/bots
