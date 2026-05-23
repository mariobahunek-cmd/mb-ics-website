#!/usr/bin/env python3
"""
Render the OG-image templates to JPG (1200x630) via Playwright.

Templates expected next to repo root:
  - og-template.html               -> og-image.jpg (Homepage / generic)
  - og-template-crashcourse.html   -> sap-mm-crashcourse/og-image.jpg
  - og-blog-template.html          -> og-cover-blog.jpg

Run from repo root:
  ~/.claude/skills/seo/.venv/bin/python docs/render-og-images.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


REPO_ROOT = Path(__file__).resolve().parent.parent

JOBS = [
    {
        "template": "og-template.html",
        "output":   "og-image.jpg",
    },
    {
        "template": "og-template-crashcourse.html",
        "output":   "sap-mm-crashcourse/og-image.jpg",
    },
    {
        "template": "og-blog-template.html",
        "output":   "og-cover-blog.jpg",
    },
]


def render_one(page, template: Path, output: Path) -> None:
    if not template.exists():
        print(f"  skip — template not found: {template}")
        return

    output.parent.mkdir(parents=True, exist_ok=True)
    file_url = template.resolve().as_uri()

    page.set_viewport_size({"width": 1200, "height": 630})
    page.goto(file_url, wait_until="networkidle")
    # Give web fonts + images a beat to settle.
    page.wait_for_timeout(400)

    page.screenshot(
        path=str(output),
        type="jpeg",
        quality=88,
        clip={"x": 0, "y": 0, "width": 1200, "height": 630},
    )
    size_kb = output.stat().st_size / 1024
    print(f"  ✓ {output.relative_to(REPO_ROOT)}  ({size_kb:.1f} KB)")


def main() -> int:
    print(f"Rendering OG images for {REPO_ROOT}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1200, "height": 630},
            device_scale_factor=2,  # crisp text
        )
        page = ctx.new_page()

        for job in JOBS:
            t = REPO_ROOT / job["template"]
            o = REPO_ROOT / job["output"]
            print(f"\n• {job['template']} -> {job['output']}")
            render_one(page, t, o)

        ctx.close()
        browser.close()

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
