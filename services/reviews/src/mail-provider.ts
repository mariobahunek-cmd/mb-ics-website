import type { Mail, MailDispatch } from "./context.ts";
import { checkMailDispatch, MAIL_REQUEST_BUDGET_MS } from "./mail-window.ts";
import type { loadConfig } from "./config.ts";
import { HttpError } from "./schema.ts";
const labels: Record<string, string> = {
  en: "Confirm your website review",
  de: "Website-Bewertung bestätigen",
  es: "Confirma tu opinión en la web",
};
// Binding comes from loadConfig's explicit shared-pool opt-in. This is NOT a
// provider quota reservation. Only the durable outbox calls this adapter.
export async function sendSharedMail(
  binding: ReturnType<typeof loadConfig>["sharedPool"], mail: Mail, id: string,
  transport: typeof fetch = fetch,
  dispatch?: MailDispatch,
) {
  if (!binding) throw new HttpError(503, "mail_paused");
  const text = `${labels[mail.language]}\n\n${mail.confirm}\n\nWithdraw / Widerrufen / Retirar:\n${mail.manage}\n\nEmail confirmation only. Publication follows moderation. / Nur E-Mail-Bestätigung, Veröffentlichung nach Moderation. / Solo confirma el correo; publicación tras moderación.\n\nThese links are private. / Links vertraulich behandeln. / Estos enlaces son privados.`;
  checkMailDispatch(dispatch);
  const request = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${binding.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `review-${id}`,
    },
    body: JSON.stringify({from: binding.from, to: [mail.to], subject: labels[mail.language], text}),
    signal: AbortSignal.timeout(MAIL_REQUEST_BUDGET_MS),
    redirect: "error" as const,
  };
  // Recheck after serialization and immediately before issuing transport.
  // Abort is best-effort cancellation, never evidence of provider rollback.
  checkMailDispatch(dispatch);
  const r = await transport("https://api.resend.com/emails", request);
  // All rejections (including shared daily/monthly exhaustion and 429) and
  // unknown outcomes stay queued under the EXISTING durable twelve-attempt cap.
  // Do not infer a quota reset from local calendar counters or send a new key.
  if (!r.ok) { await r.body?.cancel(); throw new Error("Mail provider rejected request"); }
  const reader = r.body?.getReader();
  if (!reader) throw new Error("Mail provider acceptance unconfirmed");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 4096) throw new Error("Mail provider acceptance unconfirmed");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const receipt = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!receipt || typeof receipt.id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(receipt.id))
    throw new Error("Mail provider acceptance unconfirmed");
  // Provider acceptance is NOT inbox delivery or author email verification.
}
