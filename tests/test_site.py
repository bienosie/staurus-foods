"""Static corporate website release checks. Run before preview or production."""
import re
import unittest
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"
PAGES = ("index.html", "commodities.html", "about.html", "quality.html",
         "enquire.html", "trade-fairs.html", "privacy.html", "terms.html",
         "raw-cashew-nuts.html", "cocoa-beans.html", "sesame-seeds.html", "soya-beans.html",
         "hibiscus-flowers.html", "insights.html",
         "insights-hibiscus-buyers.html", "insights-trial-order.html")

class WebsiteChecks(unittest.TestCase):
    def test_all_pages_present(self):
        self.assertTrue(SITE.is_dir(), "Website source folder site/ has not been uploaded")
        for page in PAGES:
            with self.subTest(page=page):
                self.assertTrue((SITE / page).is_file(), f"Missing page: {page}")

    def test_local_assets_and_links_exist(self):
        for page in PAGES:
            html = (SITE / page).read_text(encoding="utf-8")
            for value in re.findall(r'(?:href|src)=["\']([^"\']+)["\']', html):
                if value.startswith(("#", "https:", "http:", "mailto:", "data:")):
                    continue
                local = value.split("?", 1)[0].split("#", 1)[0]
                if local:
                    with self.subTest(page=page, target=local):
                        self.assertTrue((SITE / local).is_file(), f"Missing asset: {local}")

    def test_public_source_is_indexing_ready(self):
        # The preview build independently injects noindex and disallows crawling.
        for page in PAGES:
            html = (SITE / page).read_text(encoding="utf-8").lower()
            self.assertNotIn("noindex", html)
            self.assertNotIn("approval-preview", html)
            self.assertNotIn("site preview:", html)
        robots = (SITE / "robots.txt").read_text(encoding="utf-8").lower()
        self.assertNotIn("disallow: /", robots)
        self.assertIn("sitemap: https://staurusfoods.com/sitemap.xml", robots)
        self.assertTrue((SITE / "sitemap.xml").is_file())
        self.assertNotIn("REPLACE_WITH_VERIFIED_COMPANY_EMAIL", (SITE / "assets" / "main.js").read_text())

    def test_branding_is_present(self):
        self.assertTrue((SITE / "assets" / "staurus-logo.webp").is_file())
        self.assertIn("Staurus Foods", (SITE / "index.html").read_text())

if __name__ == "__main__":
    unittest.main()
