export const CONSENT_VERSION = "2026-10-09";
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export interface ReviewInput {
  stars: number;
  comment: string;
  display_name: string;
  visibility_choice: "anonymous" | "named";
  course_category: string;
  course_month: string;
  original_language: string;
  email: string;
  consent: true;
  consent_version: string;
  website: string;
  challenge?: string;
}
export function validateReview(value: unknown): ReviewInput {
  const v = value as ReviewInput;
  if (
    !v ||
    typeof v !== "object" ||
    !Number.isInteger(v.stars) ||
    v.stars < 1 ||
    v.stars > 5
  )
    throw new HttpError(400, "stars");
  for (const [key, max] of Object.entries({
    comment: 3000,
    display_name: 80,
    course_month: 7,
    email: 254,
    website: 200,
  })) {
    if (
      typeof v[key as keyof ReviewInput] !== "string" ||
      (v[key as keyof ReviewInput] as string).length > max
    )
      throw new HttpError(400, key);
  }
  if (
    !["anonymous", "named"].includes(v.visibility_choice) ||
    (v.visibility_choice === "named" && !v.display_name.trim())
  )
    throw new HttpError(400, "display_name");
  if (
    !["MM", "SD", "basics", "other"].includes(v.course_category) ||
    !["en", "de", "es"].includes(v.original_language)
  )
    throw new HttpError(400, "category_or_language");
  if (
    v.course_month &&
    (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.course_month) ||
      v.course_month > new Date().toISOString().slice(0, 7) ||
      v.course_month < "1990-01")
  )
    throw new HttpError(400, "course_month");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) || /[\r\n\x00]/.test(v.email))
    throw new HttpError(400, "email");
  if (v.consent !== true || v.consent_version !== CONSENT_VERSION)
    throw new HttpError(400, "consent");
  return {
    ...v,
    email: v.email.trim().toLowerCase(),
    display_name: v.display_name.trim(),
  };
}
export function publicDTO(r: Record<string, unknown>) {
  return {
    id: r.id,
    stars: r.stars,
    comment: r.comment_plaintext ?? r.comment,
    display_name: r.visibility_choice === "anonymous" ? null : r.display_name,
    course_category: r.course_category,
    course_month: r.course_month || null,
    original_language: r.original_language,
    published_at: r.published_at,
    origin: "native",
    verification_level: "email_only",
  };
}
