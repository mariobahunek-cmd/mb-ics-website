import { createHash } from "node:crypto";

// Only trusted, build-produced legacy documents receive compatibility allowances.
// Review forms/lists, admin, API, errors and every production response stay strict.
const legacyDocuments = new Set([
  "/",
  "/index.html",
  "/de/",
  "/de/index.html",
  "/es/",
  "/es/index.html",
  "/privacy.html",
  "/sap-mm-crashcourse/",
  "/sap-mm-crashcourse/index.html",
]);
export function contentSecurityPolicy(
  api: string,
  local = false,
  pathname = "",
  html = "",
) {
  const preview = local && legacyDocuments.has(pathname);
  const hashes = (tag: string) =>
    preview
      ? [
          ...html.matchAll(
            new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi"),
          ),
        ]
          .map(
            (match) =>
              `'sha256-${createHash("sha256").update(match[1].replace(/\r\n?/g, "\n")).digest("base64")}'`,
          )
          .join(" ")
      : "";
  return [
    "default-src 'self'",
    `script-src 'self' https://challenges.cloudflare.com${preview ? " https://www.googletagmanager.com " + hashes("script") : ""}`,
    `frame-src https://challenges.cloudflare.com${preview ? " https://www.youtube-nocookie.com" : ""}`,
    `connect-src 'self' ${api} https://challenges.cloudflare.com${preview ? " https://formspree.io https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com" : ""}`,
    `style-src 'self'${preview ? " " + hashes("style") : ""}`,
    ...(preview ? ["style-src-attr 'unsafe-inline'"] : []),
    `img-src 'self' data:${preview ? " https://img.youtube.com https://www.google-analytics.com" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    `form-action 'self'${preview ? " https://formspree.io" : ""}`,
  ].join("; ");
}
