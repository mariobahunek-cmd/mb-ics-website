"""Regression test: methodology/stats follow the owner's two evidence groups and
the published COMCAVE original evaluation (2026-10-31 source-truth update).

Covers, for EN/DE/ES:
- 'Three separate categories' claim replaced by two evidence groups (anonymous
  COMCAVE course evaluations; personal recommendations across LinkedIn,
  ProvenExpert and the direct submission system).
- Original evaluation published byte-identical for download; per-question n
  (106-108 answers per question, NOT 108 unique people / 108 total forms);
  no '2024-2026' period claim (not visible in the original).
- Binary questions labeled as yes/no shares (not school grades); the four
  1-6 school grades carry per-question n.
- Counting section describes the actual display: homepage count + at most
  three native cards, no cross-source mean promised in the UI.
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
METH = ROOT / "reviews" / "methodology" / "index.html"
I18N = ROOT / "_data" / "i18n_home.json"
HOME = ROOT / "_includes" / "home.html"
ASSET = ROOT / "assets" / "original" / "comcave-kursauswertung-original.jpg"
SHA256 = "a0f73ac82d18b51ed2e230b1f754f4a7b42e7d769528081d9672fa024b7fb458"

m = re.sub(r"\s+", " ", METH.read_text(encoding="utf-8"))
i18n_raw = I18N.read_text(encoding="utf-8")
h = HOME.read_text(encoding="utf-8")

# ── 1. Two evidence groups replace the three-category claim ──
for stale in [
    "Three separate categories",
    "Drei getrennte Kategorien",
    "Tres categorías separadas",
]:
    assert stale not in m, f"stale three-category claim still present: {stale}"
for fresh in ["Two evidence groups", "Zwei Beleggruppen", "Dos grupos de pruebas"]:
    assert fresh in m, f"missing two-group wording: {fresh}"
assert m.count("ProvenExpert") >= 3, "ProvenExpert must be named in group 2 in every language"

# ── 2. Original evaluation: published, per-question n, no unevidenced claims ──
for stale in [
    "no underlying COMCAVE report",
    "Per-question sample sizes are unknown",
    "Originalbericht und Stichprobengröße",
    "muestras por pregunta no disponibles",
    "Informe original no disponible",
    "Original report unavailable",
]:
    assert stale not in m, f"stale availability/sample-size claim: {stale}"
assert "2024–2026" not in m and "2024-2026" not in m, \
    "period 2024-2026 is not evidenced in the original; must not be claimed"
for stale in ["108 forms", "108 Bögen", "108 formularios"]:
    assert stale not in m, f"108-total claim must go (only 106-108 answers per question): {stale}"
for fresh in ["n=107", "n=108", "106–108", "(100%)"]:
    assert fresh in m, f"missing per-question evidence figure: {fresh}"
assert "(98.1%)" in m or "(98,1 %)" in m, "98.1% yes share missing"
# binary vs school grade labelling in all three languages
for fresh in [
    "binary means, not school grades",
    "binäre Mittelwerte, keine Schulnoten",
    "medias binarias, no notas",
]:
    assert fresh in m, f"binary-vs-grade labelling missing: {fresh}"
# school-grade rows keep the 1-6 scale statement
assert "1–6" in m or "1-6" in m, "1-6 school grade scale must stay labelled"
assert "/assets/original/comcave-kursauswertung-original.jpg" in m, \
    "methodology must link the unaltered original download"

# ── 3. Counting section matches the actual display API ──
for stale in [
    "The count, mean and 1–5 distribution use exactly",
    "Anzahl, Durchschnitt und Sterneverteilung beziehen sich",
    "El número, promedio y distribución incluyen solo",
]:
    assert stale not in m, f"stale mean/distribution UI promise: {stale}"
for fresh in [
    "no average across sources",
    "keinen quellenübergreifenden Durchschnitt",
    "ningún promedio entre fuentes",
]:
    assert fresh in m, f"no-cross-source-mean statement missing: {fresh}"
for fresh in [
    "at most the three most recent",
    "höchstens die drei neuesten",
    "máximo las tres",
]:
    assert fresh in m, f"three-native-cards display truth must stay: {fresh}"

# ── 4. Original asset bytes preserved ──
data = ASSET.read_bytes()
assert hashlib.sha256(data).hexdigest() == SHA256, "original evaluation asset bytes changed"
assert len(data) == 66125, "original evaluation asset size changed"

# ── 5. Homepage stats (i18n + include) match source truth ──
assert "2024–2026" not in i18n_raw and "2024-2026" not in i18n_raw, \
    "unevidenced period claim still in homepage i18n"
for stale in [
    "Originalbericht hier nicht verfügbar",
    "Original report unavailable",
    "Informe original no disponible",
]:
    assert stale not in i18n_raw, f"stale 'original unavailable' in homepage i18n: {stale}"
assert i18n_raw.count('"metrics.engagementValue"') == 3, "engagementValue (yes share) key per language"
assert i18n_raw.count('"metrics.practiceValue"') == 3, "practiceValue (yes share) key per language"
assert i18n_raw.count('"metrics.originalLink"') == 3, "original-download link label key per language"
for label in ["Ja-Anteil", "yes share", "% sí"]:
    assert label in i18n_raw, f"binary yes-share label missing: {label}"
assert "/assets/original/comcave-kursauswertung-original.jpg" in h, \
    "homepage must offer the original download at the COMCAVE figures"
for gone in [">1.00<", ">1.02<"]:
    assert gone not in h, f"binary means must not display as bare grade numbers: {gone}"

print("test_methodology_evidence_groups: all assertions passed")
