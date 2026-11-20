"""Regression checks for the C_TS452_2601 exam-experience video card.

Covers the fourth card in the "See For Yourself" gallery (DPaV_-g0ykk):
- existing three videos untouched,
- local thumbnail (no Google/YouTube request before consent),
- numeric-only data-video-start,
- localized title/aria strings in de/en/es,
- consent modal URL building keeps validating start and id.
"""

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOME = (ROOT / "_includes" / "home.html").read_text(encoding="utf-8")
JS = (ROOT / "main.js").read_text(encoding="utf-8")
I18N = json.loads((ROOT / "_data" / "i18n_home.json").read_text(encoding="utf-8"))

NEW_ID = "DPaV_-g0ykk"
EXISTING_IDS = ["a2VQtHrOqzI", "crnMqP0DqZQ", "RAvV6HQlMq8"]


def card_block(video_id: str) -> str:
    match = re.search(
        rf'<div class="video-card" data-video-id="{re.escape(video_id)}".*?(?=<div class="video-card"|\n        </div>\n\n        <div class="video-section__footer)',
        HOME,
        re.DOTALL,
    )
    if not match:
        raise AssertionError(f"Missing video card for {video_id}")
    return match.group(0)


class ExamVideoCardTests(unittest.TestCase):
    def test_gallery_has_exactly_four_cards_and_existing_videos_untouched(self):
        ids = re.findall(r'data-video-id="([^"]+)"', HOME)
        self.assertEqual(
            ids,
            EXISTING_IDS + [NEW_ID],
            "video gallery must keep the three approved videos and add the new card last",
        )

    def test_new_card_is_keyboard_operable_and_localized(self):
        block = card_block(NEW_ID)
        self.assertIn('data-video-start="0"', block)
        self.assertIn('role="button"', block)
        self.assertIn('tabindex="0"', block)
        self.assertIn("data-i18n-aria=\"about.vid4aria\"", block)
        self.assertIn("data-i18n=\"about.vid4title\"", block)
        self.assertIn("{{ t['about.vid4aria'] | escape }}", block)
        self.assertIn("{{ t['about.vid4title'] | escape }}", block)
        self.assertIn('video-card__lang-badge--en', block)

    def test_new_card_uses_local_thumbnail_only(self):
        block = card_block(NEW_ID)
        self.assertIn('src="/assets/videos/DPaV_-g0ykk.jpg"', block)
        self.assertNotIn("img.youtube.com", block, "new card must not contact Google before consent")
        self.assertIn('width="1280"', block)
        self.assertIn('height="720"', block)

    def test_local_thumbnail_asset_exists_and_is_jpeg(self):
        path = ROOT / "assets" / "videos" / f"{NEW_ID}.jpg"
        self.assertTrue(path.is_file(), "local thumbnail asset must be committed")
        self.assertGreater(path.stat().st_size, 10_000, "thumbnail looks like an error placeholder")
        self.assertEqual(path.read_bytes()[:3], b"\xff\xd8\xff", "asset must be a JPEG")

    def test_i18n_keys_exist_in_all_three_languages(self):
        for lang in ("de", "en", "es"):
            self.assertIn("about.vid4title", I18N[lang], f"{lang} missing about.vid4title")
            self.assertIn("about.vid4aria", I18N[lang], f"{lang} missing about.vid4aria")

    def test_english_title_matches_owner_wording(self):
        self.assertEqual(
            I18N["en"]["about.vid4title"],
            "SAP C_TS452_2601: What the New System-Based Exam Is Really Like",
        )

    def test_de_es_titles_are_personal_experience_not_exam_content(self):
        # Grounded in Mario's own experience; must not teach exam tasks,
        # pass scores or AI permissions.
        self.assertIn("Meine Erfahrung", I18N["de"]["about.vid4title"])
        self.assertIn("Mi experiencia", I18N["es"]["about.vid4title"])
        for lang in ("de", "en", "es"):
            combined = I18N[lang]["about.vid4title"] + I18N[lang]["about.vid4aria"]
            for forbidden in ("dump", "Dump", "Bestehens", "pass score", "Pass-Score", "KI erlaubt"):
                self.assertNotIn(forbidden, combined, f"{lang} copy must not claim {forbidden!r}")

    def test_existing_video_strings_unchanged(self):
        self.assertEqual(
            I18N["en"]["about.vid3title"],
            "Cómo Crear un Registro Maestro de Condiciones en SAP Fiori",
        )
        self.assertEqual(
            I18N["de"]["about.vid2title"],
            "SAP Beschaffungsprozess: Von der Bestellung bis zur Rechnungsprüfung",
        )


class ModalConsentTests(unittest.TestCase):
    def test_embed_urls_are_built_through_validating_helper(self):
        self.assertIn("const buildVideoEmbedUrl", JS)
        # Only the helper may build embed URLs; the old direct
        # `${videoId}` interpolation must not survive anywhere.
        self.assertNotIn("youtube-nocookie.com/embed/${videoId}", JS)

    def test_helper_validates_id_and_start(self):
        helper = JS.split("const buildVideoEmbedUrl", 1)[1][:1400]
        self.assertIn("A-Za-z0-9_-]{6,20}", helper, "video id whitelist regex required")
        self.assertIn("/^\\d{1,5}$/.test(startRaw)", helper, "start must be digits-only before parsing")
        self.assertIn("start >= 0", helper)
        self.assertIn("start <= 36000", helper)

    def test_card_click_passes_start_and_consent_flow_carries_it(self):
        self.assertIn("openVideoModal(videoId, card.dataset.videoStart)", JS)
        self.assertIn("consentOverlay.dataset.videoStart", JS)
        self.assertIn("dataset.videoStart = typeof startRaw", JS)

    def test_keyboard_and_focus_trap_behavior_intact(self):
        self.assertIn(".video-card[role=\"button\"]", JS)
        self.assertIn("e.key === 'Enter' || e.key === ' '", JS)
        self.assertIn("e.key === 'Escape'", JS)
        self.assertIn("e.key === 'Tab'", JS)


class LiquidRenderCheck(unittest.TestCase):
    """Scoped substitute for the Jekyll build (no Ruby toolchain on this
    machine): emulate exactly the filters this include uses on the video
    section — {{ t['key'] | escape }} with t = i18n_home[lang] — and prove
    the fourth card resolves in all three languages. The authoritative
    build runs in CI via .github/workflows/build-check.yml on push."""

    def _render(self, lang: str) -> str:
        def repl(match: "re.Match[str]") -> str:
            key = match.group(1)
            value = I18N[lang].get(key, "")
            return (
                value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;")
            )

        return re.sub(r"\{\{ t\['([^']+)'\] \| escape \}\}", repl, HOME)

    def test_fourth_card_renders_localized_in_all_languages(self):
        for lang, expected in (
            ("en", "SAP C_TS452_2601: What the New System-Based Exam Is Really Like"),
            ("de", "Meine Erfahrung mit C_TS452_2601"),
            ("es", "Mi experiencia con C_TS452_2601"),
        ):
            rendered = self._render(lang)
            self.assertIn('data-video-id="DPaV_-g0ykk" data-video-start="0"', rendered)
            self.assertIn(expected, rendered, f"{lang} title did not resolve")
            self.assertIn("/assets/videos/DPaV_-g0ykk.jpg", rendered)

    def test_no_unresolved_video_placeholders_remain(self):
        for lang in ("de", "en", "es"):
            rendered = self._render(lang)
            leftovers = re.findall(r"\{\{ t\['about\.vid", rendered)
            self.assertEqual(leftovers, [], f"{lang} left unresolved video strings")


if __name__ == "__main__":
    unittest.main()
