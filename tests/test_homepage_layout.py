"""Regression checks for the homepage layout and responsive navigation."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "style.css").read_text(encoding="utf-8")
HOME = (ROOT / "_includes" / "home.html").read_text(encoding="utf-8")
JS = (ROOT / "main.js").read_text(encoding="utf-8")
CONFIG = (ROOT / "_config.yml").read_text(encoding="utf-8")


def css_rule(selector: str) -> str:
    """Return the first declaration block for a literal selector."""
    match = re.search(rf"{re.escape(selector)}\s*\{{(?P<body>[^}}]+)\}}", CSS)
    if not match:
        raise AssertionError(f"Missing CSS rule for {selector}")
    return match.group("body")


class HomepageLayoutTests(unittest.TestCase):
    def test_desktop_navigation_labels_do_not_wrap(self):
        self.assertIn("white-space: nowrap", css_rule(".nav__links a"))

    def test_navigation_collapses_before_links_become_cramped(self):
        breakpoint = re.search(
            r"@media\s*\(max-width:\s*(?P<width>\d+)px\)\s*\{\s*"
            r"\.nav__links[^{}]*\{[^}]*display:\s*none",
            CSS,
            re.DOTALL,
        )
        self.assertIsNotNone(breakpoint, "Desktop navigation needs an early collapse breakpoint")
        assert breakpoint is not None
        self.assertGreaterEqual(int(breakpoint.group("width")), 1100)

    def test_hero_supporting_copy_is_readable_on_dark_background(self):
        entity_rule = css_rule(".hero__entity")
        self.assertRegex(entity_rule, r"color:\s*rgba?\(255\s*,\s*255\s*,\s*255")
        hero_entity = re.search(r'<p class="hero__entity"(?P<attrs>[^>]*)>', HOME)
        self.assertIsNotNone(hero_entity)
        assert hero_entity is not None
        self.assertNotIn("style=", hero_entity.group("attrs"))

    def test_mobile_hero_heading_cannot_overflow_viewport(self):
        mobile_css = re.search(
            r"@media\s*\(max-width:\s*480px\)\s*\{(?P<body>.*?)\n\}",
            CSS,
            re.DOTALL,
        )
        self.assertIsNotNone(mobile_css)
        assert mobile_css is not None
        self.assertRegex(
            mobile_css.group("body"),
            r"\.hero__title-line--accent\s*\{[^}]*font-size:\s*clamp\([^;]+\)",
        )

    def test_mobile_menu_exposes_expanded_state(self):
        self.assertIn('aria-expanded="false"', HOME)
        self.assertIn('aria-controls="mobileMenu"', HOME)
        self.assertIn('id="mobileMenu"', HOME)
        self.assertIn("burger.setAttribute('aria-expanded'", JS)

    def test_mobile_menu_resets_when_desktop_breakpoint_is_crossed(self):
        self.assertIn("matchMedia('(max-width: 1180px)')", JS)
        self.assertIn("mobileNavQuery.addEventListener('change'", JS)
        self.assertRegex(JS, r"if \(!e\.matches\) closeMobileMenu\(\)")

    def test_mobile_menu_supports_escape_key(self):
        self.assertRegex(JS, r"e\.key === 'Escape'[^}]+closeMobileMenu", msg="Escape must close the mobile menu")

    def test_hero_visibility_fallback_includes_supporting_copy(self):
        fallback = re.search(
            r"HERO SAFETY FALLBACK(?P<body>.*?)\n\s*\},\s*2500\);",
            JS,
            re.DOTALL,
        )
        self.assertIsNotNone(fallback)
        assert fallback is not None
        self.assertIn(".hero__entity", fallback.group("body"))

    def test_cookie_actions_stack_on_narrow_screens(self):
        mobile_css = re.search(
            r"@media\s*\(max-width:\s*480px\)\s*\{(?P<body>.*?)\n\}",
            CSS,
            re.DOTALL,
        )
        self.assertIsNotNone(mobile_css)
        assert mobile_css is not None
        self.assertRegex(
            mobile_css.group("body"),
            r"\.cookie-banner__actions\s*\{[^}]*flex-direction:\s*column",
        )
    def test_tests_are_excluded_from_production_build(self):
        self.assertRegex(CONFIG, r"(?m)^\s*- tests/\s*$")


if __name__ == "__main__":
    unittest.main()
