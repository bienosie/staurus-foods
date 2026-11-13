"""Static corporate website release checks. Run before preview or production."""
import re
import unittest
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"
PAGES = ("index.html", "commodities.html", "about.html", "quality.html",
         "enquire.html", "trade-fairs.html", "privacy.html", "terms.html")

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

    def test_draft_is_not_accidentally_public_ready(self):
        # Preview content must remain marked for review until the launch gate is met.
        for page in PAGES:
            self.assertIn("noindex", (SITE / page).read_text().lower())
        self.assertIn("Disallow: /", (SITE / "robots.txt").read_text())

    def test_branding_is_present(self):
        self.assertTrue((SITE / "assets" / "staurus-logo.webp").is_file())
        self.assertIn("Staurus Foods", (SITE / "index.html").read_text())

if __name__ == "__main__":
    unittest.main()
