import { openDB } from "../../src/db.ts";
export const valid = {
  stars: 5,
  comment: "",
  display_name: "",
  visibility_choice: "anonymous",
  course_category: "MM",
  course_month: "",
  original_language: "en",
  email: "synthetic@example.invalid",
  consent: true,
  consent_version: "2026-10-09",
  website: "",
};
export function fixture() {
  const db = openDB(":memory:");
  const mail: {
    to: string;
    confirm: string;
    manage: string;
    language: string;
  }[] = [];
  const ctx = {
    db,
    key: Buffer.alloc(32, 7),
    now: () => Date.UTC(2026, 9, 9),
    site: "http://127.0.0.1:4173",
    mailEnabled: true,
    send: async (m: any) => {
      mail.push(m);
    },
    challenge: async () => true,
  };
  return { ctx, mail, db };
}
