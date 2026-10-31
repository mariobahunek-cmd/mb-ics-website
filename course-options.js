// Shared inventory for the participant form (B2–B6). This module mirrors the
// backend whitelist in services/reviews/src/course-inventory.ts; a backend
// test asserts both stay in sync. Canonical identifiers are never changed
// here — only their user-facing presentation (name first, code small in
// parentheses after; no "XX" placeholder strings are ever displayed).
export const AREAS = ["MM", "SD", "basics", "other"];
export const CERT_INVENTORY = [
  "UC_FL_S420XX_DE",
  "UC_MM_S42023_DE",
  "UC_SD_S42022_DE",
  "UC_FI_S42023_DE",
  "C_TS452",
  "C_TS462",
];
export const BOOK_INVENTORY = [
  "S4H00",
  "S4H02",
  "S4500",
  "S4510",
  "S4515",
  "S4520",
  "S4525",
  "S4550",
  "S4600",
  "S4605",
  "S4F10",
  "S4F17",
];
// Owner-verified area mapping (OWNER-FORM-UX-CORRECTIONS.md §0). Foundation
// (UC) is available for every area and with no selection; FI is not a form
// area, so UC_FI_S42023_DE, S4F10 and S4F17 map to no selectable area.
export const CERT_AREAS = {
  MM: ["UC_FL_S420XX_DE", "UC_MM_S42023_DE", "C_TS452"],
  SD: ["UC_FL_S420XX_DE", "UC_SD_S42022_DE", "C_TS462"],
  basics: ["UC_FL_S420XX_DE"],
  other: ["UC_FL_S420XX_DE"],
};
export const BOOK_AREAS = {
  MM: ["S4500", "S4510", "S4515", "S4520", "S4525", "S4550"],
  SD: ["S4600", "S4605"],
  basics: [],
  other: [],
};
export const ALWAYS_CERTS = ["UC_FL_S420XX_DE"];
// Owner correction 2026-10-31: S4H00/S4H02 appear only while the Foundation
// Level (UC) CERTIFICATION checkbox is selected — not for the Grundlagen
// training area and not by default.
export const FOUNDATION_CERT = "UC_FL_S420XX_DE";
export const FOUNDATION_BOOKS = ["S4H00", "S4H02"];
// Deduplicated union in canonical inventory order (Foundation kept once).
function union(areas, map, inventory, always) {
  const allowed = new Set(always);
  for (const area of areas) {
    for (const code of map[area] || []) allowed.add(code);
  }
  return inventory.filter((code) => allowed.has(code));
}
// Owner correction 2026-10-31: without a selected training area the area
// filter is INACTIVE — the full certification catalogue is offered (not just
// Foundation). Once areas are selected, the deduplicated union applies.
export function certOptionsForAreas(areas) {
  if (!areas || areas.length === 0) return [...CERT_INVENTORY];
  return union(areas, CERT_AREAS, CERT_INVENTORY, ALWAYS_CERTS);
}
export function bookOptionsForAreas(areas, foundationCertSelected = false) {
  // The Foundation cert -> S4H00/S4H02 link stays its own separate filter,
  // independent of the area selection (also when no area is selected).
  const allowed = new Set(foundationCertSelected ? FOUNDATION_BOOKS : []);
  if (!areas || areas.length === 0) {
    // No area selected: the whole book catalogue minus the Foundation books,
    // which remain gated on the Foundation certification checkbox.
    return BOOK_INVENTORY.filter(
      (code) => allowed.has(code) || !FOUNDATION_BOOKS.includes(code),
    );
  }
  for (const area of areas) {
    for (const code of BOOK_AREAS[area] || []) allowed.add(code);
  }
  return BOOK_INVENTORY.filter((code) => allowed.has(code));
}
// Localized display (B6). Certifications: human-readable name first, the
// canonical code only secondarily. The Foundation identifier carries the
// unverified "XX" placeholder, so no code is displayed for it (B2) and no
// year suffix is invented for any entry. Book titles are real German SAP
// press titles and keep their original wording in every language.
const CERT_NAMES = {
  UC_FL_S420XX_DE: {
    en: "SAP Foundation Level (UC)",
    de: "SAP Foundation Level (UC)",
    es: "SAP Foundation Level (UC)",
  },
  UC_MM_S42023_DE: {
    en: "SAP Materials Management (UC)",
    de: "SAP Materialwirtschaft (UC)",
    es: "SAP Gestión de materiales (UC)",
  },
  UC_SD_S42022_DE: {
    en: "SAP Sales & Distribution (UC)",
    de: "SAP Vertrieb (UC)",
    es: "SAP Ventas y distribución (UC)",
  },
  UC_FI_S42023_DE: {
    en: "SAP Financial Accounting (UC)",
    de: "SAP Finanzwesen (UC)",
    es: "SAP Contabilidad financiera (UC)",
  },
  C_TS452: {
    en: "SAP MM consultant certification",
    de: "SAP-MM-Beraterzertifizierung",
    es: "Certificación de consultor SAP MM",
  },
  C_TS462: {
    en: "SAP SD consultant certification",
    de: "SAP-SD-Beraterzertifizierung",
    es: "Certificación de consultor SAP SD",
  },
};
const BOOK_NAMES = {
  S4H00: { en: "Überblick über SAP S/4HANA", de: "Überblick über SAP S/4HANA", es: "Überblick über SAP S/4HANA" },
  S4H02: { en: "SAP Fiori Überblick", de: "SAP Fiori Überblick", es: "SAP Fiori Überblick" },
  S4500: { en: "Geschäftsprozesse Sourcing & Procurement", de: "Geschäftsprozesse Sourcing & Procurement", es: "Geschäftsprozesse Sourcing & Procurement" },
  S4510: { en: "Bestandsführung und Inventur", de: "Bestandsführung und Inventur", es: "Bestandsführung und Inventur" },
  S4515: { en: "Rechnungsprüfung", de: "Rechnungsprüfung", es: "Rechnungsprüfung" },
  S4520: { en: "Einkauf in SAP S/4HANA", de: "Einkauf in SAP S/4HANA", es: "Einkauf in SAP S/4HANA" },
  S4525: { en: "Verbrauchsgesteuerte Disposition und Prognose", de: "Verbrauchsgesteuerte Disposition und Prognose", es: "Verbrauchsgesteuerte Disposition und Prognose" },
  S4550: { en: "Cross-Functional Customizing MM", de: "Cross-Functional Customizing MM", es: "Cross-Functional Customizing MM" },
  S4600: { en: "Geschäftsprozesse Sales", de: "Geschäftsprozesse Sales", es: "Geschäftsprozesse Sales" },
  S4605: { en: "Sales Processing", de: "Sales Processing", es: "Sales Processing" },
  S4F10: { en: "Geschäftsprozesse FI", de: "Geschäftsprozesse FI", es: "Geschäftsprozesse FI" },
  S4F17: { en: "Anlagenbuchhaltung", de: "Anlagenbuchhaltung", es: "Anlagenbuchhaltung" },
};
export const AREA_NAMES = {
  MM: { en: "SAP MM (Materials Management)", de: "SAP MM (Materialwirtschaft)", es: "SAP MM (gestión de materiales)" },
  SD: { en: "SAP SD (Sales & Distribution)", de: "SAP SD (Vertrieb)", es: "SAP SD (ventas y distribución)" },
  basics: { en: "Fundamentals", de: "Grundlagen", es: "Fundamentos" },
  other: { en: "Other training", de: "Sonstiges Training", es: "Otra formación" },
};
// Name-first display label; the code is appended in parentheses after the
// name unless it must stay hidden (Foundation's "XX" placeholder, B2).
export function certLabel(code, lang) {
  const name = CERT_NAMES[code]?.[lang] || CERT_NAMES[code]?.en;
  if (!name) return code;
  return code === "UC_FL_S420XX_DE" ? name : `${name} (${code})`;
}
export function bookLabel(code, lang) {
  const name = BOOK_NAMES[code]?.[lang] || BOOK_NAMES[code]?.en;
  return name ? `${name} (${code})` : code;
}
export function areaLabel(area, lang) {
  return AREA_NAMES[area]?.[lang] || AREA_NAMES[area]?.en || area;
}
